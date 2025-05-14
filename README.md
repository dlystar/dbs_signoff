import { intl } from '@chaoswise/intl';
import { theme } from '@/theme';
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import { observer } from '@chaoswise/cw-mobx';
import { Anchor } from '@chaoswise/ui';
import { langUtil } from '@/lang';
import DoScrollbars from '@/components/DoScrollbars
import { EnumSatisfyTypeValue } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/AdvancedSetting/constants/dynamicForm';
import { EnumType } from '@/constants/common/formType';
import { isNil, isEmpty, merge } from 'lodash-es'
import { getTableLinkage, handleValue } from './utils'
import { helper } from '@/utils/T';
import { eventManager } from '@/utils/T/core/helper';
// options.isIgnoreRequired
// options.disabled
export const linkageAction = ({ linkage, linkageData = [], formData, permissionMap = {}, options }) => {
    if (!linkageData || !linkageData.length) return {};
    // 把字段1的值赋予字段2，也就是给字段2设置值
    linkageData.forEach((item, index) => {
        if (!item.tableCode && item.copyValueSetOtherField && !isNil(formData?.[item.key])) {
            item.copyValueSetOtherFieldList?.forEach(_item => {
                const { fieldCode, type } = _item;
                const tempIdx = linkageData.findIndex(na => na.fieldCode === fieldCode);
                let value = [formData[item.key] || '']
                if ([EnumType.group, EnumType.member, EnumType.selectMany, EnumType.checkbox].includes(type)) {
                    value = [...formData[item.key] || []]
                }
                if (tempIdx > -1) {
                    const temp = linkageData[tempIdx]
                    if (temp.needSetValue !== true || tempIdx < index) {
                        Object.assign(temp, {
                            needSetValue: true,
                            value
                        })
                    }
                } else {
                    linkageData.push({
                        key: fieldCode,
                        fieldCode: fieldCode,
                        type: type,
                        needSetValue: true,
                        value
                    })
                }
            })
        }
    })
    const fieldStateMap = {}, linkTable = {}
    linkageData.forEach(v => {
        if (v.tableCode && v.tableColumnCode) {
            transferLinkageState4Table(linkTable, v, permissionMap, options)
        } else {
            // 这里是配置项标签页字段下面的标签显示/隐藏的，比较特殊，原来就这么写的，先别动
            if (v.type == EnumType.dpConfigTab && !isNil(v.hidden)) {
                if (v.hidden) {
                    linkage && linkage.cmdbTabHideList(v.key, linkageData.filter(item => item.hidden === true).map((item) => item.key));
                } else {
                    linkage && linkage.cmdbTabShowList(v.key, linkageData.filter(item => item.hidden === false).map((item) => item.key))
                }
            }
            if (v.key) {
                const { state, componentState } = transferLinkageState(v, permissionMap, options)
                if (!isEmpty(state) || !isEmpty(componentState)) {
                    fieldStateMap[v.key] = {
                        state: merge(fieldStateMap[v.key]?.state || {}, state),
                        componentState: merge(fieldStateMap[v.key]?.componentState || {}, componentState || {})
                    }
                }
            }
            if (v.setPopUps) {
                linkage && linkage.popupModal('', v.popUpsContent)
            }
        }
    })
    Object.keys(linkTable).forEach(k => {
        if (!fieldStateMap[k]) {
            fieldStateMap[k] = {}
        }
        if (!fieldStateMap[k].componentState) {
            fieldStateMap[k].componentState = {}
        }
        fieldStateMap[k].componentState['linkTable'] = linkTable[k]
    })
    console.log('fieldStateMap', fieldStateMap)
    eventManager.emit('on-fieldLinkContent-change', {loading: false})
    if (!isEmpty(fieldStateMap)) {
        linkage && linkage.batchSetFieldsState(fieldStateMap)
    }
    return {
        fieldStateMap,
        linkTable
    }
}

