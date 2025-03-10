import { observable, action } from '@chaoswise/cw-mobx'

class ProjectCutoverSignoffStore {
    @observable formData = {}
    @observable orderInfo = {}

    @action setSignoffTypeOptions = (options) => {
        this.signoffTypeOptions = options
    }
    
    @action
    updateState = (state) => {
        Object.assign(this, state)
    }
}

export default new ProjectCutoverSignoffStore()
