import { intl } from '@chaoswise/intl';
import { action, observable, computed, runInAction } from '@chaoswise/cw-mobx';
import {
  getOrderDetailsForm,
  getFieldLinkage,
  getTriggerFieldList,
  checkPermission,
  getFieldsPermission,
  getLoadingOrderDetails
} from '../api';
import { helper, checkType, getSchemaByPath } from '@/utils/T';
import {
  postFieldHook,
  getAllFieldHook,
  getNodePutAwayResult,
} from '../../OrderCreate/api';
import { EnumCollapseKey } from '@/pages/WorkOrderCommon/constants';
import prompt from '@/utils/prompt';
import { langUtil } from '@/lang';
import { handleFormDataInfo, mergeFieldLinkage2FormSchema } from '@/pages/Reception/OrderCreate/model/utils.js';
import { EnumParamsType } from '@/pages/BusinessSetting/CustomConfiguration/constant';
import {
  currentNodeName,
  currentProcessor,
} from '@/pages/Reception/common/fieldUtils';
import moment from 'moment';
import { initFieldHook } from '@/pages/Reception/OrderDetail/api';
import { setCmdbSchema } from '@/pages/Reception/OrderDetail/model/utils';
import { formatFormValues } from '@/pages/Reception/common/fieldUtils';

export default class DetailContentStore {
  @observable.ref formData = {};
  @observable.ref formDataInfo = {};
  @observable.ref currentformData = {};
  @observable.ref orderInfo = {};
  @observable.ref nodeItem = {};
  @observable.ref dictionaryObj = {};
  @observable.ref triggerFieldList = [];
  @observable.ref defaultValues = {};
  @observable.ref initFormValues = undefined;
  @observable isApprove = false;
  @observable.ref views = [];
  @observable.ref edits = [];
  @observable.ref isPermissionEnable = false;
  /* 自定义面板页签接受的URl集合 */
  @observable.ref iframeUrl = {};
  /* 自定义页签多个iframe窗口🪟接收的参数集合 */
  @observable.ref iframeTabInfo = {};
  @observable.ref cmdbDetailData = {};
  @observable.ref tableFieldCodes = {};
  @observable.ref followTableInfo = undefined;
  @observable.ref hangUpDictId = null;
  /* 基本信息页签展开 */
  @observable.ref basicActiveLink = [EnumCollapseKey.basicInfo];
  /* 活动页签面板 */
  @observable.ref activeCollapseArr = [];
  /* 混存当前打面板页签枚举展示数组 */
  @observable.ref cacheCollapseArr = [];
  // 页面初始化时字段联动的结果
  @observable.ref initFieldLinkRes = {};
  // @observable.ref cmdbConfigFieldLinkRes = null;

  @observable isFirstNode = false;
  @observable loading = false;
  @observable linkageLoading = false;
  @observable formKey = '';
  @observable.ref initCrossCheckingMap = {};

  @observable.ref traceId = '';

  constructor(dictStore) {
    // 数据字典store
    runInAction(() => {
      this.dictStore = dictStore;
    });
  }

  /* 判断当前字段变动是否需要重新加载自定义页签url */
  @action
  initIframeUrlOrNot = (fieldName) => {
    let load = false;
    Object.keys(this.iframeTabInfo || {})?.forEach((key) => {
      let paramsObj = [];
      if (this.iframeTabInfo[key]?.inputParameter) {
        paramsObj = JSON.parse(this.iframeTabInfo[key]?.inputParameter);
      }
      paramsObj?.forEach((ele) => {
        switch (ele.type) {
          case EnumParamsType.FIELDS: {
            if (ele.synchronism) {
              ele.fieldValues?.forEach((el) => {
                let paramMdlDefKey = el.split('/')[0];
                if (paramMdlDefKey.indexOf(':') > -1) {
                  paramMdlDefKey = paramMdlDefKey.split(':')[0];
                }
                if (
                  paramMdlDefKey == this.orderInfo?.preNum &&
                  el.split('/')[1] == fieldName
                ) {
                  load = true;
                }
              });
            }
            break;
          }
          case EnumParamsType.CUSTOM: {
            if (ele.synchronism && ele.customValue == fieldName) {
              load = true;
            }
            break;
          }
        }
      });
    });
    if (load) {
      this.initIframeUrl();
    }
  };