const transferLinkageState = (fieldProps, permissionMap, options) => {
    const state = {}, componentState = {};
    if (!isNil(fieldProps.hidden)) {
        state.display = !fieldProps.hidden
        // spacil handel "ProjectCutoverSignoff" field, when set hidden, just set style display -- temporary, when syan code ready, will remove
        const signoffKeys = ['TestingSignoff', 'ProjectCutoverSignoff', 'HeightenSignoff', 'ProjectCutoverIDRSignoff', 'OtherSignoff']
        if(signoffKeys.includes(fieldProps.key)){
            state.display = true
            componentState.styleDisplay = fieldProps.hidden ? 'none' : 'block'
        }
    }
    if (!isNil(fieldProps.mustWrite)) {
        state.required = fieldProps.mustWrite
    }
    if (!isNil(fieldProps.readOnly)) {
        componentState.disabled = fieldProps.readOnly
        // state.readOnly = fieldProps.readOnly
        // state.editable = !fieldProps.readOnly
    }
    // 在有些场景下会强制忽略必填校验，如：模板
    if (options?.isIgnoreRequired) {
        state.required = false
    }
    // 所有字段只读
    if (options?.disabled) {
        state.disabled = true
        state.readOnly = true
        state.editable = false
    }
    // 处理权限，工单详情页会有字段权限控制字段可见&可编辑
    // 可编辑字段是可见字段的子集
    const { needShowFieldList, needEditableFieldList } = permissionMap || {};
    if (needShowFieldList && needShowFieldList.length) {
        if (!needShowFieldList.some(sh => sh.key === fieldProps.key)) {
            // 可见权限字段中没有这个字段，那这个字段就不能看到
            state.display = false
        }
        if (!needEditableFieldList.some(sh => sh.key === fieldProps.key)) {
            // 可编辑权限字段中没有这个字段，那这个字段就不可编辑
            state.disabled = true
            state.readOnly = true
            state.editable = false
        }
    }
    // 清空字段值
    if (fieldProps.clearFieldValue) {
        state.value = null
    }
    // 设置字段值
    if (fieldProps.needSetValue) {
        if (fieldProps.type !== 'TABLE_FORM') {
            state.value = handleValue(fieldProps.value, fieldProps.type)
        }
    }
    // 显示选项
    if (fieldProps.showOptions === true) {
        componentState['filterObj'] = {
            type: EnumSatisfyTypeValue.showOptions,
            values: fieldProps.optionValue,
        }
    }
    // 隐藏选项
    if (fieldProps.showOptions === false) {
        componentState['filterObj'] = {
            type: EnumSatisfyTypeValue.hideOptions,
            values: fieldProps.optionValue,
        }
    }
    // 追加字段值
    if (fieldProps.additionOption) {
        componentState['additionOptions'] = fieldProps.additionOptionValue
    }
    // 改变选项——自定义字段联动
    if (fieldProps.changeOptins) {
        componentState['changeOptions'] = fieldProps.optionValue || []
    }
    // 给表格字段设置值——自定义字段联动
    if (fieldProps.needSetTableValue) {
        const { value } = fieldProps || {};
        const _value = [];
        if (value && value?.length) {
            value.forEach((v) => {
                const rowData = {};
                Object.keys(v.columnDataMap || {})?.forEach((k) => {
                    rowData[k] = v.columnDataMap[k]?.fieldValueObj?.value;
                });
                _value?.push({
                    id: v.rowId,
                    rowNum: v.rowNum,
                    rowData,
                    rowIsDel: v.rowIsDel
                });
            });
        }
        state.value = _value
    }
    if (fieldProps.changeUserRange) {
        componentState['changeOptions'] = fieldProps.optionValue || []
    }
    if (fieldProps.changeUserGroupRange) {
        componentState['changeOptions'] = fieldProps.optionValue || []
    }
    // needSetFieldHint
    if (fieldProps.needSetNode) {
        componentState['changedFieldHint'] = helper.tryParse(fieldProps.needSetNodeValue || '')
    }
    if (fieldProps.needDateRange) {
        componentState['dateRange'] = fieldProps.dateRange
    }
    // setErrors
    if (fieldProps.showPrompt === true) {
        state.errors = fieldProps.promptContent || ''
        // 这里把promptContent作为组件的属性传下去
        // 表格组件内部也有个检验逻辑，会覆盖掉promptContent，
        componentState.promptContent = fieldProps.promptContent || ''
    }
    // clearErrors
    if (fieldProps.showPrompt === false) {
        state.errors = []
        componentState.promptContent = ''
    }
    return { state, componentState }
}
const transferLinkageState4Table = (linkTable, fieldProps, permissionMap, options) => {
    const tableLinkage = getTableLinkage()
    const { tableCode, tableColumnCode, rowNum } = fieldProps
    if (!isNil(fieldProps.hidden)) {
        if (fieldProps.hidden) {
            tableLinkage.hide(linkTable, tableCode, tableColumnCode, rowNum);
        } else {
            tableLinkage.show(linkTable, tableCode, tableColumnCode, rowNum);
        }
    }
    if (!isNil(fieldProps.mustWrite)) {
        if (fieldProps.mustWrite) {
            tableLinkage.required(linkTable, tableCode, tableColumnCode, rowNum);
        } else {
            tableLinkage.notRequired(linkTable, tableCode, tableColumnCode, rowNum);
        }
    }
    if (!isNil(fieldProps.readOnly)) {
        if (fieldProps.readOnly) {
            tableLinkage.disabled(linkTable, tableCode, tableColumnCode, rowNum);
        } else {
            tableLinkage.editable(linkTable, tableCode, tableColumnCode, rowNum);
        }
    }
    // 在有些场景下会强制忽略必填校验，如：模板
    if (options?.isIgnoreRequired) {
        tableLinkage.notRequired(linkTable, tableCode, tableColumnCode, rowNum);
    }
    // 处理权限，工单详情页会有字段权限控制字段可见&可编辑
    // 可编辑字段是可见字段的子集
    const { needShowFieldList, needEditableFieldList } = permissionMap || {};
    if (needShowFieldList && needShowFieldList.length) {
        if (!needShowFieldList.some(sh => sh.key === tableColumnCode)) {
            // 可见权限字段中没有这个字段，那这个字段就不能看到
            tableLinkage.hide(linkTable, tableCode, tableColumnCode, rowNum);
        }
        if (!needEditableFieldList.some(sh => sh.key === tableColumnCode)) {
            // 可编辑权限字段中没有这个字段，那这个字段就不可编辑
            tableLinkage.disabled(linkTable, tableCode, tableColumnCode, rowNum);
        }
    }
    // 清空字段值
    if (fieldProps.clearFieldValue) {
        tableLinkage.value(linkTable, tableCode, tableColumnCode, rowNum, null);
    }
    // 设置字段值
    if (fieldProps.needSetValue) {
        tableLinkage.value(linkTable, tableCode, tableColumnCode, rowNum, handleValue(fieldProps.value, fieldProps.type));
    }
    // 字段赋值
    if (fieldProps.copyValueSetOtherField) {
        fieldProps.copyValueSetOtherFieldList.forEach((item, index) => {
            let _value = null;
            if (fieldProps.value?.length >= 0 && fieldProps.value[index]) {
                _value = fieldProps.value[index];
            }
            tableLinkage.value(
                linkTable,
                item.tableCode,
                item.fieldCode,
                rowNum,
                _value
            );
        });
    }
    // 显示选项
    if (fieldProps.showOptions === true) {
        tableLinkage.enum(linkTable, tableCode, tableColumnCode, rowNum, {
            type: EnumSatisfyTypeValue.showOptions,
            values: fieldProps.optionValue,
        });
    }
    // 隐藏选项
    if (fieldProps.showOptions === false) {
        tableLinkage.enum(linkTable, tableCode, tableColumnCode, rowNum, {
            type: EnumSatisfyTypeValue.hideOptions,
            values: fieldProps.optionValue,
        });
    }
    // 改变选项
    if (fieldProps.changeOptins) {
        tableLinkage.changeOptions(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.optionValue || []
        );
    }
    // 追加字段值
    if (fieldProps.additionOption) {
        tableLinkage.additionOptions(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.additionOptionValue
        );
    }
    if (fieldProps.changeUserRange) {
        tableLinkage.changeOptions(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.optionValue || []
        );
    }
    if (fieldProps.changeUserGroupRange) {
        tableLinkage.changeOptions(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.optionValue || []
        );
    }
import { EnumSatisfyTypeValue } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/AdvancedSetting/constants/dynamicForm';
import { EnumType } from '@/constants/common/formType';
import { isNil, isEmpty, merge } from 'lodash-es'
import { getTableLinkage, handleValue } from './utils'
import { helper } from '@/utils/T';
import { eventManager } from '@/utils/T/core/helper';
// options.isIgnoreRequired
// options.disabled
export const linkageAction = ({ linkage, linkageData = [], formData, permissionMap = {}, options }) => {
    if (!linkageData || !linkageData.length) return {};
    // 把字段1的值赋予字段2，也就是给字段2设置值
    linkageData.forEach((item, index) => {
        if (!item.tableCode && item.copyValueSetOtherField && !isNil(formData?.[item.key])) {
            item.copyValueSetOtherFieldList?.forEach(_item => {
                const { fieldCode, type } = _item;
                const tempIdx = linkageData.findIndex(na => na.fieldCode === fieldCode);
                let value = [formData[item.key] || '']
                if ([EnumType.group, EnumType.member, EnumType.selectMany, EnumType.checkbox].includes(type)) {
                    value = [...formData[item.key] || []]
                }
                if (tempIdx > -1) {
                    const temp = linkageData[tempIdx]
                    if (temp.needSetValue !== true || tempIdx < index) {
                        Object.assign(temp, {
                            needSetValue: true,
                            value
                        })
                    }
                } else {
                    linkageData.push({
                        key: fieldCode,
                        fieldCode: fieldCode,
                        type: type,
                        needSetValue: true,
                        value
                    })
                }
            })
        }
    })
    const fieldStateMap = {}, linkTable = {}
    linkageData.forEach(v => {
        if (v.tableCode && v.tableColumnCode) {
            transferLinkageState4Table(linkTable, v, permissionMap, options)
        } else {
            // 这里是配置项标签页字段下面的标签显示/隐藏的，比较特殊，原来就这么写的，先别动
            if (v.type == EnumType.dpConfigTab && !isNil(v.hidden)) {
                if (v.hidden) {
                    linkage && linkage.cmdbTabHideList(v.key, linkageData.filter(item => item.hidden === true).map((item) => item.key));
                } else {
                    linkage && linkage.cmdbTabShowList(v.key, linkageData.filter(item => item.hidden === false).map((item) => item.key))
                }
            }
            if (v.key) {
                const { state, componentState } = transferLinkageState(v, permissionMap, options)
                if (!isEmpty(state) || !isEmpty(componentState)) {
                    fieldStateMap[v.key] = {
                        state: merge(fieldStateMap[v.key]?.state || {}, state),
                        componentState: merge(fieldStateMap[v.key]?.componentState || {}, componentState || {})
                    }
                }
            }
            if (v.setPopUps) {
                linkage && linkage.popupModal('', v.popUpsContent)
            }
        }
    })
    Object.keys(linkTable).forEach(k => {
        if (!fieldStateMap[k]) {
            fieldStateMap[k] = {}
        }
        if (!fieldStateMap[k].componentState) {
            fieldStateMap[k].componentState = {}
        }
        fieldStateMap[k].componentState['linkTable'] = linkTable[k]
    })
    console.log('fieldStateMap', fieldStateMap)
    eventManager.emit('on-fieldLinkContent-change', {loading: false})
    if (!isEmpty(fieldStateMap)) {
        linkage && linkage.batchSetFieldsState(fieldStateMap)
    }
    return {
        fieldStateMap,
        linkTable
    }
}

const transferLinkageState = (fieldProps, permissionMap, options) => {
    const state = {}, componentState = {};
    if (!isNil(fieldProps.hidden)) {
        state.display = !fieldProps.hidden
        // spacil handel "ProjectCutoverSignoff" field, when set hidden, just set style display -- temporary, when syan code ready, will remove
        const signoffKeys = ['TestingSignoff', 'ProjectCutoverSignoff', 'HeightenSignoff', 'ProjectCutoverIDRSignoff', 'OtherSignoff']
        if(signoffKeys.includes(fieldProps.key)){
            state.display = true
            componentState.styleDisplay = fieldProps.hidden ? 'none' : 'block'
        }
    }
    if (!isNil(fieldProps.mustWrite)) {
        state.required = fieldProps.mustWrite
    }
    if (!isNil(fieldProps.readOnly)) {
        componentState.disabled = fieldProps.readOnly
        // state.readOnly = fieldProps.readOnly
        // state.editable = !fieldProps.readOnly
    }
    // 在有些场景下会强制忽略必填校验，如：模板
    if (options?.isIgnoreRequired) {
        state.required = false
    }
    // 所有字段只读
    if (options?.disabled) {
        state.disabled = true
        state.readOnly = true
        state.editable = false
    }
    // 处理权限，工单详情页会有字段权限控制字段可见&可编辑
    // 可编辑字段是可见字段的子集
    const { needShowFieldList, needEditableFieldList } = permissionMap || {};
    if (needShowFieldList && needShowFieldList.length) {
        if (!needShowFieldList.some(sh => sh.key === fieldProps.key)) {
            // 可见权限字段中没有这个字段，那这个字段就不能看到
            state.display = false
        }
        if (!needEditableFieldList.some(sh => sh.key === fieldProps.key)) {
            // 可编辑权限字段中没有这个字段，那这个字段就不可编辑
            state.disabled = true
            state.readOnly = true
            state.editable = false
        }
    }
    // 清空字段值
    if (fieldProps.clearFieldValue) {
        state.value = null
    }
    // 设置字段值
    if (fieldProps.needSetValue) {
        if (fieldProps.type !== 'TABLE_FORM') {
            state.value = handleValue(fieldProps.value, fieldProps.type)
        }
    }
    // 显示选项
    if (fieldProps.showOptions === true) {
        componentState['filterObj'] = {
            type: EnumSatisfyTypeValue.showOptions,
            values: fieldProps.optionValue,
        }
    }
    // 隐藏选项
    if (fieldProps.showOptions === false) {
        componentState['filterObj'] = {
            type: EnumSatisfyTypeValue.hideOptions,
            values: fieldProps.optionValue,
        }
    }
    // 追加字段值
    if (fieldProps.additionOption) {
        componentState['additionOptions'] = fieldProps.additionOptionValue
    }
    // 改变选项——自定义字段联动
    if (fieldProps.changeOptins) {
        componentState['changeOptions'] = fieldProps.optionValue || []
    }
    // 给表格字段设置值——自定义字段联动
    if (fieldProps.needSetTableValue) {
        const { value } = fieldProps || {};
        const _value = [];
        if (value && value?.length) {
            value.forEach((v) => {
                const rowData = {};
                Object.keys(v.columnDataMap || {})?.forEach((k) => {
                    rowData[k] = v.columnDataMap[k]?.fieldValueObj?.value;
                });
                _value?.push({
                    id: v.rowId,
                    rowNum: v.rowNum,
                    rowData,
                    rowIsDel: v.rowIsDel
                });
            });
        }
        state.value = _value
    }
    if (fieldProps.changeUserRange) {
        componentState['changeOptions'] = fieldProps.optionValue || []
    }
    if (fieldProps.changeUserGroupRange) {
        componentState['changeOptions'] = fieldProps.optionValue || []
    }
    // needSetFieldHint
    if (fieldProps.needSetNode) {
        componentState['changedFieldHint'] = helper.tryParse(fieldProps.needSetNodeValue || '')
    }
    if (fieldProps.needDateRange) {
        componentState['dateRange'] = fieldProps.dateRange
    }
    // setErrors
    if (fieldProps.showPrompt === true) {
        state.errors = fieldProps.promptContent || ''
        // 这里把promptContent作为组件的属性传下去
        // 表格组件内部也有个检验逻辑，会覆盖掉promptContent，
        componentState.promptContent = fieldProps.promptContent || ''
    }
    // clearErrors
    if (fieldProps.showPrompt === false) {
        state.errors = []
        componentState.promptContent = ''
    }
    return { state, componentState }
}
const transferLinkageState4Table = (linkTable, fieldProps, permissionMap, options) => {
    const tableLinkage = getTableLinkage()
    const { tableCode, tableColumnCode, rowNum } = fieldProps
    if (!isNil(fieldProps.hidden)) {
        if (fieldProps.hidden) {
            tableLinkage.hide(linkTable, tableCode, tableColumnCode, rowNum);
        } else {
            tableLinkage.show(linkTable, tableCode, tableColumnCode, rowNum);
        }
    }
    if (!isNil(fieldProps.mustWrite)) {
        if (fieldProps.mustWrite) {
            tableLinkage.required(linkTable, tableCode, tableColumnCode, rowNum);
        } else {
            tableLinkage.notRequired(linkTable, tableCode, tableColumnCode, rowNum);
        }
    }
    if (!isNil(fieldProps.readOnly)) {
        if (fieldProps.readOnly) {
            tableLinkage.disabled(linkTable, tableCode, tableColumnCode, rowNum);
        } else {
            tableLinkage.editable(linkTable, tableCode, tableColumnCode, rowNum);
        }
    }
    // 在有些场景下会强制忽略必填校验，如：模板
    if (options?.isIgnoreRequired) {
        tableLinkage.notRequired(linkTable, tableCode, tableColumnCode, rowNum);
    }
    // 处理权限，工单详情页会有字段权限控制字段可见&可编辑
    // 可编辑字段是可见字段的子集
    const { needShowFieldList, needEditableFieldList } = permissionMap || {};
    if (needShowFieldList && needShowFieldList.length) {
        if (!needShowFieldList.some(sh => sh.key === tableColumnCode)) {
            // 可见权限字段中没有这个字段，那这个字段就不能看到
            tableLinkage.hide(linkTable, tableCode, tableColumnCode, rowNum);
        }
        if (!needEditableFieldList.some(sh => sh.key === tableColumnCode)) {
            // 可编辑权限字段中没有这个字段，那这个字段就不可编辑
            tableLinkage.disabled(linkTable, tableCode, tableColumnCode, rowNum);
        }
    }
    // 清空字段值
    if (fieldProps.clearFieldValue) {
        tableLinkage.value(linkTable, tableCode, tableColumnCode, rowNum, null);
    }
    // 设置字段值
    if (fieldProps.needSetValue) {
        tableLinkage.value(linkTable, tableCode, tableColumnCode, rowNum, handleValue(fieldProps.value, fieldProps.type));
    }
    // 字段赋值
    if (fieldProps.copyValueSetOtherField) {
        fieldProps.copyValueSetOtherFieldList.forEach((item, index) => {
            let _value = null;
            if (fieldProps.value?.length >= 0 && fieldProps.value[index]) {
                _value = fieldProps.value[index];
            }
            tableLinkage.value(
                linkTable,
                item.tableCode,
                item.fieldCode,
                rowNum,
                _value
            );
        });
    }
    // 显示选项
    if (fieldProps.showOptions === true) {
        tableLinkage.enum(linkTable, tableCode, tableColumnCode, rowNum, {
            type: EnumSatisfyTypeValue.showOptions,
            values: fieldProps.optionValue,
        });
    }
    // 隐藏选项
    if (fieldProps.showOptions === false) {
        tableLinkage.enum(linkTable, tableCode, tableColumnCode, rowNum, {
            type: EnumSatisfyTypeValue.hideOptions,
            values: fieldProps.optionValue,
        });
    }
    // 改变选项
    if (fieldProps.changeOptins) {
        tableLinkage.changeOptions(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.optionValue || []
        );
    }
    // 追加字段值
    if (fieldProps.additionOption) {
        tableLinkage.additionOptions(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.additionOptionValue
        );
    }
    if (fieldProps.changeUserRange) {
        tableLinkage.changeOptions(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.optionValue || []
        );
    }
    if (fieldProps.changeUserGroupRange) {
        tableLinkage.changeOptions(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.optionValue || []
        );
    }
    // needSetFieldHint
    if (fieldProps.needSetNode) {
        tableLinkage.setFieldHint(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            helper.tryParse(fieldProps.needSetNodeValue || '')
        );
    }
    if (fieldProps.needDateRange) {
        tableLinkage.setDateRange(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.dateRange
        );
    }
}

    // needSetFieldHint
    if (fieldProps.needSetNode) {
        tableLinkage.setFieldHint(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            helper.tryParse(fieldProps.needSetNodeValue || '')
        );
    }
    if (fieldProps.needDateRange) {
        tableLinkage.setDateRange(
            linkTable,
            tableCode,
            tableColumnCode,
            rowNum,
            fieldProps.dateRange
        );
    }
}

