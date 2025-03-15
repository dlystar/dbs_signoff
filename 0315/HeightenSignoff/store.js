import { observable, action } from '@chaoswise/cw-mobx';
class HeightenSignoffStore {
  @observable.ref signoffTypeOptions = [];
  @observable.ref orderInfo = {}
  @observable.ref formData = {}
  @action setSignoffTypeOptions = (options) => {
    this.signoffTypeOptions = options
  }
  @action
  updateState = (keyToVal = {}, callback) => {
    for (const [key, val] of Object.entries(keyToVal)) {
      this[key] = val;
    }
  };
  
}
export default new HeightenSignoffStore()