  /* 重加载自定义页签Url */
  @action
  initIframeUrl = () => {
    try {
      // 如果有最新状态的formdata，使用当前最新数据传1参
      let formData = {};
      if (Object.keys(this.currentformData || {})?.length > 0) {
        formData = this.currentformData;
      } else {
        formData = this.formData;
      }
      // 获取表格form数据
      let tableData = [];
      let keys = Object.keys(formData || {});
      keys?.forEach((keyValue) => {
        if (
          keyValue.indexOf('TABLE_FORM') > -1 &&
          checkType.isArray(formData?.[keyValue])
        ) {
          tableData?.push(formData?.[keyValue]?.[0]);
        }
      });
      const _iframeUrl = Object.assign({}, this.iframeUrl);
      Object.keys(this.iframeTabInfo || {})?.forEach((key) => {
        let paramsObj = JSON.parse(this.iframeTabInfo[key]?.inputParameter);
        let paramsStr = [];
        paramsObj?.forEach((ele) => {
          switch (ele.type) {
            case EnumParamsType.FIELDS: {
              //选择字段参数
              let keyValue = '';
              ele.fieldValues?.forEach((el) => {
                let paramMdlDefKey = (el || '').split('/')[0];
                if (paramMdlDefKey.indexOf(':') > -1) {
                  paramMdlDefKey = paramMdlDefKey.split(':')[0];
                }
                let property = el.split('/')[1] ? el.split('/')[1] : '';
                if (paramMdlDefKey == this.orderInfo?.preNum) {
                  if (formData.hasOwnProperty(property)) {
                    let value = formData[property];
                    let valueType = Object.prototype.toString.call(value);
                    if (
                      valueType == '[object Object]' ||
                      valueType == '[object Array]'
                    ) {
                      // 如果参数类型是成员组件的值 要解析数据为成员id字符串
                      value = JSON.stringify(value);
                    }
                    keyValue += value;
                  }
                  tableData?.forEach((ta) => {
                    //遍历表格字段的数据
                    if (ta.rowData.hasOwnProperty(property)) {
                      let _value = ta.rowData[property];
                      keyValue += _value;
                    }
                  });
                }
              });
              if (keyValue != '') {
                paramsStr?.push(`${ele.fieldCode}=${keyValue}`);
              }
              break;
            }
            case EnumParamsType.CUSTOM: {
              //自定义字段参数
              if (formData.hasOwnProperty(ele.customValue)) {
                paramsStr?.push(
                  `${ele.fieldCode}=${formData[ele.customValue]}`
                );
              }
              tableData?.forEach((ta) => {
                //遍历表格字段的数据
                if (ta.rowData.hasOwnProperty(ele.customValue)) {
                  paramsStr?.push(
                    `${ele.fieldCode}=${ta.rowData[ele.customValue]}`
                  );
                }
              });
              break;
            }
            case EnumParamsType.REGULAR: {
              //固定参数
              ele.regularKeys?.forEach((el) => {
                let val = el ? this.orderInfo[el] : undefined;
                if (['createdTime', 'updatedTime']?.includes(el) && val) {
                  val = moment(val)?.format('x');
                }
                if (el === 'handlerPersonIds')
                  val = currentProcessor(
                    this.orderInfo.currentNodeId,
                    this.orderInfo['nodeIdsMap']
                  );
                if (el === 'nodeName')
                  val = currentNodeName(
                    this.orderInfo.currentNodeId,
                    this.orderInfo['nodeIdsMap']
                  );
                paramsStr?.push(`${el}=${val}`);
              });
              break;
            }
          }
        });
        _iframeUrl[key] = `${this.iframeTabInfo[key]?.uri}?${paramsStr?.join(
          '&'
        )}`;
      });
      this.updateState({ iframeUrl: _iframeUrl });
    } catch (err) {
      console.log(err, 'initIframeUrl-函数报错');
    }
  };

