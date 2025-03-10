import React, { useState, useRef, useEffect } from 'react';
import { CWTable, Form4 as Form, Space, Modal, Checkbox, Input } from '@chaoswise/ui'
import { observer } from '@chaoswise/cw-mobx';
import otherSignoffStore from './store';
import { uniqBy, sortBy } from 'lodash';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import Status from '../TestingSignoff/components/Status';
import SignOffType from '../TestingSignoff/components/SignoffType';
import RejectionReason from '../TestingSignoff/components/RejectionReason';
import SignOffUserGroup from '../components/Group'
import SignOffUser from '../TestingSignoff/components/User';
import Artefact from '../TestingSignoff/components/Artefact';
import {
  signoffInsertBatch,
  signoffUpdate,
  signoffApproved,
  signoffRejected,
  signoffSendEmail,
  getSignOffById,
  getSignOffListByWorkOrderId,
  signoffStatus,
  signoffDeleteBatch
} from '../api';
import { SIGNOFF_GROUP } from '../constants';
import { helper } from '@/utils/T';
import Button from '../components/TableButton'
import { formily } from '@chaoswise/ui/formily';
import { formatFormValues } from '@/pages/Reception/common/fieldUtils';
import { eventManager } from '@/utils/T/core/helper';
import { fieldValueChangeToValidateFields } from '../util';
const { useFormEffects, LifeCycleTypes } = formily;
const OtherSignoff = (props) => {

  const { formActions, schema, orderContainerID, initData, registerOnChildFormSubmit, registerOnFormValuesChange, registerOnOrderCreateSuccess } = props
  const orderInfo = initData
  const [tableLoading, setTableLoading] = useState(false);
  const [form] = Form.useForm();
  const { signoffTypeOptions, setSignoffTypeOptions, formData, updateState } = otherSignoffStore;
  const crStatus = formData?.crStatus_value || orderInfo?.formData?.crStatus_value;
  const containerRef = useRef();
  const initedRef = useRef(false)
  let accountId = JSON.parse(localStorage.getItem('dosm_loginInfo'))?.user?.accountId || '110';
  let topAccountId = JSON.parse(localStorage.getItem('userConfig'))?.topAccountId || accountId;
  const editableStatus = ['', null, undefined, 'New', 'Reopen']
  const formDataRef = useRef({})
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
        const tableData = form.getFieldValue('otherSignoff')
        if (initedRef.current) {
          updateState({formData: _values})
          console.log('otherSignoff-value-change');
          fieldChange(_values, tableData)
        }
      });
    }
  });
  useEffect(() => {
    if (initData) {
      onFormMount(initData)
    }
  }, [])

  useEffect(() => {
    registerOnChildFormSubmit && registerOnChildFormSubmit(onFormSubmit)
    registerOnOrderCreateSuccess && registerOnOrderCreateSuccess(onOrderCreateSuccess)
  })

  // Form changes will reset signoff approval status
  const shouldResetSignoff = (index, key, val) => {
    const tableData = form.getFieldValue('otherSignoff')
    const rowData = tableData[index]
    // When crStatus is new, changing user field
    // When crStatus is new, changing artefact field
    if (crStatus && rowData.status != 'WAITSEND') {
      if (key === 'signOffUser' && val) {
        return true
      }
      if (key === 'artifact' && val) {
        return true
      }
      if (key === 'signOffUserGroup' && val) {
        return true
      }
    }
    return false
  }
  const arrayIsEqual = (arr1, arr2) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    return JSON.stringify(arr1) === JSON.stringify(arr2);
  };
  const includes = function () {
    const arr = arguments[0]
    if (!arr) return false
    let has = false
    for (let i = 1; i < arguments.length; i++) {
      if (arr.includes(arguments[i])) has = true
    }
    return has
  }
  const tableHasFormData = (key, value, tableData) => {
    return tableData.some(item => arrayIsEqual(item[key], [value]));
  };

  const newRow = (signoffTypeValue) => {
    return {
      signOffType: [signoffTypeValue],
      signOffUser: undefined,
      artifact: undefined,
      status: 'WAITSEND',
      group: undefined,
      rejectionReason: undefined
    };
  };

  const fieldChange = helper.debounce((formData, _tableData, _orderInfo, onlyUpdateOptions) => {
    // const flatSchame = getFlatSchema(orderInfo?.schema || _orderInfo?.schema);
    const _signoffTypeOptions = JSON.parse(JSON.stringify(signoffTypeOptions));
    let tableData = JSON.parse(JSON.stringify(_tableData || []));
    const { signoffTypes } = window.DOSM_CUSTOM_DBS.signoff.otherSignoff
    let newRows = []
    let deleteRows = []
    signoffTypes.forEach(signoffType => {
      const name = signoffType.formKey;
      let _value = name + '_value'
      if (name) {
        let conditionTrue = formData[name] && signoffType.conditionValue.includes(formData[name]) && !tableHasFormData('signOffType', signoffType.signoffType, tableData)
        let conditionFalse = !signoffType.conditionValue.includes(formData[name]) && tableHasFormData('signOffType', signoffType.signoffType, tableData)
        if (signoffType.signoffType == 'IDR Signoff') {
          conditionTrue = formData['lob_value'] == 'CES' && conditionTrue
          conditionFalse = formData['lob_value'] != 'CES' || conditionFalse
        }
        // Add signoff type if condition is met and type doesn't exist
        if (conditionTrue) {
          tableData.push(newRow(signoffType.signoffType));
          newRows.push(newRow(signoffType.signoffType))
          _signoffTypeOptions.push({ label: signoffType.signoffType, value: signoffType.signoffType });
          console.log(`otherSignoff-${signoffType.signoffType} 条件满足 新值:${formData[_value]} 旧值:${formDataRef.current[_value]}`);
        }
        // Remove signoff type if condition is not met but type exists
        if (conditionFalse) {
          const index = tableData.findIndex(item => arrayIsEqual(item.signOffType, [signoffType.signoffType]));
          if (index > -1) {
            let deleteRow = tableData.splice(index, 1)
            deleteRows = deleteRows.concat(deleteRow.filter(i => i.id))
            console.log(`otherSignoff-${signoffType.signoffType} 条件不满足 新值:${formData[_value]} 旧值:${formDataRef.current[_value]}`);
          }
          const _index = _signoffTypeOptions.findIndex(i => i.value === signoffType.signoffType);
          if (_index > -1) _signoffTypeOptions.splice(_index, 1);
        }
      }
    });
    // Update options first, then form values
    if (!onlyUpdateOptions) {
      if (!arrayIsEqual(_tableData, tableData)) {
        if (formData.crStatus || crStatus) {
          if (deleteRows.length > 0) {
            signoffDeleteBatch(deleteRows.map(item => item.id)).then(res => {
              getSignoffs()
            })
          }
          if (newRows.length > 0) {
            signoffInsertBatch(newRows.map(item => {
              return {
                ...item,
                signOffUserGroup: JSON.stringify(item.signOffUserGroup),
                signOffUser: JSON.stringify(item.signOffUser),
                artifact: JSON.stringify(item.artifact),
                signOffType: JSON.stringify(item.signOffType),
                signOffGroup: SIGNOFF_GROUP.OTHER_SIGNOFFS,
                topAccountId,
                accountId,
                workOrderId: orderInfo.workOrderId
              }
            })).then(() => {
              getSignoffs()
            })
          }
        } else {
          setTimeout(() => {
            form.setFieldValue('otherSignoff', tableData);
          }, 100);
        }
      }
    }
    formDataRef.current = formData
  }, 300);

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
            [SIGNOFF_GROUP.OTHER_SIGNOFFS]: error
          })
        })
    });
  }
  const onOrderCreateSuccess = (workOrderId) => {
    // When crStatus is new, insert data
    if (!crStatus) {
      const tableData = form.getFieldValue('otherSignoff') || []
      const params = tableData.map(item => {
        return {
          ...item,
          signOffUserGroup: JSON.stringify(item.signOffUserGroup),
          signOffUser: JSON.stringify(item.signOffUser),
          artifact: JSON.stringify(item.artifact),
          signOffType: JSON.stringify(item.signOffType),
          signOffGroup: SIGNOFF_GROUP.OTHER_SIGNOFFS,
          topAccountId,
          accountId,
          workOrderId: workOrderId
        }
      })
      if (params) {
        signoffInsertBatch(params)
      }
    }
  }

  const onFormMount = (orderInfo) => {
    updateState({ orderInfo })
    if (orderInfo.formData?.crStatus && !initedRef.current) {
      getSignoffs(orderInfo.workOrderId).finally(() => {
        setTimeout(() => {
          // const tableData = form.getFieldValue('otherSignoff')
          // formActions.getFormState(formState => {
          //   const _values = formatFormValues(schema, formState.values)
          //   fieldChange(_values, tableData, orderInfo)
          // })
          initedRef.current = true
        }, 0)
      })
    }
    if (!crStatus && !initedRef.current) {
      const tableData = form.getFieldValue('otherSignoff')
      formActions.getFormState(formState => {
        const _values = formatFormValues(schema, formState.values)
        fieldChange(_values, tableData, orderInfo)
      })
      initedRef.current = true
    }
  }
  const onFormValuesChange = (formValues) => {
    const otherSignoff = form.getFieldValue('otherSignoff') || [];
    fieldChange(formValues, otherSignoff);
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
      // Form submission success
      case 'onOrderCreateSuccess':
        onOrderCreateSuccess(data.orderId)
        break;
      default:
        console.log('Unhandled event type:', data.eventType);
        break;
    }
  };

  // Get signoffs for the current work order
  const getSignoffs = (workOrderId) => {
    const orderId = orderInfo.workOrderId || workOrderId
    if (!orderId) {
      return new Promise((resolve, reject) => { resolve('') })
    }
    setTableLoading(true)
    return getSignOffListByWorkOrderId({ workOrderId: orderId, signOffGroup: SIGNOFF_GROUP.OTHER_SIGNOFFS, })
      .then(res => {
        let data = res?.data?.map(item => ({
          ...item,
          signOffUserGroup: JSON.parse(item.signOffUserGroup),
          signOffUser: JSON.parse(item.signOffUser),
          artifact: JSON.parse(item.artifact),
          signOffType: JSON.parse(item.signOffType),
        }));

        const otherSignoffData = data?.filter(i => i.signOffGroup === SIGNOFF_GROUP.OTHER_SIGNOFFS);
        form.setFieldValue('otherSignoff', sortBy(otherSignoffData, 'id'));
        setTableLoading(false);
      })
      .catch(err => {
        setTableLoading(false);
        console.error(err);
      });
  };

  const approval = (rowNum) => {
    const tableData = form.getFieldValue('otherSignoff');
    const rowData = tableData[rowNum];
    return signoffApproved({ signOffId: rowData.id }).then(res => {
      window.prompt.success('Approved');
      getSignoffs();
    }).catch(err => {
      window.prompt.error(err.msg)
    })
  };

  const reject = (rowNum) => {
    const tableData = form.getFieldValue('otherSignoff');
    const rowData = tableData[rowNum];
    let rejectionReason = ''
    const onChange = (e) => {
      rejectionReason = e.target.value
    }
    Modal.confirm({
      title: 'Rejection Reason',
      icon: null,
      content: <div><Input.TextArea onChange={onChange} /></div>,
      getContainer() {
        const { inIframe } = window.DOSM_CUSTOM_DBS.signoff
        if (inIframe) {
          return window.parent?.document?.body
        } else {
          return document.body
        }
      },
      onOk() {
        return signoffRejected({ signOffId: rowData.id, rejectionReason: rejectionReason }).then(res => {
          window.prompt.success('Rejected')
          getSignoffs()
        }).catch(err => {
          window.prompt.error(err.msg)
        })
      },
    })
  };

  const sendEmail = (rowNum) => {
    const tableData = form.getFieldValue('otherSignoff');
    const rowData = tableData[rowNum];
    let clickable = false
    const onChange = (e) => {
      clickable = e.target.checked
      if (e.target.checked) {
        window.parent.sendEmail_button.removeAttribute('disabled')
      } else {
        window.parent.sendEmail_button.setAttribute('disabled', true)
      }
    }
    setTimeout(() => {
      window.parent.sendEmail_button.setAttribute('disabled', true)
    }, 60)
    const noArtifact = !rowData?.artifact || rowData?.artifact?.length == 0
    if (noArtifact) {
      return signoffSendEmail({ signOffId: rowData.id }).then(res => {
        window.prompt.success('Successfully send')
        getSignoffs()
      }).catch(err => {
        window.prompt.error(err.msg)
      })
    }
    Modal.confirm({
      title: 'Declaration',
      content: <span><Checkbox onChange={onChange} style={{ marginRight: 10 }} />I am fully responsible & accountable for all the artefacts uploaded and attest that it does not contain any customer, sensitive, or PII data.</span>,
      okButtonProps: { id: 'sendEmail_button' },
      getContainer() {
        const { inIframe } = window.DOSM_CUSTOM_DBS.signoff
        if (inIframe) {
          return window.parent?.document?.body
        } else {
          return document.body
        }
      },
      onOk() {
        return signoffSendEmail({ signOffId: rowData.id }).then(res => {
          console.log('res', res);
          window.prompt.success('Successfully send')
          getSignoffs()
        }).catch(err => {
          console.log('err', err);
          window.prompt.error(err.msg)
        })
      },
    })
  };

  const onValuesChange = (index, key, val) => {
    console.log('Updating value -', key, val);
    // Update in real-time after the work order is created
    const tableData = form.getFieldValue('otherSignoff')
    const rowData = tableData[index]
    if (crStatus) {
      signoffUpdate({
        ...rowData,
        signOffUserGroup: JSON.stringify(rowData.signOffUserGroup),
        signOffUser: JSON.stringify(rowData.signOffUser) || "[]",
        artifact: JSON.stringify(rowData.artifact),
        signOffType: JSON.stringify(rowData.signOffType),
      }).then(res => {
        let signOffType = rowData?.signOffType?.[0]
        if (crStatus && key === 'artifact' && ['Technical Live Verification (LV) Signoff', 'Business Live Verification (LV) Signoff', 'DCON Signoff', 'Implementation Checker Signoff'].includes(signOffType)) {
          signoffStatus({ signOffId: rowData.id, status: 'APPROVED' }).then(res => {
            getSignoffs()
          }).catch(err => {
            window.prompt.error(err.msg)
          })
        } else {
          // If the field value changes and involves resetting the signoff task, reset the signoff task
          if (shouldResetSignoff(index, key, val)) {
            signoffStatus({ signOffId: rowData.id, status: 'WAITSEND' }).then(res => {
              getSignoffs()
            }).catch(err => {
              window.prompt.error(err.msg)
            })
          } else {
            getSignoffs()
          }
        }
      })
    }else{
      let signOffType = rowData?.signOffType?.[0]
      if (key == 'artifact' && ['DCON Signoff'].includes(signOffType)) {
        let _tableData = JSON.parse(JSON.stringify(tableData))
        _tableData[index].status = 'APPROVED'
        form.setFieldValue('otherSignoff', _tableData)
      }
    }
  }

  // Form and window message effects
  useEffect(() => {
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

  useEffect(() => {
    setSignoffTypeOptions([
      {
        "label": "ISS Signoff",
        "value": "ISS Signoff"
      },
      {
        "label": "Code Checker Signoff",
        "value": "Code Checker Signoff"
      },
      {
        "label": "DR team Signoff",
        "value": "DR team Signoff"
      },
      {
        "label": "Storage team Signoff",
        "value": "Storage team Signoff"
      },
      {
        "label": "DCON Signoff",
        "value": "DCON Signoff"
      },
      {
        "label": "Implementation Checker Signoff",
        "value": "Implementation Checker Signoff",
      },
      {
        "label": "Technical Live Verification (LV) Signoff",
        "value": "Technical Live Verification (LV) Signoff",
      },
      {
        "label": "Business Live Verification (LV) Signoff",
        "value": "Business Live Verification (LV) Signoff",
      },
      {
        label: 'IDR Signoff',
        value: 'IDR Signoff'
      }
    ])
  }, [])
  return (
    <div ref={containerRef}>
      <Form form={form} name="signoff" onValuesChange={() => {fieldValueChangeToValidateFields(form, containerRef, SIGNOFF_GROUP.OTHER_SIGNOFFS)}}>
        <Form.List name="otherSignoff">
          {(fields, { add, remove }) => (
            <>
              <CWTable
                loading={tableLoading}
                dataSource={fields?.map((i) => ({ ...i, remove, form, signoffTypeOptions: signoffTypeOptions, onValuesChange, formData }))}
                pagination={false}
                rowKey="key"
                scroll={{ x: 1200 }}
                columns={[
                  {
                    title: 'Status',
                    key: 'status',
                    width: '120px',
                    render: (_, row) => {
                      const tableData = form.getFieldValue('otherSignoff');
                      const rowData = tableData[row.name] || {}
                      if (includes(rowData.signOffType, 'DCON Signoff', 'Technical Live Verification (LV) Signoff', 'Business Live Verification (LV) Signoff', 'Implementation Checker Signoff')) return null
                      return <Form.Item name={[row.name, 'status']}>
                        <Status />
                      </Form.Item>
                    }
                  },
                  {
                    title: <span><span style={{ color: '#f5222d' }}>*</span>Signoff Type</span>,
                    key: 'signOffType',
                    width: '200px',
                    render: (_, row) => {
                      return <Form.Item
                        name={[row.name, 'signOffType']}
                        rules={[{ required: true, message: 'Please select Signoff Type' }]}
                      >
                        <SignOffType row={row} disabled={true} signoffTypeOptions={signoffTypeOptions} />
                      </Form.Item>
                    }
                  },
                  {
                    title: <span><span style={{ color: '#f5222d' }}>*</span>Group</span>,
                    key: 'Group',
                    width: '200px',
                    render: (_, row) => {
                      const tableData = form.getFieldValue('otherSignoff');
                      const rowData = tableData[row.name] || {}
                      const types = ['IDR Signoff', 'Code Checker Signoff']
                      const status = ['', null, undefined, 'New', 'Reopen']
                      let disabled = true
                      if (types.includes(rowData.signOffType?.[0])) {
                        disabled = !status.includes(crStatus) || false
                      }
                      if (includes(rowData.signOffType, 'DCON Signoff', 'Technical Live Verification (LV) Signoff', 'Business Live Verification (LV) Signoff', 'Implementation Checker Signoff')) return null
                      return <Form.Item
                        name={[row.name, 'signOffUserGroup']}
                        rules={[{ required: true, message: 'Please select Group' }]}
                      >
                        <SignOffUserGroup type="otherSignoff" row={row} disabled={formDisabled() || disabled} />
                      </Form.Item>
                    }
                  },
                  {
                    title: <span><span style={{ color: '#f5222d' }}>*</span>Signer</span>,
                    key: 'User',
                    width: '200px',
                    render: (_, row) => {
                      const tableData = form.getFieldValue('otherSignoff');
                      const rowData = tableData[row.name] || {}
                      const types = ['ISS Signoff', 'DR team Signoff', 'Storage team Signoff', 'IDR Signoff']
                      const status = ['', null, undefined, 'New', 'Reopen']
                      let disabled = !status.includes(crStatus)
                      if (crStatus == 'Open' && types.includes(rowData.signOffType?.[0])) {
                        disabled = false
                      }
                      if (includes(rowData.signOffType, 'DCON Signoff', 'Technical Live Verification (LV) Signoff', 'Business Live Verification (LV) Signoff', 'Implementation Checker Signoff')) return null
                      return <Form.Item
                        name={[row.name, 'signOffUser']}
                        rules={[{ required: true, message: 'Please select User' }]}
                      >
                        <SignOffUser row={row} disabled={formDisabled() || disabled} />
                      </Form.Item>
                    }
                  },
                  {
                    title: () => {
                      const tableData = form.getFieldValue('otherSignoff') || []
                      let allrules = []
                      let requiredSign = ''
                      if (tableData.length > 0) {
                        let needRules = true
                        tableData.forEach(rowData => {
                          const needArtefactSignoffs = ['DCON Signoff', 'Code Checker Signoff']
                          if (!needArtefactSignoffs.includes(rowData.signOffType?.[0])) {
                            needRules = false
                          }
                          if (includes(rowData.signOffType, 'DCON Signoff', 'Technical Live Verification (LV) Signoff', 'Business Live Verification (LV) Signoff', 'Implementation Checker Signoff') && ['New', 'Reopen', 'Approved'].includes(crStatus)) {
                            if (crStatus == 'Approved') {
                              needRules = true
                            }
                          }
                          if (needRules) {
                            allrules.push(needRules)
                          }
                        })
                        if (allrules.length == tableData.length) {
                          requiredSign = '*'
                        }
                      }
                      return <span><span style={{ color: '#f5222d' }}>{requiredSign}</span>Artefact</span>
                    },
                    key: 'artifact',
                    width: '200px',
                    render: (_, row) => {
                      const tableData = form.getFieldValue('otherSignoff');
                      const rowData = tableData[row.name] || {}
                      let disabled = !['New', 'Reopen', undefined, '', null].includes(crStatus)
                      let rules = [{ required: true, message: 'Please upload artefact' }]
                      const needArtefactSignoffs = ['DCON Signoff', 'Code Checker Signoff']
                      if (!needArtefactSignoffs.includes(rowData.signOffType?.[0])) {
                        rules = []
                      }
                      if (includes(rowData.signOffType, 'DCON Signoff', 'Technical Live Verification (LV) Signoff', 'Business Live Verification (LV) Signoff', 'Implementation Checker Signoff') && ['New', 'Reopen', 'Approved'].includes(crStatus)) {
                        disabled = false
                        if (crStatus == 'Approved') {
                          rules = [{ required: true, message: 'Please upload artefact' }]
                        }
                      }

                      if (includes(rowData.signOffType, 'Technical Live Verification (LV) Signoff', 'Business Live Verification (LV) Signoff', 'Implementation Checker Signoff')) {
                        if (crStatus != 'Approved') {
                          disabled = true
                        }
                        const Implementation_Time = formData?.Implementation_Time || orderInfo?.formData?.Implementation_Time
                        if (Implementation_Time?.startDate && Implementation_Time?.startDate > new Date().getTime()) {
                          disabled = true
                        }
                        if (!Implementation_Time || !Implementation_Time?.startDate) {
                          disabled = true
                        }
                      }

                      if (['New', 'Reopen', undefined, '', null, 'Open'].includes(crStatus) && needArtefactSignoffs.includes(rowData.signOffType?.[0])) {
                        disabled = false
                      }
                      return <Form.Item
                        name={[row.name, 'artifact']}
                        rules={rules}
                      >
                        <Artefact disabled={formDisabled() || disabled} row={row} />
                      </Form.Item>
                    }
                  },
                  {
                    title: <span>Rejection Reason</span>,
                    key: 'rejectionReason',
                    width: '200px',
                    index: 'rejectionReason',
                    render(text, row) {
                      return <Form.Item name={[row.name, 'rejectionReason']}>
                        <RejectionReason />
                      </Form.Item>
                    }
                  },
                  {
                    title: "Actions",
                    key: 'actions',
                    width: '200px',
                    fixed: 'right',
                    render: (_, row) => {
                      const tableData = form.getFieldValue('otherSignoff');
                      const rowData = tableData[row.name] || {}
                      const approver = rowData.signOffUser?.[0]?.userId
                      let userInfo = localStorage.getItem('dosm_loginInfo')
                      userInfo = JSON.parse(userInfo)
                      const currentUser = userInfo.user.userId
                      let showSend = () => {
                        return crStatus &&
                          (rowData.status === 'WAITSEND' || rowData.status === 'REJECTED') &&
                          rowData.signOffType &&
                          (rowData.signOffUserGroup && rowData.signOffUserGroup?.length > 0) &&
                          (rowData.signOffUser && rowData.signOffUser?.length > 0) &&
                          currentUser == orderInfo.createdBy
                      };
                      let show = showSend()
                      if (includes(rowData.signOffType, 'DCON Signoff', 'Technical Live Verification (LV) Signoff', 'Business Live Verification (LV) Signoff', 'Implementation Checker Signoff')) {
                        show = false
                      }
                      return (
                        <Space>
                          {rowData?.status === 'PENDING' && currentUser == approver && (
                            <Button type="primary" onClick={() => approval(row.name)}>
                              Approve
                            </Button>
                          )}
                          {rowData?.status === 'PENDING' && currentUser == approver && (
                            <Button danger onClick={() => reject(row.name)}>
                              Reject
                            </Button>
                          )}
                          {show && (
                            <Button type="primary" onClick={() => sendEmail(row.name)}>
                              Send
                            </Button>
                          )}
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
    </div>
  );
};
export default observer(OtherSignoff);