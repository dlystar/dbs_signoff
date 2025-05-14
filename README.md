import { intl } from '@chaoswise/intl';

import { EnumOperatorType } from '@/constants/common/workOrderFlow';
import {
  EnumOperator as EnumCondition,
  EnumFieldType,
  getComponents,
} from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FlowDesign/Drawer/components/GatewayPropertyConf/utils';
import ValueComponent from '@/pages/BusinessSetting/ButtonManagement/ButtonSettingsForm/ValueComponent';
import { EnumType } from '@/constants/common/formType';
import { langUtil } from '@/lang';

export const ItemTypes = {
  KEY: 'key',
  VALUE: 'value',
  BOX: 'box',
  CURRENT_WORK_ORDER: 'current_work_oder',
  WORK_ORDER_INFO: 'workOder_info',
};

export const EnumPosList = [
  {
    value: 'NORMAL_ARRANGEMENT',
    get label () {
      return intl.get('41ffd1fd-8179-43e4-924e-b6334b960cb9').d('正常排列在界面中')
    },
  },
  {
    get label () {
      return intl.get('fd019865-fa4a-4ae4-b111-b0e83bfd7777').d('合并到更多操作中')
    },
    value: 'MERGE_INTO_ACTIONS',
  },
];

export const EnumOperator = {
  AND: {
    value: 'AND',
    get label() {
      return langUtil.t(
        intl.get('02ad1676-9ea6-44b8-9fb5-7507bf2f0380').d('和')
      );
    },
  },
  OR: {
    value: 'OR',
    get label() {
      return langUtil.t(
        intl.get('ec943826-9cbd-43e1-b0b7-be2d9eeccb13').d('或')
      );
    },
  },
};

