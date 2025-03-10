import React, { useState, useRef, useEffect } from 'react';
import { CWTable, Form4 as Form, Space } from '@chaoswise/ui'
import { observer } from '@chaoswise/cw-mobx';
import IdrSignoffStore from './store';
import { uniqBy, sortBy } from 'lodash';
import SignOffType from '../TestingSignoff/components/SignoffType';
import Artefact from '../TestingSignoff/components/Artefact';
import CaseId from './components/CaseId';
import { signoffUpdate, getSignOffListByWorkOrderId, submitIDRCseId, signoffInsertBatch, signoffDeleteBatch } from '../api';
import { SIGNOFF_GROUP } from '../constants';
import moment from 'moment';
import Button from '../components/TableButton'
import { formily } from '@chaoswise/ui/formily';
import { formatFormValues } from '@/pages/Reception/common/fieldUtils';
import { eventManager } from '@/utils/T/core/helper';
import { fieldValueChangeToValidateFields } from '../util';
const { useFormEffects, LifeCycleTypes } = formily;
const IDRSignoff = (props) => {

  const { formActions, schema, orderContainerID, initData, registerOnChildFormSubmit, registerOnFormValuesChange, registerOnOrderCreateSuccess } = props
  const orderInfo = initData
  const [tableLoading, setTableLoading] = useState(false);
  const [form] = Form.useForm();
  const { signoffTypeOptions, setSignoffTypeOptions, formData, updateState } = IdrSignoffStore;
  const crStatus = formData?.crStatus_value || orderInfo?.formData?.crStatus_value;
  const containerRef = useRef();
  const initedRef = useRef(false)
  let accountId = JSON.parse(localStorage.getItem('dosm_loginInfo'))?.user?.accountId || '110';
  let topAccountId = JSON.parse(localStorage.getItem('userConfig'))?.topAccountId || accountId;
  const caseId = Form.useWatch(['IDRSignoff', 0, 'caseId'], form)
  const editableStatus = ['', null, undefined, 'New', 'Reopen']
  const formDisabled = () => {
    if (orderInfo.createdBy) {
      let userInfo = localStorage.getItem('dosm_loginInfo')
      userInfo = JSON.parse(userInfo)
      if (userInfo.user.userId == orderInfo.createdBy) {
        return false
      } else {
        return true
      }
    } else {
      return false
    }
  };
  useFormEffects(($, _) => {
    // open状态以后，不再去同步表单和signoff的数据了 ---to do
    if (editableStatus.includes(crStatus) && !formDisabled()) {
      $(LifeCycleTypes.ON_FORM_VALUES_CHANGE).subscribe((formState) => {
        if(!formState.mounted) return
        const _values = formatFormValues(schema, formState.values)
        if (initedRef.current) {
          updateState({formData: _values})
          console.log('IDRSignoff-value-change');
          onFormValuesChange(_values)
        }
      });
    }
  });
  useEffect(() => {
    setSignoffTypeOptions([{ label: 'IDR Signoff', value: 'IDR Signoff' }])
    if (initData) {
      onFormMount(initData)
    }
  }, [])
  useEffect(() => {
    registerOnChildFormSubmit && registerOnChildFormSubmit(onFormSubmit)
    registerOnOrderCreateSuccess && registerOnOrderCreateSuccess(onOrderCreateSuccess)
  })

  const onFormSubmit = () => {
    return new Promise((resolve, reject) => {
      form.validateFields()
        .then(values => {
          resolve({ values });
        })
        .catch(errors => {
          let parentNodeId = containerRef?.current?.closest('.ant-tabs-tabpane')?.id;
          document.querySelector('.ant-form-item-explain-error') && document.querySelector('.ant-form-item-explain-error').scrollIntoView({ behavior: 'smooth' })
          const error = errors.errorFields.map(item => {
            return {
              name: item.name,
              messages: item.errors
            }
          })
          return reject({
            tabKey: parentNodeId?.split('.$')?.[1],
            [SIGNOFF_GROUP.IDR_SIGNOFF]: error
          })
        })
    });
  }
  const onOrderCreateSuccess = (workOrderId) => {
    if (!crStatus) {
      let tableData = form.getFieldValue('IDRSignoff') || []
      const params = tableData.map(item => {
        return {
          ...item,
          status: "WAITSEND",
          signOffUserGroup: "[]",
          signOffUser: "[]",
          artifact: JSON.stringify(item.artifact),
          signOffType: JSON.stringify(item.signOffType),
          signOffGroup: SIGNOFF_GROUP.IDR_SIGNOFF,
          topAccountId,
          accountId,
          caseId: Array.isArray(item.caseId) ? JSON.stringify(item.caseId) : item.caseId,
          workOrderId,
        }
      })
      if (params.length > 0) {
        signoffInsertBatch(params)
      }
    }
  }
  const onFormMount = (orderInfo) => {
    updateState({ orderInfo })
    if (orderInfo.formData?.crStatus && !initedRef.current) {
      getSignoffs(orderInfo.workOrderId).finally(() => {
        setTimeout(() => {
          // formActions.getFormState(formState => {
          //   const _values = formatFormValues(schema, formState.values)
          //   onFormValuesChange(_values)
          // })
          initedRef.current
        }, 0)
      })
    }
    if (!crStatus && !initedRef.current) {
      formActions.getFormState(formState => {
        const _values = formatFormValues(schema, formState.values)
        onFormValuesChange(_values)
      })
      initedRef.current = true
    }
  }
  const onFormValuesChange = (formValues) => {
    let tableData = form.getFieldValue('IDRSignoff') || []
    let _tableData = JSON.parse(JSON.stringify(tableData))
    let shouldAdd = false
    let shouldDel = false
    if (formValues?.IDRsignoff == "271f3a2d5dc04123b5d55c78e586e97b") {
      if (_tableData.length == 0) {
        const newRow = {
          signOffType: ["IDR Signoff"],
          artifact: undefined,
          caseId: undefined
        }
        _tableData.push(newRow)
        shouldAdd = true
      }
    } else {
      if (_tableData.length > 0) {
        shouldDel = true
        _tableData = []
      }
    }
    if (crStatus) {
      const rowData = form.getFieldValue('IDRSignoff')?.[0]
      if (shouldAdd) {
        signoffInsertBatch(_tableData.map(item => {
          return {
            ...item,
            signOffUserGroup: "[]",
            signOffUser: "[]",
            artifact: JSON.stringify(item.artifact || []),
            signOffType: JSON.stringify(item.signOffType),
            signOffGroup: SIGNOFF_GROUP.IDR_SIGNOFF,
            topAccountId,
            accountId,
            workOrderId: orderInfo.workOrderId,
            caseId: Array.isArray(item.caseId) ? JSON.stringify(item.caseId) : item.caseId
          }
        })).then(() => {
          getSignoffs()
        })
      }
      if (shouldDel) {
        signoffDeleteBatch([rowData.id]).then(res => {
          getSignoffs()
        })
      }
    } else {
      form.setFieldValue('IDRSignoff', _tableData)
    }
  }

  // Get signoffs for the current work order
  const getSignoffs = (workOrderId) => {
    const orderId = orderInfo.workOrderId || workOrderId
    if (!orderId) {
      return new Promise((resolve, reject) => { resolve('') })
    }
    setTableLoading(true)
    return getSignOffListByWorkOrderId({ workOrderId: orderId, signOffGroup: SIGNOFF_GROUP.IDR_SIGNOFF, })
      .then(res => {
        let data = res?.data?.map(item => ({
          ...item,
          signOffUserGroup: JSON.parse(item.signOffUserGroup),
          signOffUser: JSON.parse(item.signOffUser),
          artifact: JSON.parse(item.artifact),
          signOffType: JSON.parse(item.signOffType),
          caseId: JSON.parse(item.caseId),
        }));

        const IDRSignoffData = data?.filter(i => i.signOffGroup === SIGNOFF_GROUP.IDR_SIGNOFF,);
        form.setFieldValue('IDRSignoff', sortBy(IDRSignoffData, 'id'));
        setTableLoading(false);
      })
      .catch(err => {
        setTableLoading(false);
        console.error(err);
      });
  };

  const onValuesChange = (index, key, val) => {
    const tableData = form.getFieldValue('IDRSignoff')
    const rowData = tableData[index]
    if (crStatus) {
      signoffUpdate({
        ...rowData,
        signOffUserGroup: "[]",
        signOffUser: "[]",
        artifact: JSON.stringify(rowData.artifact),
        signOffType: JSON.stringify(rowData.signOffType),
        caseId: JSON.stringify(rowData.caseId),
        status: "APPROVED"
      }).then(res => {
        getSignoffs()
      })
    }
  }

  const submitCaseId = () => {
    let tableData = form.getFieldValue('IDRSignoff')
    const caseId = tableData[0].caseId
    return submitIDRCseId({ caseId: Array.isArray(caseId) ? caseId.map(item => item.caseId) : caseId }).then(res => {
      console.log('res', res)
      const caseids = Array.isArray(caseId) ? caseId.map(i => i.caseId) : caseId.split(',')
      const caseidsWithStatus = caseids.map(id => {
        const caseItem = res?.data?.find?.(item => item.CASEID === id)
        if (caseItem) {
          // COMPLETIONDSTE is empty, show: Not Approved
          if (!caseItem.COMPLETIONDATE) {
            return {
              caseId: id,
              status: 'FAILD',
              showStatus: 'Not Approved'
            }
          } else {
            const currentDate = moment()
            const COMPLETIONDATE = moment(caseItem.COMPLETIONDATE)
            const monthsDiff = currentDate.diff(COMPLETIONDATE, 'months');
            if (monthsDiff > 6) {
              return {
                caseId: id,
                status: 'FAILD',
                showStatus: 'Signoff Exceed 6 Months'
              }
            } else {
              return {
                caseId: id,
                status: 'VALID',
                showStatus: 'Signoff Valid'
              }
            }
          }
        } else {
          return {
            caseId: id,
            status: 'FAILD',
            showStatus: 'Signoff not Found'
          }
        }
      })
      tableData[0].caseId = caseidsWithStatus
      form.setFieldValue('IDRSignoff', tableData)
      form.validateFields([['IDRSignoff', 0, 'caseId']], { force: true })
      if (crStatus) {
        onValuesChange(0)
      }
    })
  }
  return (
    <div ref={containerRef}>
      <Form form={form} name="signoff" onValuesChange={() => {fieldValueChangeToValidateFields(form, containerRef, SIGNOFF_GROUP.IDR_SIGNOFF)}}>
        <Form.List name="IDRSignoff">
          {(fields, { add, remove }) => (
            <>
              <CWTable
                loading={tableLoading}
                dataSource={fields?.map((i) => ({ ...i, remove, form, signoffTypeOptions: signoffTypeOptions, onValuesChange, formData }))}
                pagination={false}
                rowKey="key"
                columns={[
                  {
                    title: <span><span style={{ color: '#f5222d' }}>*</span>Signoff Type</span>,
                    key: 'signOffType',
                    width: '200px',
                    render: (_, row) => (
                      <Form.Item
                        name={[row.name, 'signOffType']}
                        rules={[{ required: true, message: 'Please select Signoff Type' }]}
                      >
                        <SignOffType row={row} disabled={true} signoffTypeOptions={signoffTypeOptions} />
                      </Form.Item>
                    )
                  },
                  {
                    title: <span><span style={{ color: '#f5222d' }}>*</span>Artefact</span>,
                    key: 'artifact',
                    width: '200px',
                    render: (_, row) => (
                      <Form.Item
                        name={[row.name, 'artifact']}
                        rules={[{ required: true, message: 'Please upload artefact' }]}
                      >
                        <Artefact disabled={formDisabled()} row={row} />
                      </Form.Item>
                    )
                  },
                  {
                    title: <span><span style={{ color: '#f5222d' }}>*</span>Case ID</span>,
                    key: 'caseId',
                    width: '300px',
                    render: (_, row) => {
                      return <Form.Item
                        name={[row.name, 'caseId']}
                        validateFirst={true}
                        rules={[
                          { required: true, message: 'Please Enter Case ID' },
                          {
                            validator: (rule, value, callback) => {
                              console.log('value', value);

                              if (Array.isArray(value)) {
                                return callback()
                              } else {
                                return callback('Please submit the IDR Signoff first.')
                              }
                            }
                          }
                        ]}
                      >
                        <CaseId disabled={formDisabled()} row={row} />
                      </Form.Item>
                    }
                  },
                  {
                    title: "Actions",
                    key: 'actions',
                    width: '100px',
                    render: (_, row) => {
                      const tableData = form.getFieldValue('IDRSignoff');
                      const rowData = tableData[row.name] || {}
                      if (Array.isArray(rowData.caseId)) {
                        return <Button type="primary" onClick={submitCaseId}>
                          Refresh
                        </Button>
                      }
                      return (
                        <Space>
                          <Button type="primary" onClick={submitCaseId} disabled={!rowData.caseId}>
                            Submit
                          </Button>
                        </Space>
                      );
                    }
                  }
                ]}
              />
            </>
          )}
        </Form.List>
      </Form>
      <style jsx>{`
       :global(.ant-form-item-with-help){
          margin-bottom: 20px;
       }
      `}</style>
    </div>
  );
};

export default observer(IDRSignoff);
