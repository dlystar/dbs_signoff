import { CWSelect, TooltipText, Tooltip } from '@chaoswise/ui'
import { observer } from '@chaoswise/cw-mobx';
import { useEffect, useRef } from 'react';
export default observer(({ value, onChange, row, disabled, signoffTypeOptions, type, mode, ...props }) => {
    const { form, onValuesChange } = row
    const selectRef = useRef()
    const { uatGroupIds = [], nUatGroupIds = [] } = window.DOSM_CUSTOM_DBS.signoff?.testingSignoff || {}
    const getNamePath = (key) => {
        const namePath = props.id.split('_').splice(1)
        namePath.splice(2, 1, key)
        return namePath.map(i => isNaN(i) ? i : Number(i))
    }
    const handleChange = (val) => {
        let _val = Array.isArray(val) ? val : [val]
        let defaultGroup = undefined
        if (type === 'testing') {
            if (_val && _val.length > 0) {
                defaultGroup = [{
                    groupName: _val?.includes('UAT') ? 'SVP & Above' : 'HR Employee List',
                    groupId: _val?.includes('UAT') ? uatGroupIds[0] : nUatGroupIds[0]
                }]
            }
        }
        // signoff类型变更，清空group和user
        form.setFieldValue(getNamePath('signOffUserGroup'), defaultGroup)
        form.setFieldValue(getNamePath('signOffUser'), undefined)
        setTimeout(() => {
            onChange(_val)
            onValuesChange(row.name, 'signOffType', _val)
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
    let modeProps = {mode: 'multiple'}
    if(mode == 'single'){
        modeProps = {}
    }
    return <div ref={selectRef}>
    <Tooltip title={disabled ? signoffTypeOptions?.filter(i => value?.includes(i.value))?.map(i => i.label).join(', ') : ''}>
        <CWSelect
            value={value}
            style={{ width: '168px' }}
            {...modeProps}
            showCheckbox
            onChange={handleChange}
            getPopupContainer={getPopupContainer}
            dropdownClassName={props.id}
            disabled={disabled}
            placeholder="Please select"
            dropdownMatchSelectWidth={false}
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
    </Tooltip>
    </div>
})