// 自定义按钮配置-启用条件-组件匹配条件的属性
const __transfer = () => {
  const obj = {};
  Object.entries(EnumFieldType).forEach(([k, v]) => {
    obj[k] = {
      conditions: v.default,
      getValueComponent: ({ value, field, onChange: _onChange, ...props }) => {
        const onChange = (val) => {
          // 为【成员或成员组】&&【不和其他字段比较】时，转换obj为id字符串
          let _val = val;
          if (field.fieldValueType == EnumType.member) {
            _val = val?.map?.((v) => {
              return JSON.stringify(v);
            });
          }
          if (field.fieldValueType == EnumType.group) {
            _val = val?.map?.((v) => {
              return JSON.stringify(v);
            });
          }
          _onChange({ valueList: _val, conditionResEnum: undefined });
        };
        let _value = value?.valueList;
        if (field.fieldValueType == EnumType.member) {
          _value = value?.valueList?.map?.((v) => {
            if (typeof v === 'string') {
              return JSON.parse(v || '{}');
            }
            return v;
          });
        }
        if (field.fieldValueType == EnumType.group) {
          _value = value?.valueList?.map?.((v) => {
            if (typeof v === 'string') {
              return JSON.parse(v || '{}');
            }
            return v;
          });
        }
        return getComponents({
          ...props,
          onChange,
          fieldList: field,
          value: _value,
        });
      },
    };
  });
  return obj;
};
export const EnumComponentMatchConditionProps = {
  // 原来定义的对象属性看着好难受
  ...__transfer(),
  // 当前工单状态
  ORDERSTATUS: {
    conditions: [
      EnumCondition[EnumOperatorType.eq],
      EnumCondition[EnumOperatorType.ne],
      EnumCondition[EnumOperatorType.belong],
      EnumCondition[EnumOperatorType.notBelong],
    ],

    dataSource: [
      {
        value: '-10',
        get label () {
          return intl.get('8a9f9127-15c0-420c-b2d3-3c9913817fb1').d('未开始')
        },
      },
      {
        value: '10',
        get label () {
          return intl.get('27eda0ec-0c67-41fe-86f2-43f64afc4582').d('待领取')
        },
      },
      {
        value: '0',
        get label () {
          return intl.get('6e2ab200-8a4a-4f40-91a0-0c5bc27a6744').d('处理中')
        },
      },
      {
        value: '50',
        get label () {
          return intl.get('1fa1d23f-36f7-457f-8f00-9150bf00fb43').d('挂起')
        },
      },
      {
        value: '40',
        get label () {
          return intl.get('ef8ad41d-b301-4383-b778-87344dc069c9').d('已关闭')
        },
      },
      {
        value: '20',
        get label () {
          return intl.get('a5194e47-df5c-4ef8-8486-6c727c6c1396').d('已完成')
        },
      },
      {
        value: '120',
        get label () {
          return intl.get('dac29f2c-1cf3-445a-9746-fa40050326f4').d('加签中')
        },
      },
    ],

    getValueComponent: (props) => <ValueComponent {...props} />,
  },
  // 当前工单发起人
  CURRENT_ORDER_CREATE_USER: {
    conditions: [
      EnumCondition[EnumOperatorType.eq],
      EnumCondition[EnumOperatorType.ne],
      EnumCondition[EnumOperatorType.belong],
      EnumCondition[EnumOperatorType.notBelong],
    ],

    getValueComponent: (props) => <ValueComponent {...props} />,
  },
  // 当前工单处理人
  CURRENT_ORDER_HANDLER_USER: {
    conditions: [
      EnumCondition[EnumOperatorType.eq],
      EnumCondition[EnumOperatorType.ne],
      EnumCondition[EnumOperatorType.belong],
      EnumCondition[EnumOperatorType.notBelong],
      EnumCondition[EnumOperatorType.null],
      EnumCondition[EnumOperatorType.notNull],
    ],

    getValueComponent: (props) => <ValueComponent {...props} />,
  },
  // 当前工单处理组
  CURRENT_ORDER_HANDLER_GROUP: {
    conditions: [
      EnumCondition[EnumOperatorType.contain],
      EnumCondition[EnumOperatorType.noContain],
    ],

    getValueComponent: (props) => <ValueComponent {...props} />,
  },
  // 最近提交人
  RECENT_COMMITER: {
    conditions: [
      EnumCondition[EnumOperatorType.eq],
      EnumCondition[EnumOperatorType.ne],
    ],

    getValueComponent: (props) => <ValueComponent {...props} />,
  },
  // 最近转派人
  RECENT_ASSIGNER: {
    conditions: [
      EnumCondition[EnumOperatorType.eq],
      EnumCondition[EnumOperatorType.ne],
    ],

    getValueComponent: (props) => <ValueComponent {...props} />,
  },
  // 当前用户
  CURRENT_USER: {
    conditions: [
      EnumCondition[EnumOperatorType.belong],
      EnumCondition[EnumOperatorType.notBelong],
      // EnumCondition[EnumOperatorType.eqData],
      // EnumCondition[EnumOperatorType.neData]
    ],
    getValueComponent: (props) => <ValueComponent {...props} />,
  },
  // 扩展条件
  EXTENTIONS: {
    getValueComponent: (props) => <ValueComponent {...props} />,
  },
};

// 自定义按钮配置-启用条件-固有的字段
export const fiexedFieldList = [
  {
    fieldValueType: 'ORDERSTATUS',
    get fieldName () {
      return intl
        .get('2ebacfee-f30e-4f68-b437-a1d430b871ba')
        .d('当前工单状态')
    },
    fieldKey: 'ORDERSTATUS',
  },
  {
    fieldValueType: 'CURRENT_ORDER_CREATE_USER',
    get fieldName () {
      return intl
        .get('877986e9-1603-4cb2-a2ee-1cf772e4468c')
        .d('当前工单发起人')
    },
    fieldKey: 'CURRENT_ORDER_CREATE_USER',
  },
  {
    fieldValueType: 'CURRENT_ORDER_HANDLER_USER',
    get fieldName () {
      return intl
        .get('379edfaa-f481-4f7a-b98e-9520cb848d64')
        .d('当前工单处理人')
    },
    fieldKey: 'CURRENT_ORDER_HANDLER_USER',
  },
  {
    fieldValueType: 'CURRENT_ORDER_HANDLER_GROUP',
    get fieldName () {
      return intl
        .get('a3974ad4-e3de-4bb2-9814-23e67a6d8010')
        .d('当前工单处理组')
    },
    fieldKey: 'CURRENT_ORDER_HANDLER_GROUP',
  },
  // {
  //     fieldValueType: 'RECENT_COMMITER',
  //     fieldName: '最近提交人',
  //     fieldKey: 'RECENT_COMMITER',
  // },
  // {
  //     fieldValueType: 'RECENT_ASSIGNER',
  //     fieldName: '最近转派人',
  //     fieldKey: 'RECENT_ASSIGNER',
  // },
  {
    fieldValueType: 'CURRENT_USER',
    get fieldName () {
      return intl.get('51b40dd4-b42f-41dd-a33a-0413c7c3da2a').d('当前用户')
    },
    fieldKey: 'CURRENT_USER',
  },
];

