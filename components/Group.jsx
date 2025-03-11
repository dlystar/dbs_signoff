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
    const key = props.id.split('_').splice(1)
    key.splice(2,1,'signOffType')
    const signOffType = Form.useWatch(key, form)    
    const FORM_ACTIONS =  window.FORM_ACTIONS ||  window.parent.FORM_ACTIONS
    useEffect(() => {
        if (type === 'testing') {
            return setGroupIds(signOffType?.includes('UAT') ? uatGroupIds : nUatGroupIds)
        }
        if(signOffType?.includes('IDR Signoff')){
            setTimeout(() => {
                FORM_ACTIONS.getFieldState('TechMDApproverGroup', state => {
                    const changeOptions = state?.props?.['x-props']?.changeOptions || []
                    setGroupIds(changeOptions.map(i => Number(i.groupId)))
                })
            }, 200)
        }
        if(signOffType?.includes('Code Checker Signoff')){
            if (formActions) {
                const { getFieldState } = formActions || {};
                getFieldState?.('ApproverGroup1', state => {
                    const changeOptions = state?.props?.['x-props']?.changeOptions || []
                    setGroupIds(changeOptions.map(i => Number(i.groupId)))
                })
            } else {
                FORM_ACTIONS.getFieldState('ApproverGroup1', state => {
                    const changeOptions = state?.props?.['x-props']?.changeOptions || []
                    setGroupIds(changeOptions.map(i => Number(i.groupId)))
                })
            }
        }
    }, [type, signOffType, formData])

    const handleChange = (val, reset) => {
        // group类型变更，清空user
        const key = props.id.split('_').splice(1)
        key.splice(2,1,'signOffUser')
        const namePath = key.map(i => isNaN(i) ? i : Number(i))
        onChange(val)
        form.setFieldValue(namePath, undefined)
        onValuesChange(row.name, 'signOffUserGroup', val)
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
                disabled={disabled || signOffType?.includes('MD Delegate Signoff')}
                placeholder="Please select"
                style={{width: '168px'}}
            />
        </div>
    )
}

export default Group
