import { useState, useEffect, useRef } from 'react'
import { Form4 as Form} from '@chaoswise/ui'
import DoVisibleRange from '@/components/DoVisibleRange'
import {getUserGroupByExactName} from '@/services/douc'
import { helper } from '@/utils/T';
const Group = ({value, onChange, row, disabled, type = 'testing', formActions, ...props}) => {
    const {uatGroupIds = [], nUatGroupIds = []} = window.DOSM_CUSTOM_DBS.signoff?.testingSignoff || {}
    const {form, onValuesChange, formData} = row
    const selectRef = useRef()
    const groupRef = useRef({})
    const [groupIds, setGroupIds] = useState([])
    const [changeOptions, setChangeOptions] = useState([])
    const key = props.id.split('_').splice(1)
    key.splice(2,1,'signOffType')
    const signOffType = Form.useWatch(key, form)
    const FORM_ACTIONS =  window.FORM_ACTIONS ||  window.parent.FORM_ACTIONS
    const getMdGroups = (isMD) => {
        let totalTime = 0
        let timer = setInterval(() => {
            totalTime++
            let needLength = 0
            FORM_ACTIONS.getFieldState('TechMDApproverGroup', state => {
                const changeOptions = state?.props?.['x-props']?.changeOptions || []
                const _changeOptions = changeOptions.map(item => {
                    return {
                        ...item,
                        "title": item.groupName,
                        "key": item.groupId,
                        "type": "group",
                        "isLeaf": true,
                        "id": item.groupId,
                    }
                })
                if(isMD){
                    needLength = 1
                    const mdGroupId = '03c1df481bec4849b7ab287336429b05'
                    const mdGroupName = 'Approver Same as CR MD Approver'
                    _changeOptions.push({
                        groupId: mdGroupId,
                        groupName: mdGroupName,
                        userId: null,
                        userName: null,
                        userAlias: null,
                        "title": mdGroupName,
                        "key":mdGroupId,
                        "type": "group",
                        "isLeaf": true,
                        "id":mdGroupId,
                    })
                }
                console.log('totalTime', totalTime, _changeOptions);
                if(_changeOptions.length > needLength || totalTime > 20){
                    setChangeOptions(_changeOptions)
                    clearInterval(timer) 
                }                
            })
        },1000)
    }
    useEffect(() => {
        if (type === 'testing') {
            return setGroupIds(signOffType?.includes('UAT') ? uatGroupIds : nUatGroupIds)
        }
        if(signOffType?.includes('IDR Signoff')){
            getMdGroups(false)
        }
        if(signOffType?.includes('Code Checker Signoff')){
            let total = 0;
            let timer = setInterval(() => {
                total++
                FORM_ACTIONS.getFieldState('ApproverGroup1', state => {
                    const changeOptions = state?.props?.['x-props']?.changeOptions || []
                    if(changeOptions.length > 0 || total > 20){
                        const _changeOptions = changeOptions.map(item => {
                            return {
                                ...item,
                                "title": item.groupName,
                                "key": item.groupId,
                                "type": "group",
                                "isLeaf": true,
                                "id": item.groupId,
                            }
                        })
                        setChangeOptions(_changeOptions)
                        clearInterval(timer)
                    }
                })
            },1000)
        }
        if(signOffType?.includes('MD Delegate Signoff')){
            getMdGroups(true)
        }
    }, [type, signOffType, formData])


    const handleChange = (val, reset) => {
        // group类型变更，清空user
        const key = props.id.split('_').splice(1)
        key.splice(2,1,'signOffUser')
        const namePath = key.map(i => isNaN(i) ? i : String(i))
        onChange(val)
        form.setFieldValue(namePath, undefined)
        onValuesChange(row.name, 'signOffUserGroup', val)
    }
    let rest = {}
    if(changeOptions.length > 0){
        rest = {
            changeOptions
        }
    }
    return (
        <div ref={selectRef} key={groupIds?.join(',')}>
            <DoVisibleRange
                visibleRef={groupRef}
                types={['group']}
                crossTenant={true}
                userStatus={false}
                group={{
                    multiple: false,
                    visibleGroupIds: groupIds,
                    onlyGroup: true,
                }}
                value={value}
                onChange={handleChange}
                dropDownOverlayClassName={props.id}
                disabled={disabled}
                placeholder="Please select"
                style={{width: '168px'}}
                {...rest}
            />
        </div>
    )
}


export default Group
