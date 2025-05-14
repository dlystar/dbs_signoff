
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
        if(fieldProps.key == 'ProjectCutoverSignoff'){
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
    }
    // clearErrors
    if (fieldProps.showPrompt === false) {
        state.errors = []
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