  /* 缓存最新的表达数据 */
  @action
  updateCurrentFormData = (name, value) => {
    let newFormData = helper.deepClone(
      Object.keys(this.currentformData || {})?.length > 0
        ? this.currentformData
        : this.formData
    );
    newFormData[name] = value;
    this.updateState({ currentformData: { ...newFormData } });
  };

  @action
  getFormAndInfo = async ({ id, draftFlag, nodeItem }, callback) => {
    this.loading = false;
    // nodeItem 主要用于并行网关，当前多个节点切换的时候用
    // 一般情况刷新页面我们不用传nodeId，自有后端处理
    let nodeId = nodeItem?.nodeId;
    console.log('3.开始加载工单详情...', performance.now());

    Promise.all([
      getLoadingOrderDetails({id, draftFlag, nodeId}),
      getFieldLinkage({
        workOrderId: id,
        eventType: 'LOADING',
        nodeId: nodeId  // TODO: 会签审批时需要传参
      })
    ]).then(async res => {
      const [workOrderRes, fieldLinkRes] = res;
      console.log('4.获取工单详情和字段联动', performance.now(), workOrderRes);
      runInAction(async () => {
        const { formData, currentVersionNodeList, ...orderInfo } = workOrderRes?.data || {};
        let paraseFormData = formData ? JSON.parse(formData) : {};
        console.log('5.获取工单详情和字段联动-runInAction', performance.now());
        let schemaReq = await getSchemaByPath(orderInfo?.schemaName);
        console.log('6.获取工单详情和字段联动-runInAction-callback', performance.now());
        // 2.设置表单值
        this.formData = paraseFormData;
        // 3.处理工单已完成状态
        const { currentNodeId, dataStatus, preNum, readOnlyflag } = orderInfo;
        orderInfo.readOnlyflag = this.checkCRStatusAndGetReadOnly(
          dataStatus,
          preNum,
          paraseFormData,
          readOnlyflag,
        );

        const { schema, triggerFields } = mergeFieldLinkage2FormSchema(schemaReq, fieldLinkRes?.data?.triggerFields, paraseFormData, {
          ...orderInfo
        })

        let _nodeItem = nodeItem || orderInfo?.nodeIdsMap?.find(item => item.nodeId === currentNodeId)
        if (!_nodeItem) {
          _nodeItem = currentVersionNodeList?.find(item => item.nodeId === currentNodeId)
        }
        runInAction(() => {
          this.nodeItem = _nodeItem || {};
          this.orderInfo = {
            readOnlyflag: orderInfo.readOnlyflag,
            ...workOrderRes.data || {},
            formData: paraseFormData,
            workOrderId: id,
            processDefId: workOrderRes.data?.mdlDefCode,
            nodeId: currentNodeId,
            nodeItem: _nodeItem || {},
            currentVersionNodeList,
            schema
          };
          this.formDataInfo = schema
          this.initFieldLinkRes = { triggerFields }
        })
        callback && callback(schema)
      })
    }).catch(err => {
      this.loading = false;
      console.error('this.getFormAndInfo error', err);
    });
  };

  @observable.ref copySchemaParams = {}; // 储存权限

  // 取当前用户对表单中【表格】的权限信息
  @action checkPermission = (nodeId, processDefId, type) => {
    checkPermission({ nodeId, processDefId, type }).then((resp) =>
      runInAction(() => {
        const { followTableColFlag } = resp?.data || {};
        if (followTableColFlag) this.followTableInfo = resp?.data;
      })
    );
  };

  @action
  setFormInfo = (data) => {
    const _copySchemaParams = JSON.parse(
      JSON.stringify(this.copySchemaParams || {})
    );
    const { schema } = handleFormDataInfo(
      data.schema,
      _copySchemaParams.fieldLinkRes,
      _copySchemaParams.noImpectFields,
      null,
      { resetDefaultValue: true }
    );
    this.formDataInfo = JSON.parse(JSON.stringify(schema));
  };

