import React, { useEffect, useRef, useState } from "react";
import {CWTable, Form4 as Form, Space, Button, Modal, Checkbox, Input} from '@chaoswise/ui'
import projectCutoverSignoffStore from './store';
import { observer } from '@chaoswise/cw-mobx';
import Status from '../TestingSignoff/components/Status';
import SignOffType from '../TestingSignoff/components/SignoffType';
import RejectionReason from '../TestingSignoff/components/RejectionReason';
import SignOffUserGroup from '../components/Group'
import SignOffUser from '../TestingSignoff/components/User'
import Artefact from '../TestingSignoff/components/Artefact'
import uniqBy from 'lodash-es/uniqBy'
import {signoffUpdate, signoffApproved, signoffRejected, signoffSendEmail, getSignOffListByWorkOrderId, signoffStatus, signoffInsertBatch, signoffDeleteBatch} from '../api'
import { getFlatSchema } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/FormEngine/FormRender/util/handleSchema';
import { SIGNOFF_GROUP } from "../constants";
import { helper } from '@/utils/T';
const Signoff = (props) => {

    const { initData, registerOnChildFormSubmit, registerOnFormValuesChange, registerOnOrderCreateSuccess } = props

    const [tableLoading, setTableLoading] = useState(false)
    const [form] = Form.useForm();
    const {formData, updateState, orderInfo, signoffTypeOptions, setSignoffTypeOptions} = projectCutoverSignoffStore
    const crStatus = formData?.crStatus_value || orderInfo?.formData?.crStatus_value
    const containerRef = useRef()
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

    // Form changes will reset signoff approval status
    const shouldResetSignoff = (index, key, val) => {
        const tableData = form.getFieldValue('projectCutoverSignoff')
        const rowData = tableData[index]
        // When crStatus is new, changing user field
        // When crStatus is new, changing artefact field
        if(crStatus && rowData.status != 'WAITSEND'){
            if(key === 'signOffUser' && val){
                return true
            }
            if(key === 'artifact' && val){
                return true
            }
            if (key === 'signOffUserGroup' && val) {
                return true
            }
        }
        return false
    }
    const arrayIsEqual = (arr1, arr2) => {
        if(!Array.isArray(arr1) || !Array.isArray(arr2)) return false
        return JSON.stringify(arr1) == JSON.stringify(arr2)
    }
    // These fields will affect the changes of signoff type dropdown options and values
    // signoffTypes are testing signoff types, used to correspond with form field codes
    const {signoffTypes, skipSignoffType} = window.DOSM_CUSTOM_DBS.signoff.projectCutoverSignoff
    const tableHasFormData = (key, value, tableData) => {
        return !!tableData.find(item => item[key]?.includes(value))
    }
    const newRow = (signoffTypeValue)=> {
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
        let _signoffTypeOptions = JSON.parse(JSON.stringify(signoffTypeOptions))
        let tableData = JSON.parse(JSON.stringify(_tableData || []))
        let newRows = []
        let deleteRows = []
        let updateRow = {}
        console.log('formData?.changeGroup_value', formData);

        // Handle other signoff types
        signoffTypes.forEach(signoffType => {
            if(flatSchema[signoffType.formKey]){
                const {key} = flatSchema[signoffType.formKey]
                const name = key
                const title = signoffType.signoffType
                let formValue = formData?.[name];                
                let hasMatchingCondition = signoffType.conditionValue.includes(formValue)                
                if(signoffType.signoffType == 'BU/Application Owner Signoff'){
                    formValue = formData[key]
                    hasMatchingCondition = !!(formData[key]?.length > 0)
                }
                if(formValue && hasMatchingCondition && !tableHasFormData('signOffType', title, tableData)){
                    let row = newRow(title)
                    if(signoffType.signoffType == 'BU/Application Owner Signoff'){
                        row = {
                            ...row,
                            signOffUser: formValue,
                            signOffUserGroup: formValue?.map(i => ({groupId: i.groupId, groupName: i.groupName}))
                        }
                    }
                    tableData.push(row)
                    newRows.push(row)
                    _signoffTypeOptions.push({label: title, value: title})
                }
                if(tableHasFormData('signOffType', title, tableData) && signoffType.signoffType == 'BU/Application Owner Signoff'){
                    let index = tableData.findIndex(item => (item.signOffType && (item.signOffType[0] == signoffType.signoffType)))
                    if(index > -1) tableData[index].signOffUser = formValue
                }
                // Check if the form data does not match the signoff condition value and if the table data already has a row with the same signoff type
                if(!hasMatchingCondition && tableHasFormData('signOffType', title, tableData)){
                    const index = tableData.findIndex(item => arrayIsEqual(item.signOffType, [title]))
                    if(index > -1) {
                        let deleteRow = tableData.splice(index, 1)
                        deleteRows = deleteRows.concat(deleteRow.filter(i => i.id))
                    }
                    const _index = _signoffTypeOptions.findIndex(i => i.value === title)
                    if(_index > -1) _signoffTypeOptions.splice(_index, 1);
                }


                if(formValue && hasMatchingCondition && tableHasFormData('signOffType', signoffType.signoffType, tableData)){
                    // When signOffType is MD Delegate Signoff, the group value is the group selected in MDDelegateSignOff
                    let groupValue = []
                    let userValue = []
                    if(signoffType.signoffType == 'MD Delegate Signoff'){
                        const {MDDelegateGroups} = window.DOSM_CUSTOM_DBS.signoff?.projectCutoverSignoff
                        let groupId =  MDDelegateGroups.find(item => item.groupName == formValue)?.groupId
                        if(formValue && formValue != '03c1df481bec4849b7ab287336429b05' && groupId){
                            groupValue = [{groupId: groupId, groupName: formValue}]
                            userValue = []
                        }else{
                            groupValue = [{groupId: '', groupName: 'Approver Same as CR MD Approver'}]
                            userValue = [{userId: 'Approver Same as CR MD Approver', userName: 'Approver Same as CR MD Approver'}]
                        }
                        const index = tableData.findIndex(item => arrayIsEqual(item.signOffType, [signoffType.signoffType]))
                        updateRow = {...tableData[index], signOffUserGroup: groupValue, signOffUser: userValue}
                        tableData.splice(index, 1, updateRow)

                        const _index = newRows.findIndex(item => arrayIsEqual(item.signOffType, [signoffType.signoffType]))
                        newRows.splice(_index, 1, updateRow)
                    }
                }
            }
        })        
        if(!onlyUpdateOptions && !arrayIsEqual(_tableData, tableData)){
            if(formData.crStatus || crStatus){
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
                            signOffGroup: SIGNOFF_GROUP.PROCUTOVER_SIGNOFF,
                            topAccountId,
                            accountId,
                            workOrderId: orderInfo.workOrderId
                        }
                    })).then(() => {
                        getSignoffs()
                    })
                }
                if(updateRow.id){
                    signoffUpdate({
                        ...updateRow,
                        signOffUserGroup: JSON.stringify(updateRow.signOffUserGroup),
                        signOffUser: JSON.stringify(updateRow.signOffUser),
                        artifact: JSON.stringify(updateRow.artifact),
                        signOffType: JSON.stringify(updateRow.signOffType),
                    }).then(res => {
                        getSignoffs()
                    })
                }
            }else{
                setTimeout(() => {
                    form.setFieldValue('projectCutoverSignoff', tableData)
                },60)
            }
        }
    },300)

    const onFormSubmit = () => {
        return new Promise((resolve, reject) => {
            form.validateFields().then(values => {resolve({ values })}).catch(errors =>{
                // Form validation failed, send message to parent form
                window.parent.postMessage({ eventType: 'onChildFormValidateError', errors: errors.errorFields }, '*')
                // Form validation failed, scroll to the first error element
                document.querySelector('.ant-form-item-explain-error').scrollIntoView({ behavior: 'smooth' })
                //! Note error format
                // const error = [] 
                const error = errors.errorFields.map(item => {
                    return {
                        name: item.name,
                        messages: item.errors
                    }
                })
                return reject(error)
            })
        })
    }
    const onOrderCreateSuccess = (workOrderId) => {
        // Insert data when crStatus is new
        if(!crStatus){
            const tableData = form.getFieldValue('projectCutoverSignoff')
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
            signoffInsertBatch(params)
        }
    }
    const onFormMount = (orderInfo) => {
        const projectCutoverSignoff = form.getFieldValue('projectCutoverSignoff')
        updateState({orderInfo})
        fieldChange(orderInfo?.formData || {}, projectCutoverSignoff, orderInfo, true)
        if(orderInfo.formData?.crStatus && !initedRef.current){
            getSignoffs(orderInfo.formData, orderInfo.workOrderId)
            initedRef.current = true
        }
    }
    const onFormValuesChange = (formValues) => {
        const projectCutoverSignoff = form.getFieldValue('projectCutoverSignoff')
        fieldChange(formValues, projectCutoverSignoff)
        updateState({formData: formValues})
    }

    const handleMessage = (event) => {
        const {data} = event
        switch (data.eventType) {
            // Form initialization
            case 'onFormMount':
                onFormMount(data.orderInfo)
                break;
            // Form field change
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
    }
    const onValuesChange = (index, key, val) => {
        const tableData = form.getFieldValue('projectCutoverSignoff')
        const rowData = tableData[index]
        if(crStatus){
            signoffUpdate({
                ...rowData, 
                signOffUserGroup: JSON.stringify(rowData.signOffUserGroup),
                signOffUser: JSON.stringify(rowData.signOffUser) || "[]",
                artifact: JSON.stringify(rowData.artifact),
                signOffType: JSON.stringify(rowData.signOffType),
            }).then(res => {
                // when CUS Signoff update the atrefact, set status to approved
                if(crStatus && key === 'artifact' && rowData.signOffType.includes('CUS Signoff')){
                    signoffStatus({signOffId: rowData.id, status: 'APPROVED'}).then(res => {
                        getSignoffs()
                    }).catch(err => {
                        window.prompt.error(err.msg)
                    })
                }else{
                    // Field value change, reset signoff task if necessary
                    if(shouldResetSignoff(index, key, val)){
                        signoffStatus({signOffId: rowData.id, status: 'WAITSEND'}).then(res => {
                            getSignoffs()
                        }).catch(err => {
                            window.prompt.error(err.msg)
                        })
                    }else{
                        getSignoffs()
                    }
                }
            })
        }
    }
    // Send email
    const sendEmail = (rowNum) => {
        const tableData = form.getFieldValue('projectCutoverSignoff')
        const rowData = tableData[rowNum]
        let clickable = false
        const onChange = (e) => {
            clickable = e.target.checked
            if(e.target.checked){
                window.parent.sendEmail_button.removeAttribute('disabled')
            }else{
                window.parent.sendEmail_button.setAttribute('disabled', true)
            }
        }
        setTimeout(() => {
            window.parent.sendEmail_button.setAttribute('disabled', true)
        },60)
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
            title: 'Delarrtion',
            content: <span><Checkbox onChange={onChange} style={{marginRight: 10}} />I am fully responsible & accountable for all the artefacts uploaded and attest that it does not contain any customer, sensitive, or Pll data.</span>,
            okButtonProps: {id: 'sendEmail_button'},
            getContainer(){
                const {inIframe} = window.DOSM_CUSTOM_DBS.signoff
                if(inIframe){
                    return window.parent?.document?.body
                }else{
                    return document.body
                }
            },
            onOk(){
                return signoffSendEmail({signOffId: rowData.id}).then(res => {
                    window.prompt.success('Successfully send')
                    getSignoffs()
                }).catch(err => {
                    window.prompt.error(err.msg)
                })
            },
        })
    }
    // Approve
    const approval = (rowNum) => {
        const tableData = form.getFieldValue('projectCutoverSignoff')
        const rowData = tableData[rowNum]
        signoffApproved({signOffId: rowData.id}).then(res => {
            window.prompt.success('Approved')
            getSignoffs()
        }).catch(err => {
            window.prompt.error(err.msg)
        })
    }
    // Reject
    const reject = (rowNum) => {
        const tableData = form.getFieldValue('projectCutoverSignoff')
        const rowData = tableData[rowNum]
        let rejectionReason = ''
        const onChange = (e) => {
            rejectionReason = e.target.value
        }
        Modal.confirm({
            title: 'Rejection Reason',
            icon: null,
            content: <div><Input.TextArea onChange={onChange} /></div>,
            getContainer(){
                const {inIframe} = window.DOSM_CUSTOM_DBS.signoff
                if(inIframe){
                    return window.parent?.document?.body
                }else{
                    return document.body
                }
            },
            onOk(){
                return signoffRejected({signOffId: rowData.id, rejectionReason: rejectionReason}).then(res => {
                    window.prompt.success('Rejected')
                    getSignoffs()
                }).catch(err => {
                    window.prompt.error(err.msg)
                })      
            },
        })
    }
    useEffect(() => {
        window.parent.postMessage({
            eventType: 'onChildFormInit',
            height: containerRef.current.clientHeight
        }, '*');
        // Initialize global variables
        window.formActions = {
            submit: onFormSubmit,
            // When the child form is hidden in the parent form, we need to get the child form values when submitting the parent form
            getFieldsValue: () => {
                return Promise.resolve({
                    values: form.getFieldsValue()
                })
            }
        }
    },[])
    // Message
    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    },[orderInfo, signoffTypeOptions, crStatus])
    // Get all signoff information for the current work order, filter projectCutoverSignoff
    const getSignoffs = (formData, workOrderId) => {
        setTableLoading(true)
        const orderId = orderInfo.workOrderId || workOrderId
        const status = crStatus || formData?.crStatus_value
        getSignOffListByWorkOrderId({workOrderId: orderId, signOffGroup: SIGNOFF_GROUP.PROCUTOVER_SIGNOFF}).then(res => {
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
            let typeOptions = []
            projectCutoverSignoffData.forEach(i => {
                typeOptions = typeOptions.concat(i.signOffType || [])
            })            
            setTableLoading(false)
        }).catch(err => {
            setTableLoading(false)
        })
    }

    const formDisabled = () => {
        if(orderInfo.createdBy){
            let userInfo = localStorage.getItem('dosm_loginInfo')
            userInfo = JSON.parse(userInfo)
            if(userInfo.user.userId == orderInfo.createdBy){
                return false
            }else{
                return true
            }
        }else{
            return false
        }
    }

    const isRestrictedSignoffType = (signOffType) => {
        return skipSignoffType?.includes(signOffType?.[0]);
    }

    const isRowRestricted = (row) => {
        const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
        return isRestrictedSignoffType(rowData?.signOffType);
    }

    useEffect(() => {
        setSignoffTypeOptions([
            {label: 'CUS Signoff', value: 'CUS Signoff'},
            {label: 'HA & DR Flip Signoff', value: 'HA & DR Flip Signoff'},
            {label: 'Data Center OPS (Batch) Signoff', value: 'Data Center OPS (Batch) Signoff'},
            {label: 'BU/Application Owner Signoff', value: 'BU/Application Owner Signoff'},
            {label: 'Impact To Mainframe Signoff', value: 'Impact To Mainframe Signoff'},
            {label: 'Design For Data (D4D) Signoff', value: 'Design For Data (D4D) Signoff'},
            {label: 'MD Delegate Signoff', value: 'MD Delegate Signoff'},
        ])
    },[])
    return <div className="projectCutoverSignoff" ref={containerRef}>
        <Form form={form} name="signoff">
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
                                render(text, row){
                                    if (isRowRestricted(row)) {
                                        return null;
                                    }
                                    return <Form.Item name={[row.name, 'status']}>
                                        <Status row={row} disabled={formDisabled()} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{color: '#f5222d'}}>*</span>Signoff Type</span>,
                                key: 'signoffType',
                                index: 'signoffType',
                                width: '300px',
                                render(text, row){
                                    return <Form.Item name={[row.name, 'signOffType']}>
                                        <SignOffType row={row} disabled={true} signoffTypeOptions={signoffTypeOptions} />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{color: '#f5222d'}}>*</span>Group</span>,
                                key: 'Group',
                                index: 'Group',
                                width: '200px',
                                render(text, row){
                                    if (isRowRestricted(row)) {
                                        return null;
                                    }
                                    const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
                                    const {signOffType, signOffUserGroup} = rowData
                                    if(signOffUserGroup?.[0]?.groupName === 'Approver Same as CR MD Approver'){
                                        return null
                                    }
                                    const status = ['', null, undefined, 'New', 'Reopen']
                                    const types = ['Impact To Mainframe Signoff', 'HA & DR Flip Signoff', 'Design For Data (D4D) Signoff', 'Data Center OPS (Batch) Signoff','MD Delegate Signoff','BU/Application Owner Signoff']
                                    let disabled = !status.includes(crStatus)
                                    if(crStatus == 'Open' && types.includes(signOffType?.[0])){
                                        disabled = false
                                    }
                                    return <Form.Item name={[row.name, 'signOffUserGroup']} rules={[{ required: true, message: 'Please select Group' }]}>
                                        <SignOffUserGroup 
                                            type="projectCutover" 
                                            row={row} 
                                            disabled={formDisabled() || disabled} 
                                        />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{color: '#f5222d'}}>*</span>Signer</span>,
                                key: 'User',
                                index: 'User',
                                width: '200px',
                                render(text, row){
                                    if (isRowRestricted(row)) {
                                        return null;
                                    }
                                    const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
                                    const {signOffUserGroup, signOffType} = rowData
                                    const status = ['', null, undefined, 'New', 'Reopen']
                                    const types = ['Impact To Mainframe Signoff', 'HA & DR Flip Signoff', 'Design For Data (D4D) Signoff', 'Data Center OPS (Batch) Signoff','MD Delegate Signoff','BU/Application Owner Signoff']
                                    let disabled = !status.includes(crStatus)
                                    if(crStatus == 'Open' && types.includes(signOffType?.[0])){
                                        disabled = false
                                    }
                                    if(signOffUserGroup?.[0]?.groupName === 'Approver Same as CR MD Approver'){
                                        disabled = true
                                    }
                                    return <Form.Item name={[row.name, 'signOffUser']} rules={[{ required: true, message: 'Please select User' }]}>
                                        <SignOffUser 
                                            type="projectCutover" 
                                            row={row} 
                                            disabled={formDisabled() || disabled}
                                        />
                                    </Form.Item>
                                }
                            },
                            {
                                title: <span><span style={{color: '#f5222d'}}></span>Artefact</span>,
                                key: 'artifact',
                                width: '200px',
                                index: 'artifact',
                                render(text, row){
                                    const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
                                    const requiredTypes = ['CUS Signoff']
                                    let rule = []
                                    if(requiredTypes.includes(rowData.signOffType?.[0])){
                                        rule = [{ required: true, message: 'Please upload artefact' }]
                                    }else{
                                        rule = []
                                    }
                                    const status = ['', null, undefined, 'New', 'Reopen']
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
                                render(text, row){
                                    return <Form.Item name={[row.name, 'rejectionReason']}>
                                        <RejectionReason />
                                    </Form.Item>
                                }
                            },
                            {
                                title: "Actions",
                                key: 'actions',
                                index: 'actions',
                                width: '20%',
                                fixed: 'right',
                                render(text, row){
                                    const rowData = form.getFieldValue('projectCutoverSignoff')[row.name] || {};
                                    const {signOffUserGroup} = rowData
                                    const isRestricted = isRowRestricted(row);
                                    const approver = rowData.signOffUser?.[0]?.userId
                                    let userInfo = localStorage.getItem('dosm_loginInfo')
                                    userInfo = JSON.parse(userInfo)
                                    const currentUser = userInfo.user.userId
                                    const showSend = () => {
                                        let show = crStatus && 
                                        (rowData.status === 'WAITSEND' || rowData.status === 'REJECTED') && 
                                        rowData.signOffType && 
                                        (rowData.signOffUserGroup && rowData.signOffUserGroup?.length > 0) &&
                                        (rowData.signOffUser && rowData.signOffUser?.length > 0) &&
                                        currentUser == orderInfo.createdBy
                                        // MD Delegate Signoff groupName is Approver Same as CR MD Approver, hide send button
                                        if(signOffUserGroup?.[0]?.groupName === 'Approver Same as CR MD Approver'){
                                            show = false
                                        }
                                        return show
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
