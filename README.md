import React, { useEffect, useRef, useState } from "react";
import { CWTable, Form4 as Form, Space, Modal, Checkbox, Input, Icon, Tooltip } from '@chaoswise/ui'
import heightenSignoffStore from './store';
import { observer } from '@chaoswise/cw-mobx';
import Status from '../TestingSignoff/components/Status';
import SignOffType from '../TestingSignoff/components/SignoffType';
import RejectionReason from '../TestingSignoff/components/RejectionReason';
import SignOffUserGroup from '../components/Group'
import SignOffUser from '../TestingSignoff/components/User'
import Artefact from '../TestingSignoff/components/Artefact'
import uniqBy from 'lodash-es/uniqBy'
import { signoffUpdate, signoffApproved, signoffRejected, signoffSendEmail, getSignOffListByWorkOrderId, signoffStatus, signoffInsertBatch, signoffDeleteBatch } from '../api'
import { getFlatSchema } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/FormEngine/FormRender/util/handleSchema';
import { SIGNOFF_GROUP } from '../constants';
import { helper } from '@/utils/T';
import Button from '../components/TableButton'


import { formily } from '@chaoswise/ui/formily';
import { formatFormValues } from '@/pages/Reception/common/fieldUtils';
import { eventManager } from '@/utils/T/core/helper';
import { fieldValueChangeToValidateFields, getArcGroupDefaultValue, saveWorkOrder } from '../util';
const { useFormEffects, LifeCycleTypes } = formily;
const Signoff = (props) => {


    const { formActions, schema, baseActions, orderContainerID, initData, registerOnChildFormSubmit, registerOnFormValuesChange, registerOnOrderCreateSuccess } = props
    const orderInfo = initData
    const [tableLoading, setTableLoading] = useState(false)
    const [form] = Form.useForm();
    const { formData, updateState, signoffTypeOptions, setSignoffTypeOptions } = heightenSignoffStore
    const crStatus = orderInfo?.formData?.crStatus_value
    const containerRef = useRef()
    const initedRef = useRef(false)
    let accountId = JSON.parse(localStorage.getItem('dosm_loginInfo'))?.user?.accountId || '110';
    let topAccountId = JSON.parse(localStorage.getItem('userConfig'))?.topAccountId || accountId;
    const editableStatus = ['', null, undefined, 'New', 'Reopen']
    const formDataRef = useRef({})
    const isSameUserGroup = () => {
        let userInfo = localStorage.getItem('dosm_loginInfo')
        userInfo = JSON.parse(userInfo)
        const groupRelation = userInfo.user?.groupRelation?.map?.(item => String(item.groupId)) || []
        const changeRequestorGroups = orderInfo?.formData?.changeRequestorGroups?.[0]?.groupId
        console.log('user-compare', groupRelation, changeRequestorGroups, userInfo.user.userId, orderInfo.createdBy);
        return changeRequestorGroups && groupRelation.includes(changeRequestorGroups)
    }
    const notCreateBy = () => {
        if (orderInfo.createdBy) {
            let userInfo = localStorage.getItem('dosm_loginInfo')
            userInfo = JSON.parse(userInfo)
            if (userInfo.user.userId == orderInfo.createdBy) {
                return false
            } else if(isSameUserGroup()){
                return false
            }else {
                return true
            }
        } else {
            return false
        }
    }
    const formDisabled = () => {
        if(orderInfo.bizKey && !crStatus){
            return true
        }
        return notCreateBy()
    }
    useFormEffects(($, _) => {
        // open状态以后，不再去同步表单和signoff的数据了 ---to do
        if (editableStatus.includes(crStatus) && !formDisabled()) {
            $(LifeCycleTypes.ON_FORM_VALUES_CHANGE).subscribe((formState) => {
                if(!formState.mounted) return
                // getbaseValues有滞后性😭，setTimeout一下，不然拿的还是上一次的_value
                setTimeout(() => {
                    const baseValues = JSON.parse(JSON.stringify(baseActions.getBaseValue() || {}))
                    const _values = formatFormValues(schema, formState.values)
                    const finilyValues = { ...(_values || {}), ...(baseValues || {})}
                    const tableData = form.getFieldValue('heightenSignoff')
                    if (initedRef.current) {
                        updateState({formData: finilyValues})
                        console.log('heightenSignoff-value-change', finilyValues);
                        fieldChange(finilyValues, tableData)
                    }
                },60)
            });
        }
    });
    useEffect(() => {
        setSignoffTypeOptions([
            { label: 'ARC Signoff', value: 'ARC Signoff' }
        ])
        if (initData) {
            onFormMount(initData)
        }
    }, [])


    useEffect(() => {
        registerOnChildFormSubmit && registerOnChildFormSubmit(onFormSubmit)
        registerOnOrderCreateSuccess && registerOnOrderCreateSuccess(onOrderCreateSuccess)
    },[])


    // Form changes will reset signoff approval status
    const shouldResetSignoff = (index, key, val) => {
        let tableData = form.getFieldValue('heightenSignoff')
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
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false
        return JSON.stringify(arr1) == JSON.stringify(arr2)
    }
    // These fields will affect the changes of signoff type dropdown options and values
    // signoffTypes are testing signoff types, used to correspond with form field codes
    const { signoffTypes } = window.DOSM_CUSTOM_DBS.signoff.heightenSignoff
    const tableHasFormData = (key, value, tableData) => {
        return !!tableData.find(item => item[key]?.includes(value))
    }
    const newRow = (signoffTypeValue) => {
        const rowData = {
            status: "WAITSEND",
            signOffType: [signoffTypeValue],
            signOffUserGroup: undefined,
            signOffUser: undefined,
            artifact: undefined,
            rejectionReason: undefined
        }
        return rowData
    }
    // Check if LOB value meets ARC Signoff conditions
    const isValidLobForArcSignoff = (lob) => {
        const lobValue = Array.isArray(lob) ? lob[0] : lob;
        // CES TS ISS
        return lobValue && !['b7750f1ceacf4fc28df4dec4b1fd8af9', '123c781dae434ceeafdfa1264575853c', '45eb96d75c5e4c02b8898265423a2326'].some(prefix => lobValue?.startsWith(prefix));
    };


    // Manage ARC Signoff status in table and options
    const manageArcSignoff = (tableData, shouldInclude, newFormData) => {
        if (shouldInclude && !tableHasFormData('signOffType', 'ARC Signoff', tableData)) {
            console.log(`heightenSignoff条件满足 新值:lob:${newFormData.lob_value}cr classfication:${newFormData.crClassification_value} 旧值:lob:${formDataRef.current.lob_value}cr classfication:${formDataRef.current.crClassification_value}`);
            tableData.push(newRow('ARC Signoff'));
        } else if (!shouldInclude && tableHasFormData('signOffType', 'ARC Signoff', tableData)) {
            const tableIndex = tableData.findIndex(item => arrayIsEqual(item.signOffType, ['ARC Signoff']));
            if (tableIndex > -1) {
                console.log(`heightenSignoff条件不满足 新值:lob:${newFormData.lob_value}cr classfication:${newFormData.crClassification_value} 旧值:lob:${formDataRef.current.lob_value}cr classfication:${formDataRef.current.crClassification_value}`);
                tableData.splice(tableIndex, 1);
            }
        }
    };
    const isNotSameGroup = (tableData, _tableData) => {
        const groupId = tableData?.[0]?.signOffUserGroup?.[0]?.groupId
        const _groupId = _tableData?.[0]?.signOffUserGroup?.[0]?.groupId
        if(groupId == _groupId){
            return false
        }else{
            return true
        }
    }
    // Update form data
    const updateFormData = async(tableData, _tableData, formData) => {
        if(tableData.length > 0){
            tableData[0].signOffUserGroup = await getArcGroupDefaultValue(tableData[0].signOffType, formData)
        }
        if (!arrayIsEqual(_tableData, tableData)) {
            if (crStatus) {
                let deleteRows = (_tableData?.length > 0 && tableData.length == 0) ? _tableData : []
                let newRows = (_tableData?.length == 0 && tableData.length > 0) ? tableData : []
                let updateRows = (_tableData?.length > 0 && (tableData.length == _tableData?.length)) ? tableData : []
                if (deleteRows.length > 0) {
                    signoffDeleteBatch(deleteRows.map(item => item.id), orderInfo.workOrderId).then(res => {
                        getSignoffs()
                    }).catch(err => {
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
                            signOffGroup: SIGNOFF_GROUP.HEIGHTENED_SIGNOFF,
                            topAccountId,
                            accountId,
                            workOrderId: orderInfo.workOrderId
                        }
                    })).then(() => {
                        getSignoffs()
                    }).catch(err => {
                        getSignoffs()
                    })
                }
                if(updateRows.length > 0 && isNotSameGroup(tableData, _tableData)){
                    form.setFieldValue('heightenSignoff', tableData);
                    onValuesChange(0, "signOffUserGroup", tableData[0].signOffUserGroup)
                }
            } else {
                setTimeout(() => {
                    form.setFieldValue('heightenSignoff', tableData);
                }, 300);
            }


        }
    };


    const fieldChange = helper.debounce((formData, _tableData = [], _orderInfo) => {
        let tableData = JSON.parse(JSON.stringify(_tableData || []));
        signoffTypes.forEach(signoffType => {
            const fieldValue = formData?.[signoffType.formKey];
            const isArcSignoffRequired = fieldValue &&
                signoffType.conditionValue.includes(fieldValue) &&
                isValidLobForArcSignoff(formData?.lob);
            console.log('isArcSignoffRequired', isArcSignoffRequired, tableData);
            manageArcSignoff(tableData, isArcSignoffRequired, formData);
        });
        console.log('tableData', _tableData, tableData);
        updateFormData(tableData, _tableData, formData);
        formDataRef.current = formData
    }, 300)


    const onFormSubmit = () => {
        return new Promise((resolve, reject) => {
            form.validateFields().then(values => {
                // Check if each row's status is APPROVED, if not, reject, if yes, resolve
                resolve({ values })
            })
            .catch(errors => {
                if(notCreateBy()){
                    return resolve({ values: {} })
                }
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
                    [SIGNOFF_GROUP.HEIGHTENED_SIGNOFF]: error
                })
            })
        })
    }
    const onFormMount = (orderInfo) => {
        updateState({ orderInfo })
        if (orderInfo.formData?.crStatus && !initedRef.current) {
            getSignoffs(orderInfo.workOrderId).then((tableData) => {
                if(editableStatus.includes(crStatus) && !formDisabled()){
                    formActions.getFormState(formState => {
                        const _values = formatFormValues(schema, formState.values)
                        fieldChange(_values, tableData, orderInfo)
                    })
                }
                initedRef.current = true
            })
        }else{
            const tableData = form.getFieldValue('heightenSignoff')
            formActions.getFormState(formState => {
                const _values = formatFormValues(schema, formState.values)
                fieldChange(_values, tableData, orderInfo)
            })
            initedRef.current = true
        }
    }


    const onOrderCreateSuccess = (workOrderId) => {
        // debugger
        // When crStatus is new, insert data
        if (!crStatus) {
            const tableData = form.getFieldValue('heightenSignoff') || []
            // debugger
            const params = tableData.map(item => {
                return {
                    ...item,
                    signOffUserGroup: JSON.stringify(item.signOffUserGroup),
                    signOffUser: JSON.stringify(item.signOffUser),
                    artifact: JSON.stringify(item.artifact),
                    signOffType: JSON.stringify(item.signOffType),
                    signOffGroup: SIGNOFF_GROUP.HEIGHTENED_SIGNOFF,
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


    const onValuesChange = (index, key, val) => {
        // Real-time update after work order creation
        const tableData = form.getFieldValue('heightenSignoff')
        const rowData = tableData[index]
        if (crStatus) {
            signoffUpdate({
                ...rowData,
                signOffUserGroup: JSON.stringify(rowData.signOffUserGroup),
                signOffUser: JSON.stringify(rowData.signOffUser) || "[]",
                artifact: JSON.stringify(rowData.artifact),
                signOffType: JSON.stringify(rowData.signOffType),
            }).then(res => {
                // Field value changes, involving resetting signoff tasks, reset signoff tasks
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
    // Send email
    const sendEmail = (rowNum) => {
        const tableData = form.getFieldValue('heightenSignoff')
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
            return signoffSendEmail({ signOffId: rowData.id, workOrderId: rowData.workOrderId }).then(res => {
                window.prompt.success('Successfully send')
                getSignoffs()
                saveWorkOrder(orderContainerID)
            }).catch(err => {
                window.prompt.error(err.msg)
            })
        }
        Modal.confirm({
            title: 'Declaration',
            content: <span><Checkbox onChange={onChange} style={{ marginRight: 10 }} />I am fully responsible & accountable for all the artefacts uploaded and attest that it does not contain any customer, sensitive, or PII data.</span>,
            okButtonProps: { id: 'sendEmail_button' },
            okText: 'Confirm',
            cancelText: 'Discard',
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
                    saveWorkOrder(orderContainerID)
                }).catch(err => {
                    window.prompt.error(err.msg)
                })
            },
        })
    }
    // Approve
    const approval = (rowNum) => {
        const tableData = form.getFieldValue('heightenSignoff')
        const rowData = tableData[rowNum]
        return signoffApproved({ signOffId: rowData.id, workOrderId: rowData.workOrderId }).then(res => {
            window.prompt.success('Approved')
            getSignoffs()
        }).catch(err => {
            window.prompt.error(err.msg)
        })
    }
    // Reject
    const reject = (rowNum) => {
        const tableData = form.getFieldValue('heightenSignoff')
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
                if(!rejectionReason){
                    window.prompt.error('Please enter rejection reason')
                    return Promise.reject()
                }
                return signoffRejected({ signOffId: rowData.id, rejectionReason: rejectionReason, workOrderId: rowData.workOrderId }).then(res => {
                    window.prompt.success('Rejected')
                    getSignoffs()
                }).catch(err => {
                    window.prompt.error(err.msg)
                })
            },
        })
    }
    // Get all signoff information under the current work order, filter heightenSignoff
    const getSignoffs = (workOrderId) => {
        const orderId = orderInfo.workOrderId || workOrderId
        if (!orderId) {
            return new Promise((resolve, reject) => { resolve('') })
        }
        setTableLoading(true)
        return new Promise((resolve, reject) => {
            getSignOffListByWorkOrderId({ workOrderId: orderId, signOffGroup: SIGNOFF_GROUP.HEIGHTENED_SIGNOFF }).then(res => {
                res = res?.data?.map(item => {
                    return {
                        ...item,
                        signOffUserGroup: JSON.parse(item.signOffUserGroup),
                        signOffUser: JSON.parse(item.signOffUser),
                        artifact: JSON.parse(item.artifact),
                        signOffType: JSON.parse(item.signOffType),
                    }
                })
                const heightenSignoffData = res?.filter(i => i.signOffGroup === SIGNOFF_GROUP.HEIGHTENED_SIGNOFF)
                form.setFieldValue('heightenSignoff', heightenSignoffData)
                let typeOptions = []
                heightenSignoffData.forEach(i => {
                    typeOptions = typeOptions.concat(i.signOffType || [])
                })
                resolve(heightenSignoffData)
                setTableLoading(false)
            }).catch(err => {
                resolve([])
                setTableLoading(false)
            })
        })
    }

    const getErrorTips = (index) => {
        const tableData = form.getFieldValue('heightenSignoff') || []
        const rowData = tableData[index] || {}
        const status = rowData.status
        if(crStatus == 'Open' && status != 'APPROVED'){
            return {
                showError: true,
                errorText: 'Required before CR is fully approved'
            }
        }else{
            return {
                showError: false,
                errorText: ''
            }
        }
    }
    return <div className="heightenSignoff" ref={containerRef}>
        <Form form={form} name="signoff" onValuesChange={() => {fieldValueChangeToValidateFields(form, containerRef, SIGNOFF_GROUP.HEIGHTENED_SIGNOFF)}}>
            <Form.List name="heightenSignoff">
                {(fields, { add, remove }, { errors }) => {
                    return <CWTable
                        loading={tableLoading}
                        scroll={{ x: 1200 }}
                        columns={[
                            {
                                title: "Status",
                                key: 'status',
                                index: 'status',
                                width: '120px',
                                render(text, row) {
                                    const errorObj = getErrorTips(row.name)
                                    return <Form.Item name={[row.name, 'status']}>
                                        <Status row={row} disabled={formDisabled()} {...errorObj} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span>
                                    <span style={{ color: '#f5222d' }}>*</span>
                                    Signoff Type
                                    <Tooltip title={`Status of Architectural Review Committee signoff. ARC signoff is required for heightened change. ARC signoff can be done in bulk.`}><Icon type="info-circle" style={{marginLeft: 5}} /></Tooltip>
                                </span>,
                                key: 'signOffType',
                                index: 'signOffType',
                                width: '200px',
                                render(text, row) {
                                    return <Form.Item name={[row.name, 'signOffType']} rules={[{ required: true, message: 'Please select Signoff Type' }]}>
                                        <SignOffType row={row} disabled={true} signoffTypeOptions={signoffTypeOptions} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{ color: '#f5222d' }}>*</span>Group</span>,
                                key: 'Group',
                                index: 'Group',
                                width: '330px',
                                render(text, row) {
                                    const status = ['', null, undefined, 'New', 'Reopen', 'Open']
                                    const disabled = !status.includes(crStatus)
                                    return <Form.Item name={[row.name, 'signOffUserGroup']} rules={[{ required: true, message: 'Please select Group' }]}>
                                        <SignOffUserGroup type="heighten" row={row} disabled={true} selectWidth="330px" />
                                    </Form.Item>
                                }
                            },
                            {
                                title: () => {
                                    const status = ['', null, undefined, 'New', 'Reopen']
                                    let required = true
                                    if(status.includes(crStatus)){
                                        required = false
                                    }
                                    return <span><span style={{ color: '#f5222d' }}>{required && '*'}</span>Signer</span>
                                },
                                key: 'User',
                                index: 'User',
                                width: '280px',
                                render(text, row) {
                                    const status = ['', null, undefined, 'New', 'Reopen', 'Open']
                                    const rulesStatus = ['', null, undefined, 'New', 'Reopen']
                                    const disabled = !status.includes(crStatus)
                                    let rules = [{ required: true, message: 'Please select User' }]
                                    if(rulesStatus.includes(crStatus)){
                                        rules = []
                                    }
                                    return <Form.Item name={[row.name, 'signOffUser']} rules={rules}>
                                        <SignOffUser row={row} disabled={formDisabled() || disabled} selectWidth="280px" />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span>Artefact</span>,
                                key: 'artifact',
                                width: '200px',
                                index: 'artifact',
                                render(text, row) {
                                    return null
                                    const status = ['', null, undefined, 'New', 'Reopen']
                                    const disabled = !status.includes(crStatus)
                                    return <Form.Item name={[row.name, 'artifact']}>
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
                                    const tableData = form.getFieldValue('heightenSignoff')
                                    const rowData = tableData[row.name] || {}
                                    const approver = rowData.signOffUser?.[0]?.userId
                                    let userInfo = localStorage.getItem('dosm_loginInfo')
                                    userInfo = JSON.parse(userInfo)
                                    const currentUser = userInfo.user.userId
                                    const showSend = () => {
                                        return crStatus &&
                                            (rowData.status === 'WAITSEND') &&
                                            rowData.signOffType &&
                                            (rowData.signOffUserGroup && rowData.signOffUserGroup?.length > 0) &&
                                            (rowData.signOffUser && rowData.signOffUser?.length > 0) &&
                                            (currentUser == orderInfo.createdBy || isSameUserGroup())
                                    }
                                    return <Space>
                                        {
                                            rowData.status === 'PENDING' && currentUser == approver &&
                                            <Button type="primary" onClick={() => approval(row.name)}>Approve</Button>
                                        }
                                        {
                                            rowData.status === 'PENDING' && currentUser == approver &&
                                            <Button type="danger" ghost onClick={() => reject(row.name)}>Reject</Button>
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
        </Form>
    </div>
}
export default observer(Signoff);
