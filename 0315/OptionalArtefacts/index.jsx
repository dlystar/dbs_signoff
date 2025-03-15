import React, { useState, useRef, useEffect } from 'react';
import { CWTable, Form4 as Form, Button } from '@chaoswise/ui'
import { observer } from '@chaoswise/cw-mobx';
import optionalArtefactsStore from './store';
import { uniqBy, sortBy } from 'lodash';
import SignOffType from '../TestingSignoff/components/SignoffType';
import Artefact from '../TestingSignoff/components/Artefact';
import { signoffUpdate, getSignOffListByWorkOrderId, signoffInsertBatch, signoffDeleteBatch } from '../api';
import { SIGNOFF_GROUP } from '../constants';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { fieldValueChangeToValidateFields } from '../util';
const OptionalArtefacts = (props) => {

  const { initData, registerOnChildFormSubmit, registerOnFormValuesChange, registerOnOrderCreateSuccess } = props
  const orderInfo = initData
  const [tableLoading, setTableLoading] = useState(false);
  const [form] = Form.useForm();
  const { signoffTypeOptions, setSignoffTypeOptions, formData, updateState } = optionalArtefactsStore;
  const crStatus = orderInfo?.formData?.crStatus_value;
  const containerRef = useRef();
  const initedRef = useRef(false)
  let accountId = JSON.parse(localStorage.getItem('dosm_loginInfo'))?.user?.accountId || '110';
  let topAccountId = JSON.parse(localStorage.getItem('userConfig'))?.topAccountId || accountId;

  useEffect(() => {
    if (initData) {
      onFormMount(initData)
    }
  }, [])

  useEffect(() => {
    registerOnChildFormSubmit && registerOnChildFormSubmit(onFormSubmit)
    registerOnFormValuesChange && registerOnFormValuesChange(onFormValuesChange)
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
          const error = errors?.errorFields?.map(item => {
            return {
              name: item.name,
              messages: item.errors
            }
          })
          return reject({
            tabKey: parentNodeId?.split('.$')?.[1],
            [SIGNOFF_GROUP.OPTIONAL_ARTEFACTS]: error
          })
        })
    });
  }
  const onOrderCreateSuccess = (workOrderId) => {
    // 在crStataus为new状态下，去插入数据
    if (!crStatus) {
      const tableData = form.getFieldValue('optionalArtefacts') || []
      const params = tableData.map(item => {
        return {
          ...item,
          status: 'APPROVED',
          signOffUserGroup: "[]",
          signOffUser: "[]",
          artifact: JSON.stringify(item.artifact),
          signOffType: JSON.stringify(item.signOffType),
          signOffGroup: SIGNOFF_GROUP.OPTIONAL_ARTEFACTS,
          topAccountId,
          accountId,
          workOrderId
        }
      })
      if (params.length > 0) {
        signoffInsertBatch(params)
      }
    }
  }
  const onFormMount = (orderInfo) => {
    console.log('form initaled', orderInfo);
    updateState({ orderInfo })
    if (orderInfo.formData?.crStatus && !initedRef.current) {
      getSignoffs(orderInfo.formData || {}, orderInfo.workOrderId)
      initedRef.current = true
    }
  }
  const onFormValuesChange = (formValues) => {
    console.log('Field changed', formValues);
    updateState({ formData: formValues });
  }

  const handleMessage = (event) => {
    const { data } = event;
    switch (data.eventType) {
      case 'onFormMount':
        onFormMount(data.orderInfo)
        break;
      case 'onFormValuesChange':
        onFormValuesChange(data.values)
        break;
      // 表单提交成功
      case 'onOrderCreateSuccess':
        onOrderCreateSuccess(data.orderId)
        break;
      default:
        // console.log('Unhandled event type:', data.eventType);
        break;
    }
  };

  // Get signoffs for the current work order
  const getSignoffs = (formData, workOrderId) => {
    setTableLoading(true);
    const orderId = orderInfo.workOrderId || workOrderId
    const status = crStatus || formData?.crStatus_value
    getSignOffListByWorkOrderId({ workOrderId: orderId, signOffGroup: SIGNOFF_GROUP.OPTIONAL_ARTEFACTS, })
      .then(res => {
        let data = res?.data?.map(item => ({
          ...item,
          signOffUserGroup: JSON.parse(item.signOffUserGroup),
          signOffUser: JSON.parse(item.signOffUser),
          artifact: JSON.parse(item.artifact),
          signOffType: JSON.parse(item.signOffType),
        }));

        const otherSignoffData = data?.filter(i => i.signOffGroup === SIGNOFF_GROUP.OPTIONAL_ARTEFACTS,);
        form.setFieldValue('optionalArtefacts', sortBy(otherSignoffData, 'id'));

        let typeOptions = [];
        otherSignoffData.forEach(i => {
          typeOptions = typeOptions.concat(i.signOffType || []);
        });
        setTableLoading(false);
      })
      .catch(err => {
        setTableLoading(false);
        console.error(err);
      });
  };

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

  const showAdd = () => {
    const status = ['', null, undefined, 'New', 'Reopen', 'Open']
    let userInfo = localStorage.getItem('dosm_loginInfo')
    userInfo = JSON.parse(userInfo)
    const currentUser = userInfo.user.userId
    if (!crStatus) {
      return true
    }
    return (status.includes(crStatus) && currentUser == orderInfo.createdBy)
  }
  const addRecord = () => {
    const tableData = form.getFieldValue('optionalArtefacts') || []
    console.log('crStatus', crStatus);
    if (!crStatus) {
      const rowData = {
        signOffUserGroup: undefined,
        signOffUser: undefined,
        artifact: [],
        signOffType: [],
        signOffGroup: SIGNOFF_GROUP.OPTIONAL_ARTEFACTS,
        topAccountId,
        accountId,
        status: 'APPROVED',
      }
      tableData.push(rowData)
      form.setFieldValue('optionalArtefacts', tableData)
    } else {
      const rowData = {
        signOffUserGroup: "[]",
        signOffUser: "[]",
        artifact: "[]",
        signOffType: "[]",
        signOffGroup: SIGNOFF_GROUP.OPTIONAL_ARTEFACTS,
        topAccountId,
        accountId,
        status: 'APPROVED',
      }
      signoffInsertBatch([{ ...rowData, workOrderId: orderInfo.workOrderId }]).then(res => {
        getSignoffs()
      }).catch(() => {
        getSignoffs()
      })
    }
  }
  const removeRecord = (row) => {
    if (!crStatus) {
      row.remove(row.name)
    } else {
      const tableData = form.getFieldValue('optionalArtefacts') || []
      const deleteRow = tableData[Number(row.name)]
      return signoffDeleteBatch([deleteRow.id], orderInfo.workOrderId).then(res => {
        getSignoffs()
      }).catch(err => {
        getSignoffs()
      })
    }
  }
  const onValuesChange = (index, key, val) => {
    console.log('更新值啦   -', key, val);
    // 工单创建以后，实时更新
    const tableData = form.getFieldValue('optionalArtefacts')
    const rowData = tableData[index]
    if (crStatus) {
      signoffUpdate({
        ...rowData,
        signOffUserGroup: JSON.stringify(rowData.signOffUserGroup),
        signOffUser: JSON.stringify(rowData.signOffUser),
        artifact: JSON.stringify(rowData.artifact),
        signOffType: JSON.stringify(rowData.signOffType),
      }).then(res => {
        getSignoffs()
      }).catch(() => {
        getSignoffs()
      })
    }
  }

  // Form and window message effects
  useEffect(() => {
    const { signoffTypes } = window.DOSM_CUSTOM_DBS.signoff.optionalArtefacts
    setSignoffTypeOptions(signoffTypes.map(i => ({ label: i, value: i })))
    window.parent.postMessage({
      eventType: 'onChildFormInit',
      height: containerRef.current.clientHeight
    }, '*');

    window.formActions = {
      submit: onFormSubmit,
      getFieldsValue: () => {
        return Promise.resolve({
          values: form.getFieldsValue()
        });
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [orderInfo, signoffTypeOptions, crStatus]);
  return (
    <div ref={containerRef}>
      <Form form={form} name="signoff" onValuesChange={() => {fieldValueChangeToValidateFields(form, containerRef, SIGNOFF_GROUP.OPTIONAL_ARTEFACTS)}}>
        <Form.List name="optionalArtefacts">
          {(fields, { add, remove }) => (
            <>
              <CWTable
                loading={tableLoading}
                dataSource={fields?.map((i) => ({ ...i, remove, form, signoffTypeOptions: signoffTypeOptions, onValuesChange }))}
                pagination={false}
                rowKey="key"
                columns={[
                  {
                    title: <span><span style={{ color: '#f5222d' }}></span>Signoff Type</span>,
                    key: 'signOffType',
                    width: '200px',
                    render: (_, row) => {
                      const status = ['', null, undefined, 'New', 'Reopen', 'Open']
                      const disabled = !status.includes(crStatus)
                      return <Form.Item
                        name={[row.name, 'signOffType']}
                        // rules={[{ required: true, message: 'Please select Signoff Type' }]}
                      >
                        <SignOffType row={row} disabled={formDisabled() || disabled} signoffTypeOptions={signoffTypeOptions} />
                      </Form.Item>
                    }
                  },
                  {
                    title: <span><span style={{ color: '#f5222d' }}></span>Artefact</span>,
                    key: 'artifact',
                    width: '200px',
                    render: (_, row) => {
                      const status = ['', null, undefined, 'New', 'Reopen', 'Open']
                      const disabled = !status.includes(crStatus)
                      return <Form.Item
                        name={[row.name, 'artifact']}
                      >
                        <Artefact disabled={formDisabled() || disabled} row={row} />
                      </Form.Item>
                    }
                  },
                  {
                    title: "Actions",
                    key: 'actions',
                    index: 'actions',
                    width: '200px',
                    fixed: 'right',
                    render(text, row) {
                      return <div>
                        {
                          showAdd() &&
                          <Button style={{ border: 'none', background: 'transparent' }} onClick={() => {
                            removeRecord(row)
                          }}><DeleteOutlined /></Button>
                        }
                      </div>
                    }
                  }
                ]}
              />
            </>
          )}
        </Form.List>
        {
          showAdd() &&
          <Button type="link" size="small" onClick={addRecord}><PlusOutlined />Add</Button>
        }
      </Form>
    </div>
  );
};

export default observer(OptionalArtefacts);