import { withRouter } from 'react-router-dom';
import { keyBy, cloneDeep } from 'lodash-es';
import { eventManager } from '@/utils/T/core/helper';
import { EnumCollapseKey } from '@/pages/WorkOrderCommon/constants';
import cls from 'classnames'
import { EnumType } from '@/constants/common/formType';
import { getAnchorDirectory } from "@/customPages/Signoff/util.js";

const { Link } = Anchor;
/* 锚点目录 */

const AnchorDirectory = (props) => {
  /* 解析传参 */
  const {
    //anchorStatus, // 锚点目录状态：打开true,关闭false
    history,
    anchorDefaultLink, //默认传递到锚点位置
    orderContentStore,
    orderSiderStore,
    orderContainerID,
  } = props;
  const { updateState, basicActiveLink, activeCollapseArr, cacheCollapseArr } =
    orderContentStore || {};
  const { anchorDirData, updateState: orderSiderUpdateState } = orderSiderStore || {};
  const scrollRef = useRef();
  /* 锚点目录搞不明白，无法满足需求，页面首次加载的时候锚点无法定位到第一个面板，解决方法：手动样式设置锚点目录活动页钱位置 */
  const [currentActiveLink, setCurrentActiveLink] = useState(
    anchorDefaultLink ||
      `BASIC_ORDER_INFO_${orderContainerID}`
  );

  const firstFlagRef = useRef(true)
 
  useEffect(()=>{
    const searchACtiveAnchor = (state="") => {
      if(state) {
        const elements = document.querySelectorAll('[class^="LINK_BASIC_"]');
        let current = ""
        current = "#" + backCurrentActiveLink(anchorDirData,state)
        elements.forEach((item)=>{
          const href = item.querySelector("a").getAttribute("href")
          if(href === current){
            item.querySelector("a").click()
          }
        })
      }
    }
    eventManager.on(`on-iTabPage-click-tabPane-orderDetails_${orderContainerID}`, searchACtiveAnchor);
    getAnchorDirectory(orderContainerID)
    return ()=>{
      eventManager.off(`on-iTabPage-click-tabPane-orderDetails_${orderContainerID}`)
    }
  },[])

  const renderAnchorLink = (arr) => {
    return (arr || [])?.filter(a => a.display !== false)?.map((item) => {
      return (
        <Link
          href={`#${item?.id}`}
          className={cls(`LINK_${item?.id}`, { 'default-link-active': item?.id === currentActiveLink }) }
          key={item?.id}
          title={item?.title}
        >
          {item?.child && renderAnchorLink(item?.child)}
        </Link>
      );
    });
  };

  const backCurrentActiveLink = (arr=[],key="")=>{
    let current = "";
    if(arr.length === 0 || key == ""){
      return current
    }else {
      for (let index = 0; index < arr.length; index++) {
        if(current){
          break
        }else {

          const item = arr[index];
          if(item.id.includes(key)) {
            current = item.id;
            break;
          }
          if(item.child && item.child.length >0){
            current = backCurrentActiveLink(item.child, key)
            if(current){
              break
            }
          }
        }
      }
      return current
    }
  }
  /* 监听anchorDefaultLink-如果有目录锚点那么手动触发点击事件 */
  useEffect(() => {
    try {
      if (anchorDefaultLink && anchorDirData.length > 0) {
        const allLinkTags = document.getElementsByClassName('ant-anchor-link');
        for (let i = 0; i < allLinkTags?.length; i++) {
          const aLinkHrefValue = allLinkTags[i]
            .getElementsByTagName('a')[0]
            .getAttribute('href');
          //anchorDefaultLink格式："#ADD_GROUP_4173d51225"
          if (aLinkHrefValue === anchorDefaultLink) {
            allLinkTags[i]?.getElementsByTagName('a')[0]?.click();
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }, [anchorDirData, anchorDefaultLink]);

  const tabDataKeyVal = useMemo(() => {
    const basicData =
      anchorDirData?.find((item) => item.id.includes('BASIC_ORDER_INFO')) || {};
    let targetData = cloneDeep(basicData.child || {});
    if (Array.isArray(targetData)) {
      targetData.forEach((item) => {
        targetData.push(...(item.child || []));
      });
    }
    try {
      return keyBy(targetData, 'id');
    } catch (error) {
      console.log(error);
    }
    return {};
  }, [anchorDirData]);

  const setGroupHightLight = (id) => {
    if (window.DOSM_CONFIG.closeGroupBlink) return;
    requestIdleCallback((deadline) => {
      if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
        const $node = document.getElementById(id);
        if ($node) {
          $node.classList.add('blink');
          setTimeout(() => {
            $node.classList.remove('blink');
          }, 1000)
        }
      }
    }, { timeout: 3000 });
  }

  const handleClick = (e, link) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      const { tabParentId, type, sKey, panelId } = tabDataKeyVal[link?.href?.slice(1)] || {}; //点击了tab
      if (tabParentId) {
        if (panelId) {
          if (type === EnumType.expandContainer && firstFlagRef.current) {
            const domId = `BASIC_${tabParentId}_${orderContainerID}-panel-.$${panelId}`
            const dom = document.getElementById(domId)
            if (dom) {
              dom.style.display = 'block'
            }
            firstFlagRef.current = false
          }
          eventManager.emit(`on-AnchorDirectory-click-tabPane-${tabParentId}`, {
            activeKey: `.$${panelId}`,
            key: panelId
          });
        } else {
          eventManager.emit(`on-AnchorDirectory-click-tabPane-${tabParentId}`, {
            activeKey: `.$${sKey}`,
            key: sKey
          });
        }
      }
      const id = link?.href?.split('#')?.[1];
      if (
        link?.href?.search(/^#BASIC_.*/gi) == 0 &&
        basicActiveLink.length === 0
      ) {
        /* 这里就一步更新这个值，想办法让基本信息页签打开！*/
        updateState &&
          updateState({ basicActiveLink: [EnumCollapseKey.basicInfo] });
      } else {
        /* 点击自定义页签面板 */
        if (link?.href?.search(/^#BASIC_.*/gi) !== 0) {
          /* 查找这个ID对应的tagAlias值 */
          const currentFindObj =
            (cacheCollapseArr || [])?.filter((item) => item?.id === id)?.[0] ||
            {};
          const currentTagAlias = currentFindObj?.tagAlias || undefined;
          /* 判断当前激活的面板中是否存在，不存在那么添加 */
          if (
            currentTagAlias &&
            !activeCollapseArr?.includes(currentTagAlias) &&
            id
          ) {
            updateState &&
              updateState({
                activeCollapseArr: [...activeCollapseArr, currentTagAlias],
              });
          }
          orderSiderUpdateState &&
            orderSiderUpdateState({
              currentActiveKey: currentTagAlias,
            });
        }
      }
      /* 保存当前点击到页签 */
      setCurrentActiveLink(id);
      onAnchorLinkChange(link);
      // tab下的tabpanel如果直接设置了id,初始化的时候没激活的tabpanel处于display=none的状态
      // 此时这个锚点链接就会自动停留在这个tabpanel上，因此我们不能直接给tabpanel设置id
      // 为了点击锚点链接使得对应tabpanel高亮，我们给其父元素，tab设置样式即可
      if (tabParentId && type !== EnumType.expandContainer) {
        setGroupHightLight(`BASIC_${tabParentId}_${orderContainerID}`);
      } else {
        setGroupHightLight(id);
      }
    } catch (err) {
      console.log(err);
    }
  };
  const onAnchorLinkChange = (link) => {
    setTimeout(() => {
      if (!link) {
        return false;
      }
      const id = link?.split?.('#')?.[1];
      if (id) {
        const $node = document.getElementById(id);
        const dataType = $node?.dataset?.['type'];
        if ($node && dataType === 'extend_field') {
          if ($node.parentNode?.parentNode?.classList?.contains('ant-tabs-tabpane') && !$node.parentNode.parentNode.classList?.contains('ant-tabs-tabpane-active')) {
            setTimeout(() => {
              requestAnimationFrame(() => {
                const $nav = document.querySelector(`.LINK_${id}`);
                const $child = $nav?.childNodes?.[0];
                if ($child?.classList?.contains('ant-anchor-link-title-active')) {
                  $child?.classList?.remove('ant-anchor-link-title-active');
                }
                if ($nav?.classList?.contains('ant-anchor-link-active')) {
                  $nav?.classList?.remove('ant-anchor-link-active');
                }
              })
            }, 0);
            return
          }
        }
        setCurrentActiveLink(id);
        /* 判断如果默认值存在的情况下，页面滚动后清除默认值 */
        if (anchorDefaultLink && orderSiderUpdateState) {
          orderSiderUpdateState({
            anchorDefaultLink: undefined,
          });
        }
      }
    }, 20);
  };
  console.log('anchorDirData', anchorDirData)
  return (
    <div className='anchor-directory'>
      <div className='anchor-directory-head'>
        <span>
          {langUtil.t(
            intl.get('09349454-0808-4a8a-8454-831f76bec89d').d('目录')
          )}
        </span>
      </div>
      <div className='anchor-directory-content'>
        <DoScrollbars style={{ height: '100%' }} divRef={scrollRef}>
          <Anchor
            key={orderContainerID}
            targetOffset={20}
            affix={false}
            onClick={handleClick}
            onChange={onAnchorLinkChange}
            getContainer={() => {
              if (orderContainerID) {
                return document.getElementById(orderContainerID);
              } else {
                return document.getElementById('anchor-scroll-container');
              }
            }}
          >
            {renderAnchorLink(anchorDirData)}
          </Anchor>
        </DoScrollbars>
      </div>
      <style jsx>{`
        .anchor-directory {
          padding: 10px 0 10px 0;
          height: 100%;

          :global(.anchor-directory-head) {
            border-left: 2px solid ${theme.border_56};
            padding: 5px 16px 6px;
            font-size: 16px;
            font-weight: 900;
            color: ${theme.color_54};
          }
          .anchor-directory-content {
            height: calc(100% - 25px);
            overflow: hidden;
            font-size: ${theme.font_size_base};

            :global(.ant-anchor-wrapper) {
              max-height: unset !important;
            }

            :global(.default-link-active > a.ant-anchor-link-title) {
              //color: ${theme.color_54};
              color: ${theme.border_61};
              font-weight: 900;
            }
            :global(.ant-anchor-link-title) {
              color: ${theme.color_94};
              word-wrap: break-word;
              white-space: normal;
              padding-right: 2px;
              line-height: 20px;
            }

            :global(.ant-anchor-link-active > .ant-anchor-link-title) {
              // color: ${theme.color_54};
              color: ${theme.border_61};
              font-weight: 900;
            }

            :global(.ant-anchor-link > :nth-child(2)) {
              margin-top: 10px;
              padding-top: 0;
              padding-bottom: 2px;
            }

            :global(.ant-anchor-ink) {
              :global(&::before) {
                position: relative;
                display: block;
                width: 2px;
                height: 100%;
                margin: 0 auto;
                background-color: ${theme.background_color_268};
                content: ' ';
              }

              :global(.ant-anchor-ink-ball) {
                top: 10.5px;
                width: 0;
                border: 2px solid ${theme.border_61};
                height: 14px;
                border-radius: 0;
              }
            }
          }
        }
      `}</style>
    </div>
  );
};

export default withRouter(observer(AnchorDirectory));
