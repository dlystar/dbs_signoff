import { useState, useEffect, useRef } from 'react'
import { Form4 as Form} from '@chaoswise/ui'
import DoVisibleRange from '@/components/DoVisibleRange'
import {getUserGroupByExactName} from '@/services/douc'
import { helper } from '@/utils/T';
const Group = ({value, onChange, row, disabled, type = 'testing', formActions, ...props}) => {
    const {uatGroupIds = [], nUatGroupIds = []} = window.DOSM_CUSTOM_DBS.signoff?.testingSignoff || {}
    const {arcCTAndEASREGroupIds = [], arcOtherGroupIds} = window.DOSM_CUSTOM_DBS.signoff?.heightenSignoff || {}
    const {IDRGroupIds = [], ISSGroupIds = [], DRteamGroupIds = [], StorageteamGroupIds = []} = window.DOSM_CUSTOM_DBS.signoff?.otherSignoff || {}
    const {HADRFlipGroupIds = [],  DataCenterOPSGroupIds = [], ImpactToMainframeGroupIds = [], D4DGroupIds = [], BUGroupIds = []} = window.DOSM_CUSTOM_DBS.signoff?.projectCutoverSignoff || {}
    const {form, onValuesChange, formData} = row    
    const selectRef = useRef()
    const groupRef = useRef({})
    const [groupIds, setGroupIds] = useState([])
    const key = props.id.split('_').splice(1)
    key.splice(2,1,'signOffType')
    const signOffType = Form.useWatch(key, form)    
    const FORM_ACTIONS =  window.FORM_ACTIONS ||  window.parent.FORM_ACTIONS
    const unMountRef = useRef(false)
    useEffect(() => {
        if (type === 'testing') {
            if(signOffType && signOffType.length > 0){
                handleChangeTestingChange([{
                    groupName: signOffType?.includes('UAT') ? 'SVP & Above' : 'HR Employee List',
                    groupId: signOffType?.includes('UAT') ? uatGroupIds[0] : nUatGroupIds[0]
                }])
            }
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
        if(signOffType?.includes('ISS Signoff')){
            handleChange([{
                groupName: 'PSG_DBSGOV_ISS',
                groupId: ISSGroupIds[0]
            }])
            return setGroupIds(ISSGroupIds)
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
        if(signOffType?.includes('DR team Signoff')){
            handleChange([{
                groupName: 'PSG_DBSGOV_DR',
                groupId: DRteamGroupIds[0]
            }], false)
            return setGroupIds(DRteamGroupIds)
        }
        if(signOffType?.includes('Storage team Signoff')){
            handleChange([{
                groupName: 'PSG_DBSGOV_IMOSD',
                groupId: StorageteamGroupIds[0]
            }], false)
            return setGroupIds(StorageteamGroupIds)
        }

        if(signOffType?.includes('HA & DR Flip Signoff')){
            handleChange([{
                groupName: 'PSG_DBSGOV_DR_SIGNOFF',
                groupId: HADRFlipGroupIds[0]
            }], false)
            return setGroupIds(HADRFlipGroupIds)
        }
        if(signOffType?.includes('Data Center OPS (Batch) Signoff')){
            handleChange([{
                groupName: 'PSG_DBSGOV_OSSCHED',
                groupId: DataCenterOPSGroupIds[0]
            }], false)
            return setGroupIds(DataCenterOPSGroupIds)
        }
        if(signOffType?.includes('Impact To Mainframe Signoff')){
            handleChange([{
                groupName: 'PSG_DBSGOV_MF',
                groupId: ImpactToMainframeGroupIds[0]
            }], false)
            return setGroupIds(ImpactToMainframeGroupIds)
        }
        if(signOffType?.includes('Design For Data (D4D) Signoff')){
            handleChange([{
                groupName: 'PSG_DBSGOV_D4D',
                groupId: D4DGroupIds[0]
            }], false)
            return setGroupIds(D4DGroupIds)
        }
        if(signOffType?.includes('BU/Application Owner Signoff')){
            handleChange([{
                groupName: 'HR Employee List',
                groupId: BUGroupIds[0]
            }], false)
            return setGroupIds(BUGroupIds)
        }
        if(signOffType?.includes('ARC Signoff')){
            if(formData?.lob_value == 'CT' || formData?.lob_value == 'EASRE'){
                handleChange([{
                    groupName: 'PSG_DBSGOV_ARC_EA',
                    groupId: arcCTAndEASREGroupIds[0]
                }], false)
                return setGroupIds(arcCTAndEASREGroupIds)
            }else{
                getUserGroupByExactName({
                    licFeatures: '',
                    groupName: 'PSG_DBSGOV_ARC_' + formData?.lob_value,
                }).then(res => {
                    if(unMountRef.current) return
                    const arcOtherGroupIds = res?.data?.list || []
                    handleChange([{
                        groupName: arcOtherGroupIds?.[0]?.groupName,
                        groupId: arcOtherGroupIds?.[0]?.groupId
                    }], false)
                    setGroupIds([arcOtherGroupIds?.[0]?.groupId])
                })
            }
        }
        unMountRef.current = false
        return () => {
            unMountRef.current = true
        }
    }, [type, signOffType, formData])
    const handleChangeTestingChange = helper.debounce((val) => {
        handleChange(val, false)
    },300)
    const handleChange = (val, reset) => {
        // group类型变更，清空user
        const key = props.id.split('_').splice(1)
        key.splice(2,1,'signOffUser')
        const namePath = key.map(i => isNaN(i) ? i : Number(i))
        onChange(val)
        if(reset){
            form.setFieldValue(namePath, undefined)
            onValuesChange(row.name, 'signOffUserGroup', val)
        }
    }

    const getPopupContainer = (e) => {
        const {inIframe} = window.DOSM_CUSTOM_DBS.signoff
        if(inIframe){
            return window.parent?.document?.body
        }else{
            return document.body
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
                disabled={disabled || signOffType?.includes('MD Delegate Signoff')}
                placeholder="Please select"
                style={{width: '168px'}}
            />
        </div>
    )
}

export default Group
