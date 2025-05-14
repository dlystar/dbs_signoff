import { intl } from '@chaoswise/intl';
import React, { useRef, useEffect, useMemo } from 'react';
import { observer } from '@chaoswise/cw-mobx';
import { isEmpty, isNil } from 'lodash-es'; // @chaoswise/utils
import { setAnchorDirDataByForm } from '../../utils';
import { linkageAction as linkageActionV2 } from '../../utils.new'
import Prompt from '@/utils/prompt';
import { formChangeIncludesCMDB } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FlowDesign/Drawer/components/FormConf/utils/index.js';
import { setUserInfoBySyncInfo } from '@/pages/Reception/OrderCreate/api';
import { langUtil } from '@/lang';
import { choiceFormTypeList } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/AdvancedSetting/constants'
import { eventManager } from '@/utils/T/core/helper';
import { getFlatSchema } from '../../../BusinessSetting/ProcessManagement/CreateNew/FormDesign/FormEngine/FormRender/util/handleSchema';
import Dynamic from "@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/FormEngine/FormRender/Dynamic";
import { useMemoizedFn } from 'ahooks';

const DetailContent = ({
  schema,
  formData,
  detailContentStore,
  detailSiderStore,
  formRef,
  flag,
  detailFooterStore,
  cacheRequest,
  orderContainerID,
  isType,
  getDictPageListWithCache,
  getDictByIdWithCache,
  setShowSide
}) => {
  const {
    // formData,
    getFieldLinkage,
    orderInfo,
    views,
    edits,
    initFieldLinkRes,
  } = detailContentStore || {};

  const { updateState: orderSiderUpdateState } = detailSiderStore || {};

  const {
    formId,
    mdlDefKey,
    readOnlyflag,
    processInstanceId,
  } = orderInfo || {};
  const { loadingAsync } = detailFooterStore || {};

  // 因为字段联动只会返回被改变的表格列的属性，所以我们要把之前的列的属性记下来，不然每次字段联动之前的属性就会丢失
  // 在表格被设置为隐藏的时候表格组件会被卸载，所以这个状态只能放到全局
  const tableColMapRef = useRef({});
  // 把表格字段联动的结果存起来，后面有用
  const linkTableRef = useRef({});
  const delayExecDynamicFormRef = useRef(false)

  useEffect(() => {
    console.log('拿到schema', schema, performance.now());
  }, [schema])

  // useEffect(() => {
  //   return clearUserInfo;
  // }, []);

  useEffect(() => {
    const callback = () => {
      if (
        formRef.current &&
        formRef.current.util &&
        formRef.current.util.linkage
      ) {
        onFormInitHandle({ linkage: formRef.current.util.linkage });
      }
    }
    eventManager.on('on-init-form', callback);
    return () => {
      eventManager.off('on-init-form', callback);
    };
  }, []);

  const getCodeBykind = useMemo(() => {
    let obj = {};
    const getData = (properties, obj) => {
      for (let [k, v] of Object.entries(properties || {})) {
        if (v.kind && v.userParentId) {
          // 普通字段
          if (obj[v.userParentId]) {
            obj[v.userParentId]?.push({
              kind: v.kind,
              key: v.key,
            });
          } else {
            obj[v.userParentId] = [
              {
                kind: v.kind,
                key: v.key,
              },
            ];
          }
        } else if (v.kind && v.userId && v.linkCode) {
          // 公共字段
          if (obj[v.linkCode]) {
            obj[v.linkCode]?.push({
              kind: v.kind,
              key: v.key,
            });
          } else {
            obj[v.linkCode] = [
              {
                kind: v.kind,
                key: v.key,
              },
            ];
          }
        } else if (v['x-component'] == 'ADD_GROUP') {
          getData(v.properties, obj);
        }
      }
    };
    if (schema.properties) {
      getData(schema.properties, obj);
    }
    return obj;
  }, [schema]);


  // 表单加载
  const onFormInitHandle = useMemoizedFn(async ({ linkage, values }) => {
    if (!isEmpty(schema)) {
      // 对字段联动的结果进行处理
      const { triggerFields = [] } = initFieldLinkRes || {};
      flag && linkagePermission(linkage, permissionMap, readOnlyflag);
      linkageActionV2({ linkage, linkageData: triggerFields, formData: values })
      /* 设置锚点目录显示的分组信息 */
      setAnchorDirDataByForm({
        update: orderSiderUpdateState,
        key: 'anchorDirDataByForm',
        triggerFields,
        formDataInfo: schema || {},
        orderContainerID: orderContainerID,
      });
      // 执行完字段联动再取表单值
      const { actions } = formRef.current?.util || {};
      const { values: nValues } = await actions?.getFormState()
      await asyncMemberInfo4Init(linkage, nValues);
    }
    setShowSide(true);
    const params = {
      processInstanceId,
      preNum: mdlDefKey,
      formId,
      values: formData,
      fieldCode: 'NormalCRNote',
      eventType: 'ONCHANGE',
      fieldEvent: sessionStorage.getItem(`UPLOAD_OPERATOR_crStatus`),
      formTriggerType: choiceFormTypeList.PROCESS_FORM.value
    }
    const preNum = window.DOSM_CONFIG?.dbs?.cr?.prenum === orderInfo?.preNum;
    // Normal CR 工单才需要设置该字段联动
    if (preNum) {
      setTimeout(() => {
        delayLobCountryFieldLinkage(linkage, formData, params);
      }, 0);
    }
  })

  // 延迟执行字段联动-LOB && CountryOfOrigin
  const delayLobCountryFieldLinkage = async (linkage, formData, params) => {
    const linkageData = await getFieldLinkage(params);
      if (linkageData && linkageData.triggerFields?.length) {
        linkageActionV2({ linkage, linkageData: linkageData.triggerFields, formData: formData })
      }
  }

  /**
    * 初始化工单同步成员信息
    * 在项目上有处理人收到的工单，成员信息丢失的问题，不能确定是在什么场景下会导致信息丢失
    * 所以我们在工单初始化的时候去做个同步
  */
  const asyncMemberInfo4Init = async (linkage, formData) => {
    const userInfo = {
      formId: formId,
      memberParamVoList: [],
    };
    const userGroupInfo = {
      formId: formId,
      memberParamVoList: [],
    }
    // 字段拉平，方便使用
    const fieldListMap = getFlatSchema(schema);
    Object.values(fieldListMap || {})?.forEach((item) => {
      if (item?.['x-props']?.['memberMes']?.['selected']?.length) {
        // 这个成员字段有值才需要去同步信息
        const value = formData[item.key];
        if (value && value.length) {
          // 由于历史原因，原来通过公共字段配置的同步成员信息字段并不存在userParentId
          // 所以这里我们需要兼容处理一下这种情况
          const selectedFields = item['x-props']['memberMes']['selected'].map(s => s.attrID);
          // 先找出所有的同步成员信息字段
          const userInfoFields = Object.values(fieldListMap).filter(
            (_item) => _item.userParentId === item.dropId || _item.linkCode === item.dropId || selectedFields.includes(_item.attrId)
          );
          // 我们需要把那些已经有值的字段过滤出去
          // 只需要同步那些没有值的字段
          const subMemberList = userInfoFields
            ?.map((i) => ({
              kind: i.kind,
              type: i['x-component'],
              key: i.key,
            }))
            ?.filter((i) => !formData[i.key]);
          if (subMemberList?.length) {
            // 只有成员组组件且仅选用户组selectType==group
            if (item['x-props'].selectType === 'group') {
              if (!isNil(value[0].groupId)) {
                userGroupInfo.memberParamVoList.push({
                  memberWigdetId: item.key,
                  groupId: value[0].groupId,
                  subMemberList,
                });
              }
            } else {
              if (!isNil(value[0].userId)) {
                userInfo.memberParamVoList.push({
                  memberWigdetId: item.key,
                  userId: value[0].userId,
                  subMemberList,
                });
              }
            }
          }
        }
      }
    });
    if (userInfo.memberParamVoList.length) {
      const res = await setUserInfoBySyncInfo(userInfo);
      if (res.data && res.data.triggerFields) {
        linkageActionV2({ linkage, linkageData: res.data.triggerFields })
      }
    }
    if (userGroupInfo.memberParamVoList.length) {
      const res = await setUserInfoBySyncInfo(userGroupInfo, true);
      if (res.data && res.data.triggerFields) {
        linkageActionV2({ linkage, linkageData: res.data.triggerFields })
      }
    }
  };

  // 字段值改变
  const onFieldValueChange = useMemoizedFn(({
    linkage,
    fieldState,
    values,
    actions,
    toGetUserInfo,
    formTriggerType = choiceFormTypeList.PROCESS_FORM.value,
    baseActions,
  }) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (formTriggerType !== choiceFormTypeList.TABLE_FORM.value) {
          loadingAsync && loadingAsync(true);
        }
        const xProps = fieldState.props?.['x-props'] || {};
        const { fieldCode } = fieldState;
        const { values: _formData = {} } = (await actions.getFormState()) || {};
        if (toGetUserInfo) {
          const keys = getCodeBykind[fieldState?.props?.dropId] || [];
          const memberWigdetId = fieldState?.fieldCode || '';
          const selected = xProps['memberMes']['selected'];
          let subMemberList = selected?.map((i) => {
            return {
              kind: i.kind,
              type: i.fieldType,
              key: keys?.filter((item) => item.kind == i.kind)?.[0]?.key || '',
            };
          });
          const isGroup = xProps.selectType === 'group';
          const needGetUserInfo = {
            formId: formId,
            memberParamVoList: [
              {
                memberWigdetId, // 成员组件id
                [isGroup ? 'groupId' : 'userId']: isGroup ? values?.[memberWigdetId]?.[0]?.['groupId'] : values?.[memberWigdetId]?.[0]?.['userId'], //成员组件选中的userId
                subMemberList, // 获取孩子
              },
            ],
          };
          const customTriggerMap = await setUserInfoBySyncInfo(needGetUserInfo, isGroup);
          if (!customTriggerMap.data) {
            Prompt.error(
              customTriggerMap.msg ||
              langUtil.t(
                intl
                  .get('89ebe240-bf6d-41f7-bfd8-9d90079561ff')
                  .d('表单数据异常，请检查用户中心数据或修改表单')
              )
            );
          } else {
            const { triggerFields } = customTriggerMap?.data || {};
            linkageActionV2({ linkage, linkageData: triggerFields })
          }
        }
        if (xProps.needFieldLink !== true) return Promise.resolve()
        const params = {
          processInstanceId,
          preNum: mdlDefKey,
          formId,
          values,
          fieldCode,
          eventType: 'ONCHANGE',
          fieldEvent: sessionStorage.getItem(`UPLOAD_OPERATOR_${fieldCode}`),
          formTriggerType
        };
        sessionStorage.removeItem(`UPLOAD_OPERATOR_${fieldCode}`);
        // 前置字段触发之后可能会给某个字段设置值，所以要重新获取表单的值
        const { values: __values = {} } = (await actions.getFormState()) || {};
        if (formTriggerType === choiceFormTypeList.TABLE_FORM.value) {
          params.values[fieldState.tableKey][0].rowData = {
            ...params.values[fieldState.tableKey][0].rowData,
            ...__values,
            ...(baseActions?.getBaseValue() || {})
          }
        } else {
          const { getBaseValue = () => { } } = formRef?.current?.util?.baseActions || {};
          params.values = Object.assign(
            {},
            params.values,
            __values,
            getBaseValue()
          );
        }
        // 字段联动---------------start
        eventManager.emit('on-fieldLinkContent-change', {loading: true})
        const linkageData = await getFieldLinkage(params);
        if (linkageData && linkageData.triggerFields?.length) {
          // 处理字段联动的结果
          linkageActionV2({ linkage, linkageData: linkageData.triggerFields, formData: __values })
        }
        // 字段联动----------------end
      } catch (err) {
        console.error(err);
        reject(err);
      } finally {
        if (formTriggerType !== choiceFormTypeList.TABLE_FORM.value) {
          loadingAsync && loadingAsync(false);
        }
        resolve();
      }
    });
  });

  return (
    <div className='detail-content'>
      {!isEmpty(formData) && (
        <Dynamic
          defaultValue={formData}
          cacheRequest={cacheRequest}
          schema={schema}
          onFormInit={onFormInitHandle}
          onFieldValueChange={onFieldValueChange}
          orderInfo={orderInfo}
          getDictPageListWithCache={getDictPageListWithCache}
          getDictByIdWithCache={getDictByIdWithCache}
          orderContainerID={orderContainerID}
          ref={formRef}
        />
      )}
    </div>
  );
};

const clearUserInfo = () => {
  localStorage.removeItem('superiors');
};
export default observer(DetailContent);