  @computed get tableList () {
    const array = [];
    const fn = (arr) => {
      arr.forEach(item => {
        if (item['x-component'] === 'TABLE_FORM') {
          array.push(item.key)
        }
        if (item.properties) {
          fn(Object.values(item.properties))
        }
      })
    }
    fn(Object.values(this.formDataInfo?.properties || {}))
    return array;
  }

  // 字段联动
  @action
  getFieldLinkage = (params = {}) => {
    if (params.eventType === 'LOADING') this.initFormValues = params.values; // 储存初始化表单值，RELOAD用
    // 如果类型为：【字段更改时触发字段联动】 并且 更改的字段没有设置字段联动时，不发送请求
    // formData参数：
    //  LOADING： 初始化表单值+默认值
    //  RELOAD： 初始化表单值+默认值
    //  ONCHANGE： 表单值
    const _value =
      params.eventType === 'LOADING'
        ? {
          ...this.defaultValues,
          ...params.values,
        }
        : params.eventType === 'RELOAD'
          ? {
            ...this.defaultValues,
            ...this.initFormValues,
          }
          : {
            ...params.values,
          };
    // 表格字段联动用：key--> 表格的fieldCode ; value--> 表格的行数-1，没有行数时为-1
    const tableRowMap = {};
    this.tableList?.forEach((t) => {
      const val = _value?.[t] || (this.initFormValues || {})[t];
      tableRowMap[t] = val && Array.isArray(val) ? val?.length - 1 : -1;
    });
    formatFormValues(this.formDataInfo, _value);
    // if(changeLoading && this.tableList?.length > 0) changeLoading();
    const _params = {
      processDefKey: params.preNum,
      formData: _value,
      eventType: params.eventType === 'RELOAD' ? 'LOADING' : params.eventType,
      formId: params.formId,
      nodeId: this.nodeItem?.nodeId,
      triggerFieldCode: params.fieldCode,
      processInstanceId: params.processInstanceId,
      tableRowMap,
      formTriggerType: params.formTriggerType,
    };
    if (params.fieldEvent) {
      // 文件 新增/删除 新增的参数
      _params.fieldEvent = params.fieldEvent;
    }
    if (this.orderInfo?.workOrderId) {
      _params.workOrderId = this.orderInfo?.workOrderId || '';
    }
    // 最后一次触发字段联动的参数和此刻的参数相同那还用的着触发字段联动吗？
    // 主要是表格里面的列不知道怎么回事，只要一失焦就会触发一次字段联动
    // 只要字段的值没变化那就不用触发字段联动的啊
    const _latestFieldLinkParams = JSON.stringify(_params);
    if (this.latestFieldLinkParams === _latestFieldLinkParams) {
      return Promise.resolve();
    }
    // 把最后一次触发字段联动的参数暂存起来
    this.latestFieldLinkParams = _latestFieldLinkParams;
    return new Promise((resolve, reject) => {
      this.linkageLoading = true;
      getFieldLinkage(_params)
        .then(
          (resp) =>
            runInAction(() => {
              // ---------
              // 在上面我们暂存了上次触发字段联动的表单字段的值，是为了让字段值在没有任何变化的情况下不必再触发字段联动
              // 但是在字段联动的结果中我们可能会对字段值做处理——清空字段值&设置字段值
              // 此时我们需要更新一下暂存字段的值，使得下次字段联动能正常触发
              const paramsCache = JSON.parse(_latestFieldLinkParams || '{}');
              const valueCache = paramsCache.formData || {};
              resp.data?.triggerFields?.filter(item => item.clearFieldValue)?.forEach((item) => {
                if (item.tableCode) {
                  if (item.rowNum > -1) {
                    const rowData = valueCache[item.tableCode]?.find(
                      (row) => row.rowNum == item.rowNum
                    );
                    if (rowData) {
                      rowData[item.fieldCode] = null;
                    }
                  }
                } else {
                  valueCache[item.fieldCode] = null;
                }
              });
              resp.data?.triggerFields?.filter(item => item.needSetValue)?.forEach((item) => {
                if (item.tableCode) {
                  if (item.rowNum > -1) {
                    const rowData = valueCache[item.tableCode]?.find(
                      (row) => row.rowNum == item.rowNum
                    );
                    if (rowData) {
                      rowData[item.fieldCode] = item.value;
                    }
                  }
                } else {
                  valueCache[item.fieldCode] = item.value;
                }
              });
              resp.data?.triggerFields?.forEach?.(item => {
                if(item.key == 'uat'){
                  console.log(`uat字段被字段联动更改了！`, item)
                }
              })
              this.latestFieldLinkParams = JSON.stringify(paramsCache);
              // ------------------
              if (resp.data?.triggerFields?.length) {
                resp.data.triggerFields = resp.data.triggerFields.filter(tr => tr.type !== 'ADD_GROUP')
              }
              return resolve(resp.data);
            }),
          (resp) =>
            runInAction(() => {
              return reject(
                (resp && resp.msg) ||
                langUtil.t(
                  intl
                    .get('8b214c62-817f-433e-84cd-2636e2fe5633')
                    .d('请求出错了~')
                )
              );
            })
        )
        .finally(() =>
          setTimeout(() => {
            runInAction(() => {
              this.linkageLoading = false;
            });
          }, 0)
        );
    });
  };

