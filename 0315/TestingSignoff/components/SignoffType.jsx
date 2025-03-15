import { CWSelect, TooltipText } from '@chaoswise/ui'
import { observer } from '@chaoswise/cw-mobx';
import { useEffect, useRef } from 'react';
export default observer(({ value, onChange, row, disabled, signoffTypeOptions, type, ...props }) => {
    const { form, onValuesChange } = row
    const selectRef = useRef()
    const { uatGroupIds = [], nUatGroupIds = [] } = window.DOSM_CUSTOM_DBS.signoff?.testingSignoff || {}
    useEffect(() => {
        if (signoffTypeOptions?.length > 0) {
            const _ = value?.filter(i => !!signoffTypeOptions?.find(item => item.value === i))
            onChange(_)
        } else {
            onChange(undefined)
        }
    }, [signoffTypeOptions])
    const getNamePath = (key) => {
        const namePath = props.id.split('_').splice(1)
        namePath.splice(2, 1, key)
        return namePath.map(i => isNaN(i) ? i : Number(i))
    }
    const handleChange = (val) => {
        let defaultGroup = undefined
        if (type === 'testing') {
            if (val && val.length > 0) {
                defaultGroup = [{
                    groupName: val?.includes('UAT') ? 'SVP & Above' : 'HR Employee List',
                    groupId: val?.includes('UAT') ? uatGroupIds[0] : nUatGroupIds[0]
                }]
            }
        }
        // signoff类型变更，清空group和user
        form.setFieldValue(getNamePath('signOffUserGroup'), defaultGroup)
        form.setFieldValue(getNamePath('signOffUser'), undefined)
        setTimeout(() => {
            onChange(val)
            onValuesChange(row.name, 'signOffType', val)
        }, 60)
    }
    const getPopupContainer = (e) => {
        const { inIframe } = window.DOSM_CUSTOM_DBS.signoff
        if (inIframe) {
            return window.parent?.document?.body
        } else {
            return document.body
        }
    }
    return <div ref={selectRef}>
        <CWSelect
            value={value}
            style={{ width: '168px' }}
            mode="multiple"
            showCheckbox
            onChange={handleChange}
            getPopupContainer={getPopupContainer}
            dropdownClassName={props.id}
            disabled={disabled}
            placeholder="Please select"
            tagLabelRender={(_, props) => {
                const label = signoffTypeOptions.find(i => i.value === props.value)?.label
                return <TooltipText>{label}</TooltipText>
            }}
        >
            {
                signoffTypeOptions.map(item => <CWSelect.Option key={item.value} value={item.value}>
                    <div style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>{item.label}</div>
                </CWSelect.Option>)
            }
        </CWSelect>
    </div>
})