export const EnumBtnAction = {
  front: 'frontEndAction',
  back: 'backEndAction',
  after: 'afterCompletionAction',
};

// 内置动作
export const btnBultinActions = {
  [EnumBtnAction.front]: [
    {
      id: 'jumpToUrl',
      name: 'jumpToUrl',
      get label () {
        return intl.get('6daf31d9-6fc7-4689-a962-9414d38fb7ba').d('跳转链接')
      },
      get description () {
        return intl.get('78579146-a124-4fc6-8b8f-2bf70e1791fe').d('在浏览器里打开配置的网页')
      },
      body: `async function reload({ ctx, params, currentSchema, next }) {
                if (ctx.isAort) {
                  return await next()
                }
                if(params.other && Object.hasOwnProperty.call(params.other,'formData') && Object.hasOwnProperty.call(params.other,'processId')){
                    if(params.other.formData){
                        window.localStorage.setItem('coverCreateFormData', JSON.stringify(params.other.formData));
                    }
                    if(params.other.processId){
                        let linkWorkOrderId = params.other.linkWorkOrder ? params.other.linkWorkOrderId : '';
                        if(ctx.baseName){
                            window.open(ctx.baseName + 'orderCreate?modelId='+params.other.processId+'&showType=create&testFlag='+ctx.isTest+'&linkWorkOrder='+(linkWorkOrderId || ''))
                        }else{
                            window.open('/orderCreate?modelId='+params.other.processId+'&showType=create&testFlag='+ctx.isTest+'&linkWorkOrder='+(linkWorkOrderId || ''))
                        }
                    }
                }else{
                    window.open(params.url)
                }
                await next();
            }`,
      // action的入参描述信息
      inputs: [
        {
          name: 'url',
          get label () {
            return intl.get('082da262-e6c1-455a-8d69-b6bacad58dc3').d('网页URL')
          },
          'x-props': {
            editable: true,
          },
        },
        {
          name: 'other',
          get label () {
            return intl.get('6fb75da3-56ac-4684-ad25-ca765a5daefe').d('其他参数')
          },
          'x-props': {
            editable: true,
          },
        },
      ],

      // action的出参描述信息
      outputs: [],
    },
    {
      id: 'nestPageModal',
      name: 'nestPageModal',
      get label () {
        return intl.get('b72e3626-e6e8-4cda-b552-3c2a8d86b9a4').d('内嵌网页的窗口')
      },
      get description () {
        return intl.get('e2d9bf62-ecfe-45e7-aba2-67dd035674b6').d('打开一个内嵌指定网页的弹窗')
      },
      // action的方法体
      body: `async function reload({ ctx, params, currentSchema, next }) {
                ctx.methods.openModal('nestPageModal', params);
                await next()
            }`,
      // action的入参描述信息
      inputs: [
        {
          name: 'title',
          get label () {
            return intl.get('8a0e62be-9435-417e-8972-a5f812f14583').d('弹窗标题')
          },
          'x-props': {
            editable: true,
          },
        },
        {
          name: 'url',
          get label () {
            return intl.get('082da262-e6c1-455a-8d69-b6bacad58dc3').d('网页URL')
          },
          'x-props': {
            editable: true,
          },
        },
        {
          name: 'isHiddenConfirm',
          get label () {
            return intl.get('efbca1dc-8544-4bf6-8ca6-130a14c50d30').d('是否隐藏底部按钮')
          },
          'x-props': {
            editable: true,
          },
        },
        {
          name: 'reloadAfterClose',
          get label () {
            return intl.get('f2cf9932-98d1-465b-9c19-4e8c53853a8d').d('窗口关闭后刷新页面')
          },
          'x-props': {
            editable: true,
          },
        },
      ],

      // action的出参描述信息
      outputs: [],
    },
    {
      id: 'confirmModal',
      name: 'confirmModal',
      get label () {
        return intl.get('a7e94647-19bd-4475-92bf-141c11511d0b').d('弹窗')
      },
      get description () {
        return intl.get('b99a3bb6-bde6-4010-a5c1-2e520f47c74e').d('点击按钮时，进行一个弹窗提示')
      },
      // action的方法体
      body: `function confirm({ ctx, params, currentSchema, next }) {
                ctx.methods.confirmModal({
                    title: params.title,
                    content: params.desc,
                    okText: params.okText,
                    cancelText: params.cancelText,
                }, () => {
                    next();
                });
            }`,
      // action的入参描述信息
      inputs: [
        {
          name: 'title',
          get label () {
            return intl.get('8a0e62be-9435-417e-8972-a5f812f14583').d('弹窗标题')
          },
          'x-props': {
            editable: true,
            get defaultValue () {
              return intl.get('bffb37bb-ae5a-4976-843e-a50cb88a8692').d('你确认执行此操作吗？')
            },
            maxLength: 50,
            required: true,
            rules: [
              {
                required: true,
                get message () {
                  return intl.get('3ff3b353-3922-476e-920c-643e8fba4d79').d('请输入必填项')
                },
              },
            ],
          },
        },
        {
          name: 'desc',
          get label () {
            return intl.get('501bd1ca-6687-4980-9ece-efff6b26cbd1').d('弹窗展示文字')
          },
          'x-props': {
            editable: true,
            maxLength: 500,
          },
        },
        {
          name: 'okText',
          get label () {
            return intl.get('37582135-48c5-4e52-8b81-7c1f2365931a').d('确认按钮文案')
          },
          'x-props': {
            editable: true,
            maxLength: 50,
            get defaultValue () {
              return intl.get('4253417c-d699-4eed-8c75-34d2a8b18a68').d('确认')
            },
          },
        },
        {
          name: 'cancelText',
          get label () {
            return intl.get('fcc29a76-ba69-4c7f-a494-7bf775b9f88e').d('取消按钮文案')
          },
          'x-props': {
            editable: true,
            maxLength: 50,
            get defaultValue () {
              return intl.get('19d6c313-9540-4042-b642-ebc6396ca0c7').d('取消')
            },
          },
        },
      ],

      // action的出参描述信息
      outputs: [],
    },
    {
      id: 'ChangeCRStatus',
      name: 'ChangeCRStatus',
      get label () {
        return 'Change CR Status'
      },
      get description () {
        return `
          ·When CR is in any 'Closed XX' status, L1.5 Change Management Team can change the status to other 'Closed XX' status by clicking on “Update Closed Code” button which is only visible to L1.5 Change Management Team.
        `
      },
      // action的方法体
      body: `function confirm({ ctx, params, currentSchema, next }) {
        params.width = 540;
        params.height = 260;
        params.reloadAfterClose = 0;
        params.maskClosable = false;
        params.isHiddenCancel = false;
        params.title = 'Change CR Status';
        ctx.methods.openModal('closeStatusChangeModal', params, currentSchema, next);
      }`,
      inputs: [],
      // action的出参描述信息,
      outputsIsForm: true,
      outputs: [
        {
          name: 'crStatus',
          get label () {
            return 'Close code'
          },
        }
      ],
    },
  ],

  [EnumBtnAction.back]: [],
  [EnumBtnAction.after]: [
    // {
    //     "id": "download",
    //     "name": "download",  // action的唯一标记
    //     "label": langUtil.t(defineMessages({ v: { id: "businessSetting.buttonManagement.actions.download", defaultMessage: "下载文件" } })), // action在页面显示的名称
    //     "description": "", // action的描述
    //     // action的方法体
    //     "body": `async function download({ ctx, params, currentSchema, next }) {
    //         if (params.url) {
    //             const a = document.createElement("a");
    //             a.href = params.url;
    //             document.querySelector('body').appendChild(a);
    //             a.click();
    //             document.querySelector('body').removeChild(a);
    //         };
    //         await next();
    //     }`,
    //     // action的入参描述信息
    //     "inputs": [
    //         {
    //             "name": 'url',
    //             "label": '文件链接',
    //             "typeInfo": {
    //                 "type": "string"
    //             },
    //             "description": "", // 入参的描述
    //             "required": true, // 入参是否必填
    //             "defaultValue": null, // 入参的默认值
    //             'x-props': {
    //                 'editable': true
    //             }
    //         }
    //     ],
    //     // action的出参描述信息
    //     "outputs": []
    // },
    // {
    //     "id": "reloadCustomTab",
    //     "name": "reloadCustomTab",  // action的唯一标记
    //     "label": langUtil.t(defineMessages({ v: { id: "businessSetting.buttonManagement.actions.reloadCustomTab", defaultMessage: "刷新自定义页签" } })),
    //     "description": langUtil.t(defineMessages({ v: { id: "businessSetting.buttonManagement.actions.reloadCustomTab.desc", defaultMessage: "刷新当前工单页面上的自定义页签" } })),
    //     // action的方法体
    //     "body": `async function reload({ ctx, params, currentSchema, next }) {
    //         ctx.methods && ctx.methods.reloadCustomTab && ctx.methods.reloadCustomTab();
    //         await next();
    //     }`,
    //     // action的入参描述信息
    //     "inputs": [],
    //     // action的出参描述信息
    //     "outputs": []
    // },
    {
      id: 'reload',
      name: 'reload', // action的唯一标记
      get label () {
        return intl.get('4da6d919-2154-4d0b-9668-caff4f5820fc').d('重载工单')
      },
      get description () {
        return intl.get('7405b5b0-0178-48c8-b5d9-35a13bf6390a').d('重新加载工单，刷新页面')
      },
      // action的方法体
      body: `async function reload({ ctx, params, currentSchema, next }) {
                ctx.methods && ctx.methods.reload && ctx.methods.reload();
                await next();
            }`,
      // action的入参描述信息
      inputs: [],
      // action的出参描述信息
      outputs: [],
    },
    {
      id: 'close',
      name: 'close', // action的唯一标记
      get label () {
        return intl.get('bb1b5995-7b8f-4fa2-9c20-f8156921bc43').d('关闭当前页面')
      }, // action在页面显示的名称
      get description () {
        return intl.get('3f70ce4d-d323-43fb-9524-49cb2448d0f4').d('关闭当前页面，回到工单列表')
      },
      // action的方法体
      body: `async function reload({ ctx, params, currentSchema, next }) {
                ctx.methods && ctx.methods.close && ctx.methods.close();
                await next();
            }`,
      // action的入参描述信息
      inputs: [],
      // action的出参描述信息
      outputs: [],
    },
    {
      id: 'nothing',
      name: 'nothing', // action的唯一标记
      get label () {
        return intl.get('4a9b5057-f2be-453f-9769-05950688b7e8').d('无任何动作')
      }, // action在页面显示的名称
      get description () {
        return intl.get('4a9b5057-f2be-453f-9769-05950688b7e8').d('无任何动作')
      },// action的描述
      // action的方法体
      body: '',
      // action的入参描述信息
      inputs: [],
      // action的出参描述信息
      outputs: [],
    },
  ],
};

