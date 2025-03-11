import {eventManager} from '@/utils/T/core/helper';
import {getUserGroupByExactName} from '@/services/douc'
export const fieldValueChangeToValidateFields = (form, containerRef, type) => {
  form.validateFields().then(values => {
    eventManager.emit('on-signoff-field-update-error', [{
      status: 'rejected',
      reason: {
        tabKey: parentNodeId?.split('.$')?.[1],
        [type]: []
      }
    }])
  }).catch(errors => {
    let parentNodeId = containerRef?.current?.closest('.ant-tabs-tabpane')?.id;
    const error = errors?.errorFields?.map(item => {
      return {
        name: item.name,
        messages: item.errors
      }
    })
    eventManager.emit('on-signoff-field-update-error', [{
      status: 'rejected',
      reason: {
        tabKey: parentNodeId?.split('.$')?.[1],
        [type]: error
      }
    }])
  })
}

export const getGroupDefaultValue = (signOffType, formData, actions) => {
  const {uatGroupIds = [], nUatGroupIds = []} = window.DOSM_CUSTOM_DBS.signoff?.testingSignoff || {}
  const {IDRGroupIds = [], ISSGroupIds = [], DRteamGroupIds = [], StorageteamGroupIds = []} = window.DOSM_CUSTOM_DBS.signoff?.otherSignoff || {}
  const {HADRFlipGroupIds = [],  DataCenterOPSGroupIds = [], ImpactToMainframeGroupIds = [], D4DGroupIds = [], BUGroupIds = []} = window.DOSM_CUSTOM_DBS.signoff?.projectCutoverSignoff || {}
  if(signOffType?.includes('ISS Signoff')){
    return[{
      groupName: 'PSG_DBSGOV_ISS',
      groupId: ISSGroupIds[0]
    }]
  }else if (signOffType?.includes('DR team Signoff')) {
    return[{
      groupName: 'PSG_DBSGOV_DR',
      groupId: DRteamGroupIds[0]
    }]
  }else if (signOffType?.includes('Storage team Signoff')) {
    return[{
      groupName: 'PSG_DBSGOV_IMOSD',
      groupId: StorageteamGroupIds[0]
    }]
  }else if (signOffType?.includes('HA & DR Flip Signoff')) {
    return[{
      groupName: 'PSG_DBSGOV_DR_SIGNOFF',
      groupId: HADRFlipGroupIds[0]
    }]
  }else if (signOffType?.includes('Data Center OPS (Batch) Signoff')) {
    return[{
      groupName: 'PSG_DBSGOV_OSSCHED',
      groupId: DataCenterOPSGroupIds[0]
    }]
  }else if (signOffType?.includes('Impact To Mainframe Signoff')) {
    return[{
      groupName: 'PSG_DBSGOV_MF',
      groupId: ImpactToMainframeGroupIds[0]
    }]
  }else if (signOffType?.includes('Design For Data (D4D) Signoff')) {
    return[{
      groupName: 'PSG_DBSGOV_D4D',
      groupId: D4DGroupIds[0]
    }]
  }else if (signOffType?.includes('BU/Application Owner Signoff')) {
    return[{
      groupName: 'HR Employee List',
      groupId: BUGroupIds[0]
    }]
  }else{
    return([])
  }
}
export const getArcGroupDefaultValue = (signOffType, formData) => {
  const {arcCTAndEASREGroupIds = [], arcOtherGroupIds} = window.DOSM_CUSTOM_DBS.signoff?.heightenSignoff || {}
  return new Promise((resolve, reject) => {
    // CT SRASE
    if (formData?.lob_value == '80fb171c355246ee97190142a4b21e67' || formData?.lob_value == 'c3d5bb4ee8c9436090856e55fb8c1c11') {
      resolve([{
        groupName: 'PSG_DBSGOV_ARC_EA',
        groupId: arcCTAndEASREGroupIds[0]
      }])
    } else {
      getUserGroupByExactName({
        licFeatures: '',
        groupName: 'PSG_DBSGOV_ARC_' + formData?.lob_value,
      }).then(res => {
        const arcOtherGroupIds = res?.data?.list || []
        resolve([{
          groupName: arcOtherGroupIds?.[0]?.groupName,
          groupId: arcOtherGroupIds?.[0]?.groupId
        }])
      })
    }
  })
}