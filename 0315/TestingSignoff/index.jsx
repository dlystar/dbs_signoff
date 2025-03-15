import React, { useEffect, useMemo, useRef, useState } from "react";
import { CWTable, Form4 as Form, Space, Modal, Checkbox, Input, message } from '@chaoswise/ui'
import testingSignoffStore from './store';
import { observer } from '@chaoswise/cw-mobx';
import Status from './components/Status';
import SignOffType from './components/SignoffType';
import RejectionReason from './components/RejectionReason';
import SignOffUserGroup from '../components/Group'
import SignOffUser from './components/User'
import Artefact from './components/Artefact'
import { DeleteOutlined } from '@ant-design/icons';
import uniqBy from 'lodash-es/uniqBy'
import sortBy from 'lodash-es/sortBy'
import { signoffInsertBatch, signoffUpdate, signoffApproved, signoffRejected, signoffSendEmail, getSignOffListByWorkOrderId, signoffStatus, signoffDeleteBatch, signoffBatchUpdate } from '../api'
import { PlusOutlined } from '@ant-design/icons';
import { SIGNOFF_GROUP } from '../constants';
import { helper } from '@/utils/T';
import Button from '../components/TableButton'
import { formily } from '@chaoswise/ui/formily';
import { formatFormValues } from '@/pages/Reception/common/fieldUtils';
import { fieldValueChangeToValidateFields } from '../util';
const { useFormEffects, LifeCycleTypes } = formily;
const Signoff = (props) => {
    const { formActions, schema, baseActions, orderContainerID, initData, registerOnChildFormSubmit, registerOnFormValuesChange, registerOnOrderCreateSuccess } = props
    const orderInfo = initData
    const [tableLoading, setTableLoading] = useState(false)
    const [form] = Form.useForm();
    const { signoffTypeOptions, setSignoffTypeOptions, formData, updateState } = testingSignoffStore
    const crStatus = orderInfo?.formData?.crStatus_value
    const containerRef = useRef()
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
    }
    useFormEffects(($, _) => {
        // open状态以后，不再去同步表单和signoff的数据了
        // 别人进来也不监听了
        if(editableStatus.includes(crStatus) && !formDisabled()){
            $(LifeCycleTypes.ON_FORM_VALUES_CHANGE).subscribe((formState) => {
                if(!formState.mounted) return
                // getbaseValues有滞后性😭，setTimeout一下，不然拿的还是上一次的_value
                setTimeout(() => {
                    const baseValues = baseActions.getBaseValue()
                    const _values = formatFormValues(schema, formState.values)
                    const finilyValues = { ...(baseValues || {}), ...(_values || {}) }
                    const tableData = form.getFieldValue('testingSignoff')
                    if (initedRef.current) {
                        updateState({ formData: finilyValues })
                        fieldChange(finilyValues, tableData)
                    }
                },60)
            });
        }
    });
    const arrayIsEqual = (arr1, arr2) => {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false
        return JSON.stringify(arr1) == JSON.stringify(arr2)
    }
    const { signoffTypes, uatGroupIds = [], nUatGroupIds = [] } = window.DOSM_CUSTOM_DBS.signoff.testingSignoff
    const tableHasFormData = (key, value, tableData) => {
        return !!tableData.find(item => item[key]?.includes(value))
    }
    const newRow = (signoffTypeValue) => {
        const rowData = {
            status: "WAITSEND",
            signOffType: signoffTypeValue ? [signoffTypeValue] : undefined,
            signOffUserGroup: undefined,
            signOffUser: undefined,
            artifact: undefined,
            rejectionReason: undefined
        }
        return rowData
    }
    const shouldResetSignoff = (index, key, val) => {
        let tableData = form.getFieldValue('testingSignoff')
        const rowData = tableData[index]
        // when crStatus is new，change User field
        // when crStatus is new，change artefact field
        if (crStatus && rowData.status != 'WAITSEND') {
            if (key == 'signOffUser' && val) {
                return true
            }
            if (key == 'artifact' && val) {
                return true
            }
            if (key == 'signOffType' && val) {
                return true
            }
            if (key === 'signOffUserGroup' && val) {
                return true
            }
        }
        return false
    }
    useEffect(() => {
        if (initData) {
            onFormMount(initData)
        }
    }, [])
    useEffect(() => {
        registerOnChildFormSubmit && registerOnChildFormSubmit(onFormSubmit)
        registerOnOrderCreateSuccess && registerOnOrderCreateSuccess(onOrderCreateSuccess)
    })
    const onFormMount = (orderInfo) => {
        updateState({ orderInfo })
        if (orderInfo.formData?.crStatus && !initedRef.current) {
            getSignoffs(orderInfo.formData, orderInfo.workOrderId, true)
            .finally(() => {
                // 工单创建人才需要
                if(editableStatus.includes(crStatus) && !formDisabled()){
                    setTimeout(() => {
                        const testingSignoff = form.getFieldValue('testingSignoff')
                        formActions.getFormState(formState => {
                            const _values = formatFormValues(schema, formState.values)
                            fieldChange(_values, testingSignoff, orderInfo)
                        })
                        initedRef.current = true
                    }, 0)
                }
            })
        } else if (!orderInfo.formData?.crStatus && !initedRef.current) {
            const testingSignoff = form.getFieldValue('testingSignoff')
            formActions.getFormState(formState => {
                const _values = formatFormValues(schema, formState.values)
                fieldChange(_values, testingSignoff, orderInfo)
            })
            initedRef.current = true
        }
    }
    const onOrderCreateSuccess = (workOrderId) => {
        // when crStatus is empty (means create order)
        if (!crStatus) {
            const tableData = form.getFieldValue('testingSignoff') || []
            const params = tableData.map(item => {
                return {
                    ...item,
                    signOffUserGroup: JSON.stringify(item.signOffUserGroup),
                    signOffUser: JSON.stringify(item.signOffUser),
                    artifact: JSON.stringify(item.artifact),
                    signOffType: JSON.stringify(item.signOffType),
                    signOffGroup: SIGNOFF_GROUP.TESTING_SIGNOFF,
                    topAccountId,
                    accountId,
                    workOrderId,
                }
            })
            if (params.length > 0) {
                signoffInsertBatch(params)
            }
        }
    }

    const onFormSubmit = () => {
        return new Promise((resolve, reject) => {
            form.validateFields().then(values => {
                const { testingSignoff } = values
                if(!testingSignoff) return resolve({values})
                const inputTypes = testingSignoff?.map(item => item.signOffType)?.flat() || []
                let needTypes = []
                signoffTypes.forEach(item => {
                    if (item.conditionValue.includes(formDataRef.current[item.formKey])) {
                        needTypes.push(item.signoffType)
                    }
                })
                let notTypes = []
                needTypes.forEach(item => {
                    if (!inputTypes.includes(item)) {
                        notTypes.push(item)
                    }
                })
                if (notTypes.length > 0) {
                    const error = [
                        {
                            name: 'testingSignoff',
                            messages: `You need to get ${notTypes.join(',')} Signoff to submit CR.`
                        }
                    ]
                    reject(error)
                } else {
                    resolve({ values })
                }
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
                    [SIGNOFF_GROUP.TESTING_SIGNOFF]: error
                })
            })
        })
    }
    const getSignoffs = (formData, workOrderId, isMounted) => {
        const orderId = orderInfo.workOrderId || workOrderId
        if (!orderId) {
            return new Promise((resolve, reject) => { resolve('') })
        }
        setTableLoading(true)
        return getSignOffListByWorkOrderId({ workOrderId: orderId, signOffGroup: SIGNOFF_GROUP.TESTING_SIGNOFF }).then(res => {
            res = res?.data?.map(item => {
                return {
                    ...item,
                    signOffUserGroup: JSON.parse(item.signOffUserGroup),
                    signOffUser: JSON.parse(item.signOffUser),
                    artifact: JSON.parse(item.artifact),
                    signOffType: JSON.parse(item.signOffType),
                }
            })
            const testingSignoffData = res?.filter(i => i.signOffGroup === SIGNOFF_GROUP.TESTING_SIGNOFF)
            form.setFieldValue('testingSignoff', sortBy(testingSignoffData, 'id'))
            let typeOptions = []
            testingSignoffData.forEach(i => {
                typeOptions = typeOptions.concat(i.signOffType || [])
            })
            if(isMounted){
                setSignoffTypeOptions(uniqBy(typeOptions.map(i => ({ label: i, value: i })), 'value'))
            }
            setTableLoading(false)
        }).catch(err => {
            setTableLoading(false)
        })
    }

    const fieldChange = helper.debounce((newFormData, _tableData, _orderInfo) => {
        const _signoffTypeOptions = []
        const tableData = JSON.parse(JSON.stringify(_tableData || []))
        let newRows = []
        let deleteRows = []
        let updateRows = []
        signoffTypes.forEach(signoffType => {
            const title = signoffType.signoffType
            const name = signoffType.formKey
            const _value = signoffType.formKey + '_value'
            // Check if the form data matches the signoff condition value and if the table data does not already have a row with the same signoff type
            // if (newFormData[name] && signoffType.conditionValue.includes(newFormData[name]) && !tableHasFormData('signOffType', title, tableData)) {
            //     newRows.push(newRow(title))
            //     tableData.push(newRow(title))
            // }
            // Check if the form data does not match the signoff condition value and if the table data already has a row with the same signoff type
            if ((newFormData[name] && !signoffType.conditionValue.includes(newFormData[name]) || !newFormData[name]) && tableHasFormData('signOffType', title, tableData)) {
                // const index = tableData.findIndex(item => arrayIsEqual(item.signOffType, [title]))
                // if (index > -1) {
                //     let deleteRow = tableData.splice(index, 1)
                //     deleteRows = deleteRows.concat(deleteRow.filter(i => i.id))
                // }
                tableData.forEach(item => {
                    if (item.signOffType && item.signOffType?.length > 0 && item.signOffType.includes(title)) {
                        item.signOffType.splice(item.signOffType.findIndex(i => i == title), 1)                        
                        if(item.signOffType?.includes('UAT')){
                            item.signOffUserGroup = [{
                                groupId: uatGroupIds,
                                groupName: 'SVP & Above'
                            }]
                        }else{
                            item.signOffUserGroup = [{
                                groupId: nUatGroupIds[0],
                                groupName: 'HR Employee List'
                            }]
                            
                        }         
                        console.log(`testingSignoff-${title} 条件不满足 新值:${newFormData[_value]} 旧值:${formDataRef.current?.[_value]}`);
                        updateRows.push(item)
                    }
                })
            }
            if (newFormData[name] && signoffType.conditionValue.includes(newFormData[name])) {
                _signoffTypeOptions.push({ label: title, value: title })
            }
        })

        setSignoffTypeOptions(uniqBy(_signoffTypeOptions, 'value'))
        if (!arrayIsEqual(_tableData, tableData)) {
            if (newFormData.crStatus || crStatus) {
                let fetchs = []
                if (deleteRows.length > 0) {
                    fetchs.push(signoffDeleteBatch(deleteRows.map(item => item.id)), orderInfo.workOrderId)
                }
                if (newRows.length > 0) {
                    fetchs.push(signoffInsertBatch(newRows.map(item => {
                        return {
                            ...item,
                            signOffUserGroup: JSON.stringify(item.signOffUserGroup),
                            signOffUser: JSON.stringify(item.signOffUser),
                            artifact: JSON.stringify(item.artifact),
                            signOffType: JSON.stringify(item.signOffType),
                            signOffGroup: SIGNOFF_GROUP.TESTING_SIGNOFF,
                            topAccountId,
                            accountId,
                            workOrderId: orderInfo.workOrderId
                        }
                    })))
                }
                if(updateRows.length > 0){
                    updateRows.forEach(item => {
                        fetchs.push(signoffUpdate({
                            ...item,
                            signOffUserGroup: JSON.stringify(item.signOffUserGroup),
                            signOffUser: JSON.stringify(item.signOffUser),
                            artifact: JSON.stringify(item.artifact),
                            signOffType: JSON.stringify(item.signOffType),
                            signOffGroup: SIGNOFF_GROUP.TESTING_SIGNOFF,
                            topAccountId,
                            accountId,
                            workOrderId: orderInfo.workOrderId
                        }))
                    })
                }
                if (fetchs.length > 0) {
                    Promise.all(fetchs).finally(() => {
                        getSignoffs()
                    })
                }
            }else{
                console.log('tableData', tableData);
                
                setTimeout(() => {
                    form.setFieldValue('testingSignoff', tableData)
                }, 60)
            }
        }
        formDataRef.current = newFormData
    },300)

    const addRecord = () => {
        const tableData = form.getFieldValue('testingSignoff') || []
        if (!crStatus) {
            tableData.push(newRow())
            form.setFieldValue('testingSignoff', tableData)
        } else {
            const rowData = {
                status: "WAITSEND",
                signOffType: "[]",
                signOffUserGroup: undefined,
                signOffUser: undefined,
                artifact: undefined,
                signOffGroup: 'TestingSignoff'
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
            const tableData = form.getFieldValue('testingSignoff') || []
            const deleteRow = tableData[Number(row.name)]
            return signoffDeleteBatch([deleteRow.id], orderInfo.workOrderId).then(res => {
                getSignoffs()
            }).catch(err => {
                getSignoffs()
            })
        }
    }
    const showAdd = () => {
        let userInfo = localStorage.getItem('dosm_loginInfo')
        userInfo = JSON.parse(userInfo)
        const currentUser = userInfo.user.userId
        return !formDisabled() && editableStatus.includes(crStatus) && signoffTypeOptions.length > 0
    }
    
    const onValuesChange = (index, key, val) => {
        const tableData = form.getFieldValue('testingSignoff')
        const rowData = tableData[index]
        if (crStatus) {
            signoffUpdate({
                ...rowData,
                signOffUserGroup: JSON.stringify(rowData.signOffUserGroup) || "[]",
                signOffUser: JSON.stringify(rowData.signOffUser) || "[]",
                artifact: JSON.stringify(rowData.artifact),
                signOffType: JSON.stringify(rowData.signOffType),
            }).then(res => {
                if (shouldResetSignoff(index, key, val)) {
                    signoffStatus({ signOffId: rowData.id, status: 'WAITSEND', workOrderId: rowData.workOrderId }).then(res => {
                        getSignoffs()
                    }).catch(err => {
                        window.prompt.error(err.msg)
                    })
                } else {
                    getSignoffs()
                }
            }).catch(() => {
                getSignoffs()
            })
        }
    }
    // 发送
    const sendEmail = (rowNum) => {
        const tableData = form.getFieldValue('testingSignoff')
        const rowData = tableData[rowNum]
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
            window.prompt.error('Please upload artefact')
            return
            // return signoffSendEmail({ signOffId: rowData.id, workOrderId: rowData.workOrderId }).then(res => {
            //     window.prompt.success('Successfully send')
            //     getSignoffs()
            // }).catch(err => {
            //     window.prompt.error(err.msg)
            // })
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
                return signoffSendEmail({ signOffId: rowData.id, workOrderId: rowData.workOrderId }).then(res => {
                    window.prompt.success('Successfully send')
                    getSignoffs()
                }).catch(err => {
                    window.prompt.error(err.msg)
                })
            },
        })
    }
    const approval = (rowNum) => {
        const tableData = form.getFieldValue('testingSignoff')
        const rowData = tableData[rowNum]
        return signoffApproved({ signOffId: rowData.id, workOrderId: rowData.workOrderId }).then(res => {
            window.prompt.success('Approved')
            getSignoffs()
        }).catch(err => {
            window.prompt.error(err.msg)
        })
    }
    const reject = (rowNum) => {
        const tableData = form.getFieldValue('testingSignoff')
        const rowData = tableData[rowNum]
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
                return signoffRejected({ signOffId: rowData.id, rejectionReason: rejectionReason, workOrderId: rowData.workOrderId }).then(res => {
                    window.prompt.success('Rejected')
                    getSignoffs()
                }).catch(err => {
                    window.prompt.error(err.msg)
                })
            },
        })
    }
    return <div className="testingSignoff" ref={containerRef}>
        <Form form={form} name="signoff"  onValuesChange={() => {fieldValueChangeToValidateFields(form, containerRef, SIGNOFF_GROUP.TESTING_SIGNOFF)}}>
            <Form.List name="testingSignoff">
                {(fields, { add, remove }, { errors }) => {
                    return <CWTable
                        loading={tableLoading}
                        scroll={{ x: 1200 }}
                        style={{ width: '100%' }}
                        columns={[
                            {
                                title: "Status",
                                key: 'status',
                                index: 'status',
                                width: '120px',
                                render(text, row) {
                                    return <Form.Item name={[row.name, 'status']}>
                                        <Status row={row} disabled={formDisabled()} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{ color: '#f5222d' }}>*</span>Signoff Type</span>,
                                key: 'signOffType',
                                index: 'signOffType',
                                width: '200px',
                                render(text, row) {
                                    const status = ['', null, undefined, 'New', 'Reopen']
                                    const disabled = !status.includes(crStatus)
                                    return <Form.Item name={[row.name, 'signOffType']} rules={[{ required: true, message: 'Please select Signoff Type' }]}>
                                        <SignOffType type="testing" row={row} disabled={formDisabled() || disabled} signoffTypeOptions={signoffTypeOptions} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{ color: '#f5222d' }}>*</span>Group</span>,
                                key: 'Group',
                                index: 'Group',
                                width: '200px',
                                render(text, row) {
                                    const status = ['', null, undefined, 'New', 'Reopen']
                                    const disabled = !status.includes(crStatus)
                                    return <Form.Item name={[row.name, 'signOffUserGroup']} rules={[{ required: true, message: 'Please select Group' }]}>
                                        <SignOffUserGroup row={row} disabled={true} formActions={formActions} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{ color: '#f5222d' }}>*</span>Signer</span>,
                                key: 'User',
                                index: 'User',
                                width: '200px',
                                render(text, row) {
                                    const status = ['', null, undefined, 'New', 'Reopen']
                                    const disabled = !status.includes(crStatus)
                                    return <Form.Item name={[row.name, 'signOffUser']} rules={[{ required: true, message: 'Please select User' }]}>
                                        <SignOffUser row={row} disabled={formDisabled() || disabled} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{ color: '#f5222d' }}>*</span>Artefact</span>,
                                key: 'artifact',
                                width: '200px',
                                index: 'artifact',
                                render(text, row) {
                                    const status = ['', null, undefined, 'New', 'Reopen', 'Open']
                                    const disabled = !status.includes(crStatus)
                                    return <Form.Item name={[row.name, 'artifact']} rules={[{ required: true, message: 'Please upload artefact' }]}>
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
                                index: 'actions',
                                width: '200px',
                                fixed: 'right',
                                render(text, row) {
                                    const tableData = form.getFieldValue('testingSignoff')
                                    const rowData = tableData[row.name] || {}
                                    const approver = rowData.signOffUser?.[0]?.userId
                                    let userInfo = localStorage.getItem('dosm_loginInfo')
                                    userInfo = JSON.parse(userInfo)
                                    const currentUser = userInfo.user.userId
                                    const showSend = () => {
                                        return crStatus &&
                                            (rowData.status === 'WAITSEND' || rowData.status === 'REJECTED') &&
                                            rowData.signOffType &&
                                            (rowData.signOffUserGroup && rowData.signOffUserGroup?.length > 0) &&
                                            (rowData.signOffUser && rowData.signOffUser?.length > 0) &&
                                            currentUser == orderInfo.createdBy
                                    }
                                    return <Space>
                                        {/* <Button icon={<EditOutlined />} style={{border: 'none', background: 'transparent'}}></Button> */}
                                        {
                                            showAdd() &&
                                            rowData.status != 'REJECTED' &&
                                            <Button style={{ border: 'none', background: 'transparent' }} onClick={() => {
                                                removeRecord(row)
                                            }}><DeleteOutlined /></Button>
                                        }
                                        {
                                            rowData.status === 'PENDING' && approver == currentUser &&
                                            <Button type="primary" onClick={() => approval(row.name)}>Approve</Button>
                                        }
                                        {
                                            rowData.status === 'PENDING' && approver == currentUser &&
                                            <Button type="danger" ghost onClick={() => reject(row.name)}>Rejected</Button>
                                        }
                                        {
                                            showSend() &&
                                            <Button type="primary" onClick={() => sendEmail(row.name)}>Send</Button>
                                        }
                                    </Space>
                                }
                            }
                        ]}
                        dataSource={fields?.map((i) => ({ ...i, remove, form, signoffTypeOptions: signoffTypeOptions, onValuesChange, formData }))}
                        pagination={false}
                    ></CWTable>
                }}
            </Form.List>
            {
                showAdd() &&
                <Button type="link" size="small" onClick={addRecord}><PlusOutlined />Add</Button>
            }
        </Form>
    </div>
}
export default observer(Signoff);