// 内置参数
export const btnBultinParams = [
  {
    get label () {
      return intl.get('1a95968b-b7c9-43cb-8c2c-bca32e8fcd81').d('当前工单')
    },
    action: 'CURRENT_WORK_ORDER',
    executionId: 'current_work_order',
    type: ItemTypes.BOX,
    expression: 'currentWorkOrder.formData',
    isLeaf: true,
  },
  // {
  //     label: langUtil.t(defineMessages({ v: { id: "businessSetting.buttonManagement.actions.params.workOderInfo", defaultMessage: "工单信息" } })),
  //     action: 'WORK_ORDER_INFO',
  //     executionId: 'workOder_info',
  //     children: [
  //         {
  //             expression: `workOder_info.transferScope`,
  //             name: 'transferScope',
  //             label: langUtil.t(defineMessages({ v: { id: "businessSetting.buttonManagement.actions.params.assignScope", defaultMessage: "转派范围" } })),
  //         },
  //         {
  //             expression: `workOder_info.currentNodeHanlder`,
  //             name: 'currentNodeHanlder',
  //             label: langUtil.t(defineMessages({ v: { id: "businessSetting.buttonManagement.actions.params.curNodeHanlder", defaultMessage: "当前节点处理人" } })),
  //         },
  //         {
  //             expression: `workOder_info.currentNodeHanlderGroup`,
  //             name: 'currentNodeHanlderGroup',
  //             label: langUtil.t(defineMessages({ v: { id: "businessSetting.buttonManagement.actions.params.curNodeHanldleGroup", defaultMessage: "当前节点处理组" } })),
  //         },
  //         {
  //             expression: `workOder_info.currentWorkOderCreater`,
  //             name: 'currentWorkOderCreater',
  //             label: langUtil.t(defineMessages({ v: { id: "businessSetting.buttonManagement.actions.params.workOrderCreator", defaultMessage: "当前工单发起人" } })),
  //         }
  //     ]
  // }
];

