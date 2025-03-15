import { observable, action } from '@chaoswise/cw-mobx';

class Store {
    @observable signoffTypeOptions = window.DOSM_CUSTOM_DBS.signoff.optionalArtefacts.signoffTypes.map(i => ({ label: i, value: i }))
    @observable formData = {}
    @observable orderInfo = {}

    @action setSignoffTypeOptions = (options) => {
        this.signoffTypeOptions = options
    }

    @action
    updateState = (payload = {}) => {
        Object.keys(payload).forEach(key => {
            this[key] = payload[key]
        })
    }
}

export default new Store();
