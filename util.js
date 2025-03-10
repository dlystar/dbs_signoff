import {eventManager} from '@/utils/T/core/helper';
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
    const error = errors.errorFields.map(item => {
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