export const backAcitonBultinParams = [
  {
    get label () {
      return intl.get('b71dbf8f-f058-475b-aeb9-7270c1edd197').d('工单属性')
    },
    action: 'CURRENT_WORK_ORDER',
    executionId: 'current_work_order',
    children: [
      {
        expression: `currentWorkOrder.bizKey`,
        name: 'bizKey',
        get label () {
          return intl.get('2d8d1703-27ad-4222-b626-431d0acc8f96').d('工单编号')
        },
      },
      {
        expression: `currentWorkOrder.status`,
        name: 'status',
        get label () {
          return intl.get('6a020eff-a0ef-44ec-85bd-ec3f42b5e922').d('工单状态')
        },
      },
      {
        expression: `currentWorkOrder.nodeId`,
        name: 'nodeId',
        get label () {
          return intl.get('a15af577-2e24-4b54-aec0-ee9f8e4552dd').d('当前节点')
        },
      },
      {
        expression: `currentWorkOrder.handlePerson`,
        name: 'handlePerson',
        get label () {
          return intl.get('b9a49fbd-7b74-4d69-a13f-c770f5f26952').d('当前处理人')
        },
      },
      {
        expression: `currentWorkOrder.sponsorPerson`,
        name: 'sponsorPerson',
        get label () {
          return intl.get('57c32dcc-b492-4a6c-acfc-f4398efad15c').d('工单创建人')
        },
      },
      {
        expression: `currentWorkOrder.operator`,
        name: 'operator',
        get label () {
          return intl.get('328caf60-a3b6-4ac6-91a2-12b3f3f0c7af').d('操作人')
        },
      },
    ],
  },
];

export const EnumProcessingType = [
  // {
  //     value:'approve',
  //     title:'审批'
  // },{
  //     value:'modify',
  //     title:'修改'
  // },
  {
    value: 'history',
    get title () {
      return intl.get('082da262-e6c1-455a-8d69-b6bacad58dc3').d('网页URL')
    },
  },
  // ,{
  //     value:'counterSigned',
  //     title:'会签'
  // }
];
