import React, { useEffect, useRef, useState } from "react";
import { CWTable, Form4 as Form, Space, Modal, Checkbox, Input } from '@chaoswise/ui'
import projectCutoverSignoffStore from './store';
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
import { SIGNOFF_GROUP } from "../constants";
import { helper } from '@/utils/T';
import Button from '../components/TableButton'

import { formily } from '@chaoswise/ui/formily';
import { formatFormValues } from '@/pages/Reception/common/fieldUtils';
import { eventManager } from '@/utils/T/core/helper';
import { fieldValueChangeToValidateFields, getGroupDefaultValue, saveWorkOrder } from '../util';
const { useFormEffects, LifeCycleTypes } = formily;
const Signoff = (props) => {

    const { formActions, schema, baseActions, orderContainerID, initData, registerOnChildFormSubmit, registerOnFormValuesChange, registerOnOrderCreateSuccess, styleDisplay } = props
    const orderInfo = initData
    const [tableLoading, setTableLoading] = useState(false)
    const [form] = Form.useForm();
    const { formData, updateState, signoffTypeOptions, setSignoffTypeOptions } = projectCutoverSignoffStore
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
                if(editableStatus.includes(crStatus) && !formDisabled()){
            $(LifeCycleTypes.ON_FORM_VALUES_CHANGE).subscribe((formState) => {
                if(!formState.mounted) return
                // getbaseValues有滞后性😭，setTimeout一下，不然拿的还是上一次的_value
                setTimeout(() => {
                    const baseValues = baseActions.getBaseValue()
                    const _values = formatFormValues(schema, formState.values)
                    const finilyValues = { ...(baseValues || {}), ...(_values || {}) }
                    const tableData = form.getFieldValue('projectCutoverSignoff')
                    if (initedRef.current) {
                        updateState({formData: finilyValues})
                        console.log('projectCutoverSignoff-value-change');
                        fieldChange(finilyValues, tableData)
                    }
                },60)
            });
        }
    });
    useEffect(() => {
        setSignoffTypeOptions([
            { label: 'CUS Signoff', value: 'CUS Signoff' },
            { label: 'HA & DR Flip Signoff', value: 'HA & DR Flip Signoff' },
            { label: 'Data Center OPS (Batch) Signoff', value: 'Data Center OPS (Batch) Signoff' },
            { label: 'BU/Application Owner Signoff', value: 'BU/Application Owner Signoff' },
            { label: 'Impact To Mainframe Signoff', value: 'Impact To Mainframe Signoff' },
            { label: 'Design For Data (D4D) Signoff', value: 'Design For Data (D4D) Signoff' },
            { label: 'MD Delegate Signoff', value: 'MD Delegate Signoff' },
        ])
        if (initData) {
            onFormMount(initData)
        }
    }, [])

    useEffect(() => {
        registerOnChildFormSubmit && registerOnChildFormSubmit(onFormSubmit)
        registerOnOrderCreateSuccess && registerOnOrderCreateSuccess(onOrderCreateSuccess)
    })
    // if field was hihhen, means user not do projectCutoverSignoff, then we delete all data
    useEffect(() => {
        if(styleDisplay == 'none' && editableStatus.includes(crStatus) && !formDisabled()){
            // hide order sider anchor
            let tableData = form.getFieldValue('projectCutoverSignoff') || []
            const deleteRows = tableData.filter(item => !!item.id).map(item => item.id)
            if(deleteRows.length > 0){
                signoffDeleteBatch(deleteRows, orderInfo.workOrderId).then(() => {
                    getSignoffs()
                })
            }
        }
    },[styleDisplay])
    // Form changes will reset signoff approval status
    const shouldResetSignoff = (index, key, val) => {
        let tableData = form.getFieldValue('projectCutoverSignoff')
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
    const judgeSameGroup = (a, b) => {
        return a?.[0]?.groupId == b?.[0]?.groupId
    }
    // These fields will affect the changes of signoff type dropdown options and values
    // signoffTypes are testing signoff types, used to correspond with form field codes
    const { signoffTypes, skipSignoffType } = window.DOSM_CUSTOM_DBS.signoff.projectCutoverSignoff
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
            rejectionReason: undefined,
        }
        return rowData
    }

    const fieldChange = helper.debounce((formData = {}, _tableData, _orderInfo, onlyUpdateOptions) => {
        const flatSchema = getFlatSchema(_orderInfo?.schema || orderInfo?.schema)
        let tableData = JSON.parse(JSON.stringify(_tableData || []))
        let newRows = []
        let deleteRows = []
        let updateRow = {}
        // Handle other signoff types
        signoffTypes.forEach(signoffType => {
            if (flatSchema[signoffType.formKey]) {
                const { key } = flatSchema[signoffType.formKey]
                const name = key
                const title = signoffType.signoffType
                let formValue = formData?.[name];
                let _value = signoffType.formKey + '_value'
                let hasMatchingCondition = signoffType.conditionValue.includes(formValue)
                // if (signoffType.signoffType == 'BU/Application Owner Signoff') {
                //     formValue = formData[key]
                //     hasMatchingCondition = !!(formData[key]?.length > 0)
                // }
                // if (signoffType.signoffType == 'MD Delegate Signoff') {
                //     hasMatchingCondition = !!formValue
                // }
                if (formValue && hasMatchingCondition && !tableHasFormData('signOffType', title, tableData)) {
                    let row = newRow(title)
                    row.signOffUserGroup = getGroupDefaultValue([title], formData)
                    // if (signoffType.signoffType == 'BU/Application Owner Signoff') {
                    //     row = {
                    //         ...row,
                    //         signOffUser: formValue,
                    //         signOffUserGroup: formValue?.map(i => ({ groupId: i.groupId, groupName: i.groupName }))
                    //     }
                    // }
                    console.log(`projectCutoverSignoff-${title} 条件满足 新值:${formData[_value]} 旧值:${formDataRef.current[_value]}`);
                    tableData.push(row)
                    newRows.push(row)
                }
                // if (tableHasFormData('signOffType', title, tableData) && signoffType.signoffType == 'BU/Application Owner Signoff') {
                //     let index = tableData.findIndex(item => (item.signOffType && (item.signOffType[0] == signoffType.signoffType)))
                //     if (index > -1) {
                //         tableData[index].signOffUser = formValue
                //     }
                // }
                // Check if the form data does not match the signoff condition value and if the table data already has a row with the same signoff type
                if (!hasMatchingCondition && tableHasFormData('signOffType', title, tableData)) {
                    const index = tableData.findIndex(item => arrayIsEqual(item.signOffType, [title]))
                    if (index > -1) {
                        console.log(`projectCutoverSignoff-${title} 条件不满足 新值:${formData[_value]} 旧值:${formDataRef.current[_value]}`);
                        let deleteRow = tableData.splice(index, 1)
                        deleteRows = deleteRows.concat(deleteRow.filter(i => i.id))
                    }
                }

                // if (formValue && hasMatchingCondition && tableHasFormData('signOffType', signoffType.signoffType, tableData)) {
                //     // When signOffType is MD Delegate Signoff, the group value is the group selected in MDDelegateSignOff
                //     let groupValue = []
                //     let userValue = []
                //     if (signoffType.signoffType == 'MD Delegate Signoff') {
                //         if (formValue && formValue != '03c1df481bec4849b7ab287336429b05') {
                //             groupValue = [{ groupId: formValue, groupName: formData?.[name+'_value'] }]
                //             userValue = []
                //         } else {
                //             groupValue = [{ groupId: '', groupName: 'Approver Same as CR MD Approver' }]
                //             userValue = [{ userId: 'Approver Same as CR MD Approver', userName: 'Approver Same as CR MD Approver' }]
                //         }
                //         const index = tableData.findIndex(item => arrayIsEqual(item.signOffType, [signoffType.signoffType]))
                //         const isSameGroup = judgeSameGroup(tableData[index]?.signOffUserGroup, groupValue)
                //         if (index > -1 && !isSameGroup) {
                //             updateRow = { ...tableData[index], signOffUserGroup: groupValue, signOffUser: userValue }
                //             tableData.splice(index, 1, updateRow)
                //         }
                //         const _index = newRows.findIndex(item => arrayIsEqual(item.signOffType, [signoffType.signoffType]))
                //         if (_index > -1 && !isSameGroup) {
                //             newRows.splice(_index, 1, updateRow)
                //         }
                //     }
                // }
            }
        })
        if (!onlyUpdateOptions && !arrayIsEqual(_tableData, tableData)) {
            if (formData.crStatus || crStatus) {
                if (deleteRows.length > 0) {
                    signoffDeleteBatch(deleteRows.map(item => item.id), orderInfo.workOrderId).finally(() => {
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
                            signOffGroup: SIGNOFF_GROUP.PROCUTOVER_SIGNOFF,
                            topAccountId,
                            accountId,
                            workOrderId: orderInfo.workOrderId
                        }
                    })).then(() => {
                        getSignoffs()
                    }).catch(() => {
                        getSignoffs()
                    })
                }
                if (updateRow.id) {
                    signoffUpdate({
                        ...updateRow,
                        signOffUserGroup: JSON.stringify(updateRow.signOffUserGroup),
                        signOffUser: JSON.stringify(updateRow.signOffUser),
                        artifact: JSON.stringify(updateRow.artifact),
                        signOffType: JSON.stringify(updateRow.signOffType),
                    }).then(res => {
                        getSignoffs()
                    }).catch(() => {
                        getSignoffs()
                    })
                }
            } else {
                setTimeout(() => {
                    form.setFieldValue('projectCutoverSignoff', tableData)
                }, 60)
            }
        }
        formDataRef.current = formData
    }, 300)

    const onFormSubmit = () => {
        return new Promise((resolve, reject) => {
            form.validateFields()
                .then(values => { resolve({ values }) })
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
                        [SIGNOFF_GROUP.PROCUTOVER_SIGNOFF]: error
                    })
                })
        })
    }
    const onOrderCreateSuccess = (workOrderId) => {
        // Insert data when crStatus is new
        if (!crStatus) {
            let tableData = form.getFieldValue('projectCutoverSignoff') || []
            const params = tableData.map(item => {
                return {
                    ...item,
                    signOffUserGroup: JSON.stringify(item.signOffUserGroup),
                    signOffUser: JSON.stringify(item.signOffUser),
                    artifact: JSON.stringify(item.artifact),
                    signOffType: JSON.stringify(item.signOffType),
                    signOffGroup: SIGNOFF_GROUP.PROCUTOVER_SIGNOFF,
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
        }
        if (!crStatus && !initedRef.current) {
            const tableData = form.getFieldValue('projectCutoverSignoff')
            formActions.getFormState(formState => {
                const _values = formatFormValues(schema, formState.values)
                fieldChange(_values, tableData, orderInfo)
            })
            initedRef.current = true
        }
    }

    const onValuesChange = (index, key, val) => {
        let tableData = form.getFieldValue('projectCutoverSignoff')
        const rowData = tableData[index]
        let updateFlag = false
        if(key == 'signOffUserGroup' && val?.[0]?.groupName == 'Approver Same as CR MD Approver'){
            rowData.signOffUser = [{ userId: 'Approver Same as CR MD Approver', userName: 'Approver Same as CR MD Approver' }]
            updateFlag = true
        }
        if (crStatus) {
            signoffUpdate({
                ...rowData,
                signOffUserGroup: JSON.stringify(rowData.signOffUserGroup),
                signOffUser: JSON.stringify(rowData.signOffUser) || "[]",
                artifact: JSON.stringify(rowData.artifact),
                signOffType: JSON.stringify(rowData.signOffType),
            }).then(res => {
                // when CUS Signoff update the atrefact, set status to approved
                if (crStatus && key === 'artifact' && rowData.signOffType.includes('CUS Signoff')) {
                    let status = 'APPROVED'
                    if((Array.isArray(rowData.artifact) && rowData.artifact.length == 0) || !rowData.artifact){
                        status = 'WAITSEND'
                    }
                    signoffStatus({ signOffId: rowData.id, status: status, workOrderId: rowData.workOrderId }).then(res => {
                        getSignoffs()
                    }).catch(err => {
                        window.prompt.error(err.msg)
                    })
                } else {
                    // Field value change, reset signoff task if necessary
                    if (shouldResetSignoff(index, key, val)) {
                        signoffStatus({ signOffId: rowData.id, status: 'WAITSEND', workOrderId: rowData.workOrderId }).then(res => {
                            getSignoffs()
                        }).catch(err => {
                            window.prompt.error(err.msg)
                        })
                    } else {
                        getSignoffs()
                    }
                }
            }).catch(() => {
                getSignoffs()
            })
        }else{
            if(updateFlag){
                form.setFieldValue('projectCutoverSignoff', tableData)
            }
        }
    }
    // Send email
    const sendEmail = (rowNum) => {
        let tableData = form.getFieldValue('projectCutoverSignoff')
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
                saveWorkOrder(orderContainerID)
                getSignoffs()
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
                    saveWorkOrder(orderContainerID)
                    getSignoffs()
                }).catch(err => {
                    window.prompt.error(err.msg)
                })
            },
        })
    }
    // Approve
    const approval = (rowNum) => {
        let tableData = form.getFieldValue('projectCutoverSignoff')
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
        let tableData = form.getFieldValue('projectCutoverSignoff')
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
    // Get all signoff information for the current work order, filter projectCutoverSignoff
    const getSignoffs = (workOrderId) => {
        const orderId = orderInfo.workOrderId || workOrderId
        if (!orderId) {
            return new Promise((resolve, reject) => { resolve('') })
        }
        setTableLoading(true)
        return new Promise((resolve, reject) => {
            getSignOffListByWorkOrderId({ workOrderId: orderId, signOffGroup: SIGNOFF_GROUP.PROCUTOVER_SIGNOFF }).then(res => {
                res = res?.data?.map(item => {
                    return {
                        ...item,
                        signOffUserGroup: JSON.parse(item.signOffUserGroup),
                        signOffUser: JSON.parse(item.signOffUser),
                        artifact: JSON.parse(item.artifact),
                        signOffType: JSON.parse(item.signOffType),
                    }
                })
                const projectCutoverSignoffData = res?.filter(i => i.signOffGroup === SIGNOFF_GROUP.PROCUTOVER_SIGNOFF)
                form.setFieldValue('projectCutoverSignoff', projectCutoverSignoffData)
                resolve(projectCutoverSignoffData)
                setTableLoading(false)
            }).catch(err => {
                resolve([])
                setTableLoading(false)
            })
        })
    }
    
    const isRestrictedSignoffType = (signOffType) => {
        return skipSignoffType?.includes(signOffType?.[0]);
    }

    const isRowRestricted = (row) => {
        const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
        return isRestrictedSignoffType(rowData?.signOffType);
    }
    const getErrorTips = (index) => {
        const tableData = form.getFieldValue('projectCutoverSignoff') || []
        const rowData = tableData[index] || {}
        const status = rowData.status
        if(crStatus == 'Open' && status != 'APPROVED'){
            return {
                showStatus: !isRowRestricted({name: index}),
                showError: true,
                errorText: 'Required before CR is fully approved'
            }
        }else{
            return {
                showStatus: !isRowRestricted({name: index}),
                showError: false,
                errorText: ''
            }
        }
    }
    return <div className="projectCutoverSignoff" ref={containerRef}>
        <Form form={form} name="signoff" onValuesChange={() => {fieldValueChangeToValidateFields(form, containerRef, SIGNOFF_GROUP.PROCUTOVER_SIGNOFF)}}>
            <Form.List name="projectCutoverSignoff">
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
                                title: <span><span style={{ color: '#f5222d' }}>*</span>Signoff Type</span>,
                                key: 'signoffType',
                                index: 'signoffType',
                                width: '320px',
                                render(text, row) {
                                    return <Form.Item name={[row.name, 'signOffType']}>
                                        <SignOffType row={row} disabled={true} signoffTypeOptions={signoffTypeOptions} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{ color: '#f5222d' }}>*</span>Group</span>,
                                key: 'Group',
                                index: 'Group',
                                width: '350px',
                                render(text, row) {
                                    if (isRowRestricted(row)) {
                                        return null;
                                    }
                                    const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
                                    const { signOffType, signOffUserGroup } = rowData
                                    const status = ['', null, undefined, 'New', 'Reopen', 'Open']
                                    const types = ['Impact To Mainframe Signoff', 'HA & DR Flip Signoff', 'Design For Data (D4D) Signoff', 'Data Center OPS (Batch) Signoff', 'MD Delegate Signoff', 'BU/Application Owner Signoff']
                                    let disabled = true
                                    console.log('signOffType', signOffType);
                                    if(signOffType?.[0] == 'MD Delegate Signoff'){
                                        disabled = formDisabled() || !status.includes(crStatus)
                                    }
                                    return <Form.Item name={[row.name, 'signOffUserGroup']} rules={[{ required: true, message: 'Please select Group' }]}>
                                        <SignOffUserGroup
                                            type="projectCutover"
                                            row={row}
                                            disabled={disabled}
                                            selectWidth="330px"
                                        />
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
                                width: '300px',
                                render(text, row) {
                                    if (isRowRestricted(row)) {
                                        return null;
                                    }
                                    const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
                                    const { signOffUserGroup, signOffType } = rowData
                                    const status = ['', null, undefined, 'New', 'Reopen']
                                    const types = ['Impact To Mainframe Signoff', 'HA & DR Flip Signoff', 'Design For Data (D4D) Signoff', 'Data Center OPS (Batch) Signoff', 'MD Delegate Signoff', 'BU/Application Owner Signoff']
                                    let disabled = !status.includes(crStatus)
                                    let rules = [{ required: true, message: 'Please select User' }]
                                    if (crStatus == 'Open' && types.includes(signOffType?.[0])) {
                                        disabled = false
                                    }
                                    if (signOffUserGroup?.[0]?.groupName === 'Approver Same as CR MD Approver') {
                                        disabled = true
                                    }
                                    if(status.includes(crStatus)){
                                        rules = []
                                    }
                                    // if (signOffType?.[0] == 'BU/Application Owner Signoff') {
                                    //     disabled = true
                                    // }
                                    return <Form.Item name={[row.name, 'signOffUser']} rules={rules}>
                                        <SignOffUser
                                            type="projectCutover"
                                            row={row}
                                            disabled={formDisabled() || disabled}
                                            selectWidth="283px"
                                        />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{ color: '#f5222d' }}></span>Artefact</span>,
                                key: 'artifact',
                                width: '200px',
                                index: 'artifact',
                                render(text, row) {
                                    const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
                                    const requiredTypes = ['CUS Signoff']
                                    let rule = []
                                    if (requiredTypes.includes(rowData.signOffType?.[0])) {
                                        if(crStatus == 'Open'){
                                            rule = [{ required: true, message: 'Please upload artefact' }]
                                        }
                                    } else {
                                        rule = []
                                        return null
                                    }
                                    const status = ['', null, undefined, 'New', 'Reopen', 'Open']
                                    const disabled = !status.includes(crStatus)
                                    return <Form.Item name={[row.name, 'artifact']} rules={rule}>
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
                                    const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
                                    const { signOffUserGroup } = rowData
                                    const isRestricted = isRowRestricted(row);
                                    const approver = rowData.signOffUser?.[0]?.userId
                                    let userInfo = localStorage.getItem('dosm_loginInfo')
                                    userInfo = JSON.parse(userInfo)
                                    const currentUser = userInfo.user.userId
                                    let disabled = false
                                    const showSend = () => {
                                        let show = crStatus &&
                                            (rowData.status === 'WAITSEND') &&
                                            rowData.signOffType &&
                                            (rowData.signOffUserGroup && rowData.signOffUserGroup?.length > 0) &&
                                            (rowData.signOffUser && rowData.signOffUser?.length > 0) &&
                                            (currentUser == orderInfo.createdBy || isSameUserGroup())
                                        return show
                                    }
                                    // MD Delegate Signoff groupName is Approver Same as CR MD Approver, disabled send button
                                    if (signOffUserGroup?.[0]?.groupName === 'Approver Same as CR MD Approver') {
                                        disabled = true
                                    }
                                    return <Space>
                                        {
                                            rowData.status === 'PENDING' && currentUser == approver && crStatus &&
                                            <Button
                                                type="primary"
                                                onClick={() => approval(row.name)}
                                                disabled={isRestricted || !rowData?.signOffUser}
                                            >
                                                Approve
                                            </Button>
                                        }
                                        {
                                            rowData.status === 'PENDING' && currentUser == approver &&
                                            <Button
                                                danger
                                                onClick={() => reject(row.name)}
                                                disabled={isRestricted || !rowData?.signOffUser}
                                            >
                                                Reject
                                            </Button>
                                        }
                                        {
                                            showSend() &&
                                            <Button
                                                type="primary"
                                                onClick={() => sendEmail(row.name)}
                                                disabled={disabled}
                                            >
                                                Send
                                            </Button>
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
