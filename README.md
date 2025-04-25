/* eslint-disable react-hooks/exhaustive-deps */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CWTable, Radio, Icon, Button,message } from '@chaoswise/ui';
import {observer, toJS} from '@chaoswise/cw-mobx';
import {disabledRisk, riskAssessmentColumns, riskAssessmentData, riskAssessmentFields, riskCount} from "@/customPages/constants/riskAssessment"
import store from "./model/riskAssessmentStore";
import style from "./index.less"


const {msgOriginConf,downRiskUrlConf} = window?.DOSM_CUSTOM_DBS||{}
const msgOrigin = msgOriginConf || window?.parent?.location?.origin
const downRiskUrl = downRiskUrlConf || process.env.publicPath + 'assets/Change Category Alignment with AIML v4.xlsx'


const RiskAssessmentPC = observer(() => {
    const {getMASFlag, loading, masFlag, selected, getChangeCategory, updateSelected, resetStore, setSelected, updateStore, formValue, updateStoreObj, formBaseValue, getRiskAssessmentIdData, riskAssessmentIdData} = store;
    const selectedData = useMemo(()=>toJS(selected),[selected])
    const formValueData = useMemo(()=>toJS(formValue),[formValue])
    const formBaseValueData = useMemo(()=>toJS(formBaseValue),[formBaseValue])
    const riskAssessmentIdDataRef = useRef(null);


    const [disabled, setDisabled] = useState(false)


    useEffect(() => {
        riskAssessmentIdDataRef.current = riskAssessmentIdData
    }, [riskAssessmentIdData])


    useEffect(() => {
        // 发送数据回父页面
        window.parent?.postMessage?.({
            project: 'dosm',
            type: 'requestContentExtensionFormValue',
        }, msgOrigin);
        return () => {
            resetStore();
        }
    }, [])
    const isSameUserGroup = (formData) => {
        let userInfo = localStorage.getItem('dosm_loginInfo')
        userInfo = JSON.parse(userInfo)
        const groupRelation = userInfo.user?.groupRelation?.map?.(item => String(item.groupId)) || []
        const changeRequestorGroups = formData?.changeRequestorGroups?.[0]?.groupId
        return changeRequestorGroups && groupRelation.includes(changeRequestorGroups)
    }
    const isRequester = (formData) => {
        const requester = formData?.Requester_search?.[0]
        let userInfo = localStorage.getItem('dosm_loginInfo')
        userInfo = JSON.parse(userInfo)
        return userInfo.user.userId == requester
    }
    const contentExtensionMessage = (event)=>{
        switch (event?.data?.type) {
            case 'getContentExtension':
                let changeCategory = getChangeCategory
                const {changeType_value,changeGroup_value} = event?.data?.formBaseValue||formBaseValueData||{};
                if(!changeCategory){
                    message.error("All risk matrix options are required.")
                    return;
                }
                if(["Standard","Standard-Annual"].includes(changeType_value) && changeCategory != "Low"){
                    message.error("Calculate RM - Risk cat should be 3 for standard, standard annual")
                    return;
                }
                if(["Standard","Standard-Annual"].includes(changeType_value) && selectedData?.[riskCount.i] != "Low"){
                    message.error("Calculate RM - Inherent and Residual risks cat should be 3 for standard, standard annual")
                    return;
                }
                if(["PROJECT CUT OVER"].includes(changeGroup_value) && changeCategory == "Low"){
                    message.error("Calculate RM - Risk cat should be 1/2 for project cut over")
                    return;
                }
                if(["Automated"].includes(changeType_value) && changeCategory != "Low"){
                    message.error("Calculate RM - Risk cat should be 3 for Automated")
                    return;
                }
                let _formValue = {};
                // 设置下表单的值
                for(let key in selectedData){
                    _formValue[key] = riskAssessmentIdData[key]?.[selectedData[key]]
                }
                // 发送数据回父页面
                window?.parent?.postMessage?.({
                    project: 'dosm',
                    type: 'setContentExtension',
                    params:event?.data,
                    data:changeCategory,// 单行文本值
                    formValue:_formValue,// 设置表单值
                    status:"success" // success error
                }, msgOrigin);
                break;
            case 'responseContentExtensionFormValue':
                console.log(event.data);
                const formValue = event?.data?.formValue||{};
                const formBaseValue = event?.data?.formBaseValue||{};
                const { masFlag } = formValue
                const selected = {};
                const { disabled } = event?.data || {};
                setDisabled(true)
                getRiskAssessmentIdData(() => {
                    // 获取数据后，设置为不可选
                    let _riskAssessmentIdData = toJS(riskAssessmentIdDataRef.current);
                    riskAssessmentFields.forEach((item,index)=>{
                        let itemObj = _riskAssessmentIdData[item];
                        for(let key in itemObj){
                            if(formValue[item] === itemObj[key]){
                                selected[item] = key
                            }
                        }
                    })
                    if(masFlag=="N"){
                        selected[disabledRisk] = "Low"
                    }
                    // 需求变更，这里暂时不要了
                    // if (masFlag === 'Y') {
                    //     selected[disabledRisk] = "High"
                    // }
                    // setSelected 后，设置 disabled 为 false
                    setDisabled(disabled || !(isSameUserGroup(formValue) || isRequester(formValue)))
                    setSelected(selected);
                    updateStoreObj({formValue, formBaseValue, masFlag})
                });
                // getMASFlag({appCodes:applicationimpact,otherAppCodes:otherapplicationimpact})
                break
            default:
                return;
        }
    }
    useEffect(() => {
        window.addEventListener('message', contentExtensionMessage);
        return () => {
            window.removeEventListener('message', contentExtensionMessage)
        }
    }, [getChangeCategory, formValueData, selectedData, formBaseValueData])



    const renderText = (text)=> {
        return <>
            {
                (text?.title || []).map((item, index) => <div style={{fontWeight: 'bold', textAlign: 'left'}} key={index}>{item}</div>)
            }
            {
                (text?.desc || []).map((item, index) => <div style={{textAlign: 'left', fontStyle: 'italic'}} key={index}>{item}</div>)
            }
        </>
    }
    const render = useCallback((column, text, recond) => {
        return <div className={style['riskAssessmentContent']}>
            {
                disabled ?
                    renderText(text)
                    :
                    <Radio
                        checked={selectedData?.[`${recond?.id}`]==column.code}
                        onChange={(t)=>updateSelected(`${recond?.id}`, column.code, t)}
                        disabled={((masFlag=="N" && column.code=="High") && recond?.id==disabledRisk) || column?.readonly}
                    >
                        {renderText(text)}
                    </Radio>
            }
        </div>
    },[selected,masFlag])
    const columns = useMemo(() => {
        return riskAssessmentColumns.map(item => {
            if (disabled) {
                item.readonly = true
            } else {
                item.readonly = false
            }
            return {...item,render:(text,recond)=>render(item,text,recond)}
        })
    }, [riskAssessmentColumns,selected,masFlag, disabled, render])
    const header = useCallback(()=>{
        return <div>
            <Icon type="table" style={{marginRight: 8}} />
            Risk Assessment Matrix
            <Button type="primary" size="small" style={{marginLeft: 10}} href={downRiskUrl} target={"_blank"}>
                <Icon type="download" />
                Detailed Risk Matrix
            </Button>
            <div style={{ fontWeight: 500, marginTop: 12 }}>Please ensure weightage for all the Risk Assesssment items below is selected.</div>
        </div>
    },[])
    const footer = useCallback(()=>{
        return <div style={{fontWeight: 'bold', display: 'flex'}}>
            <div style={{width: '40%'}}>
                Change Category：
            </div>
            <div style={{flex: 1, paddingLeft: 64 }}>
                {getChangeCategory}
            </div>

        </div>
    },[getChangeCategory])


    return (
        <CWTable
            title={header}
            className={style['riskAssessmentPC']}
            columns={columns}
            dataSource={riskAssessmentData}
            rowKey={"id"}
            loading={loading}
            pagination={false}
            footer={footer}
        />
    );
});
export default RiskAssessmentPC;
