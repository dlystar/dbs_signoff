import React from 'react';
import { intl } from '@chaoswise/intl';
import { action, observable, runInAction } from '@chaoswise/cw-mobx';
import prompt from '@/utils/prompt';
import {
  getCustomBtn,
  getButtonPermission,
  queryAssignInfo,
  queryRedeployInfo,
  submitDetailsOrder,
  closeDetailsOrder,
  hangUpDetailsOrder,
  hangDownDetailsOrder,
  getBackDetailsOrder,
  rollBackDetailsOrder,
  updateDetailsOrder,
  verifyValue,
  transferDetailsOrder,
  urgeDetailsOrder,
  claimDetailsOrder,
  submitCreateOrder,
  copyDetailsOrder,
  withdrawDetailsOrder,
  draftDetailsOrder,
  checkIsK2Process,
  dealEndorseOrderApi,
  endorseOrderApi,
  addCopyTaskApi,
  getCurrentNoAuthPeople,
  queryAddAssigneeInfo,
  addApproverDetailsOrder,
  addAssigneeDetailsOrder,
  getNoFinishSubTaskHandlerUser,
  rollBackProcessedByDetailsOrder,
  submitOriginHandle,
  retryDetailsOrder,
  deleteOrder,
  applyAssistedApi,
  handingAssistedApi,
  getNoAuthAssistedUserIdApi,
  cancelAssisted,
  rollbackAssisted,
} from '../DetailFooter/api';
import { delDraft, getListData } from '@/pages/ListNew/api';
import { checkType, helper } from '@/utils/T';
import { langUtil } from '@/lang';
import { getNodeHandlerConfig } from '@/pages/Reception/OrderDetail/api'
import { eventManager } from '@/utils/T/core/helper';
export default class DetailFooterStore {
  @observable.ref buttonList = [];
  @observable.ref assignInfo = {};
  @observable.ref redeployInfo = {};
  @observable.ref loadings = {
    claim: false,
    close: false,
    copy: false,
    getBack: false,
    hangDown: false,
    hangUp: false,
    rollBack: false,
    submit: false,
    transfer: false,
    update: false,
    urge: false,
    queryAssign: false,
    queryRedeploy: false,
    withdraw: false,
    saveDraft: false,
    dealEndorse: false,
    endorse: false,
    addCopyTask: false,
    addAssignee: false,
    rollBackProcessedBy: false,
    commitOriginalHandler: false,
    delete: false,
  };
  @observable.ref isShow = false;
  @observable.ref isK2Flow = false;
  @observable.ref transK2Url = '';
  @observable.ref customBtns = []; // 自定义按钮列表
  @observable.ref noAuthPeopleIds = []; // 自定义按钮列表
  @observable.ref addAssigneeInfo = {};
  @observable.ref noAuthIds = [];
  @observable.ref assistedSettingData = {};
  // 节点配置
  @observable.ref nodeConfig = {};
  @observable.ref traceId = '';

  @action
  updateState = (keyToVal = {}) => {
    Object.keys(keyToVal || {})?.forEach((key) => (this[key] = keyToVal[key]));
  };

  @action
  getNodeConfig = (processDefId, currentNodeId) => {
    getNodeHandlerConfig(processDefId, currentNodeId).then(res => {
      runInAction(() => {
        this.nodeConfig = res.data || {};
      })
    })
  }