  @action
  getTriggerFieldList = (mdlDefKey) => {
    const params = {
      processDefKey: mdlDefKey,
    };
    getTriggerFieldList(params).then(
      (resp) =>
        runInAction(() => {
          this.triggerFieldList = resp.data;
        }),
      (resp) => runInAction(() => { })
    );
  };

  @action
  updateNodeItem = (item) => {
    console.log(item, 'nodeItem已更新=========');
    this.nodeItem = item;
  };

  @action
  updateFormData = (data) => {
    this.formData = {
      ...this.formData,
      ...data,
    };
    this.orderInfo = {
      ...this.orderInfo,
      formData: {
        ...this.orderInfo.formData,
        ...data,
      },
    };
  };

  // 获取taskId逻辑
  @computed get taskId() {
    const { nodeIdsMap } = this.orderInfo;
    let taskId = '';
    if (
      this.nodeItem?.taskInfoList &&
      this.nodeItem?.taskInfoList?.[0]?.taskId
    ) {
      taskId = this.nodeItem.taskInfoList?.[0]?.taskId;
    } else {
      if (nodeIdsMap) {
        for (let i = 0;i < nodeIdsMap?.length;i++) {
          if (
            nodeIdsMap[i].taskInfoList &&
            nodeIdsMap[i].taskInfoList?.[0]?.taskId
          ) {
            taskId = nodeIdsMap[i].taskInfoList?.[0]?.taskId;
          }
        }
      }
    }
    return taskId;
  }

  @action
  updateState = (keyToVal = {}) => {
    Object.keys(keyToVal || {})?.forEach((key) => (this[key] = keyToVal[key]));
  };

  @action detailsSetSchema = (formData) => {
    this.formDataInfo = setCmdbSchema(this.formDataInfo, formData);
    this.setFormInfo({
      schema: this.formDataInfo,
    });
  };

  @action
  checkCRStatusAndGetReadOnly = (
    dataStatus,
    preNum,
    formData,
    readOnlyflag,
    formFlag
  ) => {
    // default readOnlyflag is reponse
    let _readOnlyflag = readOnlyflag;
    const { prenum } = window.DOSM_CONFIG?.dbs?.cr || {};
    // 已完成，已关闭的工单必须为只读
    if (dataStatus == 20 || dataStatus == 40) {
      _readOnlyflag = true;
    }
    // If it's already read-only, return directly
    if (formFlag && formFlag == 'readonly') {
      _readOnlyflag = true;
    } else if (prenum === preNum && formData) {
      const formDataObj =
        typeof formData === 'string' ? JSON.parse(formData) : formData;
      const crStatus = formDataObj?.crStatus_value;
      // Check if it's a Normal CR process and the status is Closed Cancel or Rejected
      if (
        crStatus &&
        ['Closed Cancel', 'Rejected'].some((status) =>
          crStatus.includes(status)
        )
      ) {
        _readOnlyflag = true;
      }
    }
    return _readOnlyflag;
  };

  @action
  postFieldHook = (params) => {
    if (!params.dataCode) return Promise.resolve();
    const _params = {
      fieldCode: params.fieldCode,
      dataCode: params.dataCode,
      dirtCode: params.dirtCode,
      dataLevel: params.dataLevel,
      formId: params.formId,
      formDataMap: params.formDataMap,
    };
    return new Promise((resolve, reject) => {
      this.linkageLoading = true;
      postFieldHook(_params)
        .then(
          (resp) =>
            runInAction(() => {
              return resolve(resp.data);
            }),
          (resp) =>
            runInAction(() => {
              return reject(
                (resp && resp.msg) ||
                langUtil.t(
                  intl
                    .get('8b214c62-817f-433e-84cd-2636e2fe5633')
                    .d('请求出错了~')
                )
              );
            })
        )
        .finally(() =>
          setTimeout(() => {
            runInAction(() => {
              this.linkageLoading = false;
            });
          }, 0)
        );
    });
  };

  @action
  initFieldHook = (params) => {
    if (!params?.length) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.linkageLoading = true;
      initFieldHook(params)
        .then(
          (resp) =>
            runInAction(() => {
              return resolve(resp.data);
            }),
          (resp) =>
            runInAction(() => {
              return reject(
                (resp && resp.msg) ||
                langUtil.t(
                  intl
                    .get('8b214c62-817f-433e-84cd-2636e2fe5633')
                    .d('请求出错了~')
                )
              );
            })
        )
        .finally(() =>
          setTimeout(() => {
            runInAction(() => {
              this.linkageLoading = false;
            });
          }, 0)
        );
    });
  };

  @action
  getAllFieldHook = (formId, cb) => {
    return getAllFieldHook(formId).then(
      (resp) =>
        runInAction(() => {
          if (cb) {
            cb && cb(resp.data);
          } else {
            this.initCrossCheckingMap = resp.data;
          }
        }),
      (resp) =>
        runInAction(() => {
          return (
            (resp && resp.msg) ||
            langUtil.t(
              intl.get('8b214c62-817f-433e-84cd-2636e2fe5633').d('请求出错了~')
            )
          );
        })
    );
  };

  @action
  setChangedColumnField = (tableCode, columnCode) => {
    this.tableFieldCodes[tableCode] = columnCode;
  };

  @action
  updateState = (keyToVal = {}) => {
    for (const [key, val] of Object.entries(keyToVal)) {
      this[key] = val;
    }
  };

  @action
  getFieldsPermission = (id) => {
    getFieldsPermission(id).then((resp) => {
      runInAction(() => {
        const { fields } = resp.data || {};
        let views = [],
          edits = [];
        fields?.map((item) => {
          if (item.type === 'VIEW') {
            views = [...item.fields];
          } else {
            edits = [...item.fields];
          }
        });
        this.views = views;
        this.edits = edits;
      });
    });
  };

  @observable.ref putAwayList = []; //默认隐藏分组

  @action
  getNodePutAwayResult = (params) => {
    getNodePutAwayResult(params).then(
      (resp) =>
        runInAction(() => {
          this.putAwayList = resp?.data || [];
        }),
      (err) =>
        runInAction(() => {
          prompt.error(
            (err && err.msg) ||
            langUtil.t(
              intl
                .get('8b214c62-817f-433e-84cd-2636e2fe5633')
                .d('请求出错了~')
            )
          );
        })
    );
  };

  @observable.ref cmdbTabStore = {}; // 配置项标签 store
  @action getCmdbTabStore = (type, data) => {
    if (this.cmdbTabStore[type]) {
      return this.cmdbTabStore[type];
    } else if (data) {
      this.cmdbTabStore = {
        ...this.cmdbTabStore,
        [type]: data,
      };
      return data;
    }
    return null;
  };
}