  @action
  submitOrder = (params, successCallBack, dbsAiRequestError, resolve, reloadFormFieldLinkageFn) => {
    if (this.verdictAnyLoading()) return;
    this.changeLoading('submit', true);
    submitDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          const { data } = resp;
          if (checkType.isObject(data)) {
            if (data.redirectRemoteSys && data.remoteSysHref) {
              window.open(data.remoteSysHref);
            }
          }
          if(data?.needDialog || data?.aiReqError) {
            dbsAiRequestError(data)
          } else {
            successCallBack && successCallBack();
            resolve && resolve();
            prompt.success(
              intl.get('c72bee5c-cda6-4064-a7c9-dc8befb1d0e1').d('提交成功')
            );
          }
          resolve && resolve();
          this.changeLoading('submit', false);
        }),
      (resp) =>
        runInAction(() => {
          resolve && resolve();
          this.changeLoading('submit', false);
          // prompt.error(resp.msg);
          helper.messageError(resp);
          // 任意处理人提交工单，后端报错之后前端刷新
          if (resp.code == 130096) {
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else if (resp.code === 100001) {
            reloadFormFieldLinkageFn && reloadFormFieldLinkageFn()
          }
        })
    );
  };
  @action
  submitCreateOrder = (params, successCallBack, errorCallBack) => {
    this.loadingAsync(true);
    submitCreateOrder(params).then(
      (resp) =>
        runInAction(() => {
          const { data } = resp;
          this.loadingAsync(false);
          if (checkType.isObject(data)) {
            if (data.redirectRemoteSys && data.remoteSysHref) {
              window.open(data.remoteSysHref);
            }
          }
          successCallBack && successCallBack();
        }),
      (resp) =>
        runInAction(() => {
          this.loadingAsync(false);
          helper.messageError(resp);
          // resp?.msg && prompt.error(resp.msg);
          errorCallBack && errorCallBack();
        })
    );
  };

  @action
  closeOrder = (params, successCallBack, failureCallBack) => {
    this.changeLoading('close', true);
    closeDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('4fb7c8a8-eb61-493a-8f73-aff4c9d6462b').d('关闭成功！')
            )
          );
          this.changeLoading('close', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('close', false);
          failureCallBack && failureCallBack();
          prompt.error(resp.msg);
        })
    );
  };

  @action
  hangUpOrder = (params, successCallBack) => {
    this.changeLoading('hangUp', true);
    hangUpDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('ba3a0356-d24d-464c-8069-9788f81ed8dc').d('挂起成功！')
            )
          );
          this.changeLoading('hangUp', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('hangUp', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  hangDownOrder = (params, successCallBack) => {
    this.changeLoading('hangDown', true);
    hangDownDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('2ef7c28c-94ef-4d30-a741-846c1c1b32e5').d('解挂成功！')
            )
          );
          this.changeLoading('hangDown', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('hangDown', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  getBackOrder = (params, successCallBack, extraCallback) => {
    this.changeLoading('getBack', true);
    getBackDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('a19831d8-290f-4143-8031-f8dec532abbf').d('取回成功！')
            )
          );
          this.changeLoading('getBack', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('getBack', false);
          prompt.error('Close Cancel Failed');
          extraCallback && extraCallback();
        })
    );
  };

  @action
  rollBackOrder = (params, successCallBack) => {
    this.changeLoading('rollBack', true);
    rollBackDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('90d74cde-76b1-4237-a3b9-fe0b9d005fcc').d('回退成功！')
            )
          );
          this.changeLoading('rollBack', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('rollBack', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  rollBackProcessedByOrder = (params, successCallBack) => {
    this.changeLoading('rollBackProcessedBy', true);
    rollBackProcessedByDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('90d74cde-76b1-4237-a3b9-fe0b9d005fcc').d('回退成功！')
            )
          );
          this.changeLoading('rollBackProcessedBy', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('rollBackProcessedBy', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  verifyValue = (params, successCallBack, loadingType = 'update') => {
    if (this.verdictAnyLoading()) return;
    this.changeLoading(loadingType, true);
    verifyValue(params).then(
      (resp) =>
        runInAction(() => {
          this.changeLoading(loadingType, false);
          successCallBack && successCallBack(resp.data);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading(loadingType, false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  updateOrder = (params, successCallBack, resolve) => {
    // if(this.verdictAnyLoading()) return;
    // this.changeLoading('update', true);
    updateDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          parent.postMessage(
            {
              project: 'dosm',
              type: 'updateWorkOrderSuccess',
            },
            window.location.origin
          );
          this.changeLoading('update', false);
          resolve && resolve();
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('update', false);
          // prompt.error(resp.msg);
          helper.messageError(resp);
          parent.postMessage(
            {
              project: 'dosm',
              type: 'updateWorkOrderFail',
              data: {
                msg: resp.msg,
              },
            },
            window.location.origin
          );
          resolve && resolve();
        })
    );
  };
  @action
  retryOrder = (params, successCallBack, failureCallBack) => {
    if (this.verdictAnyLoading()) return;
    this.changeLoading('retry', true);
    retryDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          if (resp?.data) {
            successCallBack && successCallBack();
          } else {
            failureCallBack && failureCallBack();
          }
          this.changeLoading('retry', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('retry', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  transferOrder = (params, successCallBack) => {
    this.changeLoading('transfer', true);
    transferDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('58914bdf-b17c-4524-98dd-adbcf56bd3b6').d('转派成功！')
            )
          );
          this.changeLoading('transfer', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('transfer', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  addApprover = (params, successCallBack) => {
    this.changeLoading('transfer', true);
    addApproverDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl
                .get('ab7fc6ca-c454-43aa-9f30-9837ed9c774f')
                .d('添加审批人成功!')
            )
          );
          this.changeLoading('transfer', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('transfer', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  addAssignee = (params, successCallBack) => {
    this.changeLoading('transfer', true);
    addAssigneeDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl
                .get('05ab977b-16fb-48e2-9ac1-19ba66a0b6b1')
                .d('添加处理人成功!')
            )
          );
          this.changeLoading('transfer', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('transfer', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  endorseOrder = (params, successCallBack) => {
    this.changeLoading('endorse', true);
    endorseOrderApi(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('248c2b87-3525-4635-ad9a-e941eea63990').d('加签成功！')
            )
          );
          this.changeLoading('endorse', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('endorse', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  dealEndorseOrder = (params, successCallBack) => {
    this.changeLoading('dealEndorse', true);
    dealEndorseOrderApi(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('bc82c3c9-ec6d-45f5-a0f0-46c21d75b867').d('处理加签成功')
            )
          );
          this.changeLoading('dealEndorse', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('dealEndorse', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  applyAssisted = (params, successCallBack) => {
    this.changeLoading('applyAssisted', true);
    applyAssistedApi(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            intl.get('2117b15d-319b-4ff5-ab1b-ee7b12aa7557').d('申请协办成功')
          );
          this.changeLoading('applyAssisted', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('applyAssisted', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  handingAssisted = (params, successCallBack) => {
    this.changeLoading('handingAssisted', true);
    handingAssistedApi(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            intl.get('29bd2287-ab7f-4937-b473-2dbda786dc0a').d('处理成功')
          );
          this.changeLoading('handingAssisted', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('handingAssisted', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  cancelAssisted = (params, successCallBack) => {
    this.changeLoading('cancelAssisted', true);
    cancelAssisted(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            intl.get('3a79218f-f5cf-475d-a7b5-7163d47bad9d').d('取消协办成功')
          );
          this.changeLoading('cancelAssisted', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('cancelAssisted', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  rollbackAssisted = (params, successCallBack) => {
    this.changeLoading('rollbackAssisted', true);
    rollbackAssisted(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            intl.get('ec11ca94-5868-41d4-b679-52acd66c1440').d('退回协办成功')
          );
          this.changeLoading('rollbackAssisted', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('rollbackAssisted', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  ccToOrder = (params, successCallBack) => {
    this.changeLoading('addCopyTask', true);
    addCopyTaskApi(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('b34e5ebf-1da2-4c96-84ef-540ca16a9408').d('抄送成功！')
            )
          );
          this.changeLoading('addCopyTask', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('addCopyTask', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  getCurrentNoAuthPeople = (params) => {
    getCurrentNoAuthPeople(params).then(
      (resp) =>
        runInAction(() => {
          this.noAuthPeopleIds = resp.data || [];
        }),
      (resp) =>
        runInAction(() => {
          prompt.error(resp.msg);
        })
    );
  };
  @action
  getNoAuthAssistedUserId = (params) => {
    getNoAuthAssistedUserIdApi(params).then(
      (resp) =>
        runInAction(() => {
          this.assistedSettingData = resp.data || {};
        }),
      (resp) =>
        runInAction(() => {
          prompt.error(resp.msg);
        })
    );
  };

  @action
  urgeOrder = (params, successCallBack) => {
    this.changeLoading('urge', true);
    urgeDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          this.changeLoading('urge', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('urge', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  claimOrder = (params, successCallBack) => {
    this.changeLoading('claim', true);
    claimDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl.get('e0a9be03-c7b6-4cd7-a8d3-12a17c746991').d('领取成功！')
            )
          );
          this.changeLoading('claim', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('claim', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  copyOrder = (params, successCallBack) => {
    if (this.verdictAnyLoading()) return;
    copyDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack(resp.data);
          prompt.success(
            langUtil.t(
              intl.get('ab69a508-7389-43f4-ad9e-3da4c550b539').d('复制成功！')
            )
          );
        }),
      (resp) =>
        runInAction(() => {
          prompt.error(resp.msg);
        })
    );
  };

  @action
  getCustomBtn = (params) => {
    if (params) {
      params.traceId = this.traceId
    }
    getCustomBtn(params)
      .then((res) =>
        runInAction(() => {
          const customBtns = res.data || [];
          // 定制逻辑：检查是否存在 Reopen 按钮
          const hasReopenBtn = customBtns.some(btn => btn.name === 'Reopen');
          // 如果存在 Reopen 按钮，只保留 Reopen 按钮
          this.customBtns = hasReopenBtn 
            ? customBtns.filter(btn => btn.name === 'Reopen')
            : customBtns;
        })
      )
      .catch((err) => {
        prompt.error(
          (err && err.msg) ||
            intl.get('8b214c62-817f-433e-84cd-2636e2fe5633').d('请求出错了~')
        );
      });
  };

  @action
  getPermission = (params) => {
    getButtonPermission(params).then(
      (resp) =>
        runInAction(() => {
          this.buttonList =
            resp.data?.filter((btn) => btn.btnStatus == 1) || [];
          this.isShow = true;
        }),
      (resp) => runInAction(() => {})
    );
  };
  @action
  queryAssignInfo = (params, successCallBack) => {
    this.changeLoading('queryAssign', true);
    queryAssignInfo(params).then(
      (resp) =>
        runInAction(() => {
          this.assignInfo = resp.data;
          successCallBack && successCallBack(this.assignInfo);
          this.changeLoading('queryAssign', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('queryAssign', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  queryRedeployInfo = (params, successCallBack) => {
    this.changeLoading('queryRedeploy', true);
    queryRedeployInfo(params).then(
      (resp) =>
        runInAction(() => {
          this.redeployInfo = resp.data;
          successCallBack && successCallBack(this.redeployInfo);
          this.changeLoading('queryRedeploy', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('queryRedeploy', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  queryAddAssigneeInfo = (params, successCallBack) => {
    this.changeLoading('addAssignee', true);
    queryAddAssigneeInfo(params).then(
      (resp) =>
        runInAction(() => {
          this.addAssigneeInfo = resp.data;
          successCallBack && successCallBack(this.addAssigneeInfo);
          this.changeLoading('addAssignee', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('addAssignee', false);
          prompt.error(resp.msg);
        })
    );
  };
  @action
  getNoFinishSubTaskHandlerUser = (params) => {
    getNoFinishSubTaskHandlerUser(params).then(
      (resp) =>
        runInAction(() => {
          this.noAuthIds = resp.data;
        }),
      (resp) =>
        runInAction(() => {
          prompt.error(resp.msg);
        })
    );
  };

  @action
  withdrawOrder = (params, successCallBack) => {
    this.changeLoading('withdraw', true);
    withdrawDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          prompt.success(
            langUtil.t(
              intl
                .get('21617279-97dc-4169-b5ef-fdde0c90df62')
                .d('转派撤回成功！')
            )
          );
          this.changeLoading('withdraw', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('withdraw', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  saveDraft = (params, successCallBack) => {
    this.changeLoading('saveDraft', true);
    draftDetailsOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          this.changeLoading('saveDraft', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('saveDraft', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  commitOriginalHandler = (params, successCallBack) => {
    this.changeLoading('commitOriginalHandler', true);
    submitOriginHandle(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          this.changeLoading('commitOriginalHandler', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('commitOriginalHandler', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  deleteOrder = (params, successCallBack) => {
    deleteOrder(params).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          this.changeLoading('delete', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('delete', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  delDraft = (id, successCallBack) => {
    delDraft(id).then(
      (resp) =>
        runInAction(() => {
          successCallBack && successCallBack();
          this.changeLoading('delete', false);
        }),
      (resp) =>
        runInAction(() => {
          this.changeLoading('delete', false);
          prompt.error(resp.msg);
        })
    );
  };

  @action
  changeLoading = (type, status) => {
    eventManager.emit('on-footer-loading', status)
    this.loadings = {
      ...this.loadings,
      [type]: status,
    };
  };

  // 字段联动、上传文件等时，保存草稿、提交、更新按钮loading，避免数据不同步
  @action
  loadingAsync = (mode) => {
    if (mode) {
      this.changeLoading('submit', true);
      this.changeLoading('update', true);
      this.changeLoading('saveDraft', true);
    } else {
      this.changeLoading('submit', false);
      this.changeLoading('update', false);
      this.changeLoading('saveDraft', false);
    }
  };

  @action doCheckIsK2Process = (workOrderId) => {
    checkIsK2Process(workOrderId).then(
      (resp) =>
        runInAction(() => {
          // successCallBack && successCallBack();
          // this.changeLoading('saveDraft', false);
          const { code, data } = resp;
          if (code === '100000' && data) {
            this.isK2Flow = true;
            this.transK2Url = data;
          } else {
            this.isK2Flow = false;
            this.transK2Url = '';
          }
        }),
      (resp) =>
        runInAction(() => {
          // this.changeLoading('saveDraft', false);
          prompt.error(resp.msg);
        })
    );
  };

  /**
   * 判断是否有一个状态正在loading
   * @returns
   */
  @action
  verdictAnyLoading = () => {
    let flag = false;
    Object.keys(this.loadings || {})?.forEach((key) => {
      if (this.loadings[key]) flag = true;
    });
    return flag;
  };

  fetchRCAList = ({ bizKey }, successCallBack) => { 
    getListData({
      viewId: 'MY_AUTHORIZED',
      pageSize: 30,
      currentPage: 1,
      queryData: [{
        value: bizKey,
        fieldKey: "bizKey",
        type: "INPUT",
        preNum: null
      }]
    }, false).then(resp => {
      successCallBack && successCallBack(resp?.data.records);
    }).then(resp => {
      prompt.error(resp.msg);
    })
  }
}
