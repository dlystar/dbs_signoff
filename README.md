import { EnumType } from '@/constants/common/formType'
import { EnumGroupType } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/constants'
import { setSchemaFieldOrder } from '@/pages/Reception/common/fieldUtils';
import { linkageAction } from '@/pages/Reception/utils.new'
import { isNil, isObject, uniqBy } from 'lodash-es'

export const handleFormDataInfo = (schema, fieldLinkRes, noImpectFields, actNodeFormOrderInfo, options = {}) => {
  if (!schema) return {}
  // disabledUnUsefulFieldFilter = true时我们不再通过后端返回的noImpectFields来过滤字段
  const disabledUnUsefulFieldFilter = window.DOSM_CONFIG?.disabledUnUsefulFieldFilter ?? false;
  const idxMap = {};
  const defaultValues = {}; // 默认值
  const tableFields = [], hiddenGroupKeys = []; // 表格字段
  let hasConfigField = false;

  // 把需要设置必填和隐藏的字段拿出来
  const hideFieldList = [], requiredFieldList = [], readOnlyFieldList = [];
  if (fieldLinkRes && fieldLinkRes.triggerFields && fieldLinkRes.triggerFields.length) {
    // 把字段联动的结果 显示/隐藏/必填 直接合并到schema上，就不用再一个个去设置了
    fieldLinkRes.triggerFields.forEach(item => {
      if (item.tableColumnCode) return;
      if (item.hidden) {
        if (item.type === EnumType.addGroup) {
          hiddenGroupKeys.push(item.key)
          return
        }
        if (item.type === EnumType.expandContainer) {
          hiddenGroupKeys.push(item.key)
          return
        }
        hideFieldList.push(item.key);
      }
      if (item.mustWrite) {
        requiredFieldList.push(item.key);
      }
      if (item.readOnly) {
        readOnlyFieldList.push(item.key);
      }
      if (!item.tableColumnCode) {
        delete item['mustWrite']
        delete item['readOnly']
        delete item['hidden']
      }
    })
  }

  const fn = (properties) => {
    for (const [key, val] of Object.entries(properties || {})) {
      // 不在noImpectFields这个数组中的字段不需要渲染，我们直接从schema中拿掉
      // noImpectFields 没有返回标签页字段---所以我们跳过标签页字段
      if (
        !disabledUnUsefulFieldFilter &&
        noImpectFields &&
        !noImpectFields.includes(key) && val.groupType !== EnumGroupType.TAB_PANEL &&
        !val.dpCode
      ) {
        delete properties[key]
        continue;
      }
      if (requiredFieldList.includes(key)) {
        val.required = true
      }
      // !切记，千万不能在这里给分组设置display=false，具体原因看上面
      if (hideFieldList.includes(key)) {
        val.display = false
      }
      if (readOnlyFieldList.includes(key)) {
        val.editable = false
      }
      val['x-props'] && (val['x-props'].disabled = false);
      // 处理标签页字段
      if (val.groupType === EnumGroupType.TAB_PANEL) {
        if (schema.properties[val.parentId]) {
          if (!idxMap[val.parentId]) {
            idxMap[val.parentId] = 0;
          }
          if (!schema.properties[val.parentId].properties) {
            schema.properties[val.parentId].properties = {}
          }
          schema.properties[val.parentId].properties[key] = { ...val, 'x-index': idxMap[val.parentId]++ }
        }
        delete schema.properties[key]
      }
      if (val?.['x-component'] == EnumType.tableForm || val?.['x-component'] == 'table_form') {
        tableFields.push(key)
      }
      if (val?.['x-component'] == EnumType.customConfigTab) {
        hasConfigField = true;
      }
      if (val?.['x-component'] == EnumType.addGroup) {
        if (Object.keys(val?.properties || {}).length) {
          fn(val?.properties)
        } else if (val.groupType !== 'group_tab') {
          // !切记，千万不能在这里给分组设置display=false，具体原因看上面
          hiddenGroupKeys.push(key)
        }
      };
      if (val.dpCode) {
        val.editable = false;
        val.disabled = true;
      }
      if (options && options.resetDefaultValue) {
        if (properties[key]) {
          // 重置默认值
          properties[key] = { ...properties[key], default: null };
        }
      }
      defaultValues[key] = val.default ? val.default : null;
    }
  }
  fn(schema?.properties);
  // 标签页字段下面的标签都隐藏时则标签字段也隐藏
  Object.values(schema.properties || {}).forEach(v => {
    if (v.groupType === 'group_tab') {
      let display = true;
      const children = Object.values(v.properties || {});
      const hiddenChildren = children.filter(c => c.display === false);
      if (children.length === hiddenChildren.length) {
        display = false;
      }
      const childrenKeys = children?.map(c => c.key) || [];
      if (hiddenGroupKeys?.filter(k => childrenKeys.includes(k))?.length === childrenKeys.length) {
        display = false;
      }
      if (display === false) {
        hiddenGroupKeys.push(v.key)
      }
    }
  })
  // 表单模版和例行工作不排序
  if (!options || (options.moduleType !== 'form_template' && options.moduleType !== 'routine_work' && actNodeFormOrderInfo)) {
    setSchemaFieldOrder(schema, actNodeFormOrderInfo)
  }
  return {
    schema,
    defaultValues,
    tableFields,
    hasConfigField,
    initFieldLinkRes: {
      ...fieldLinkRes || {},
      hiddenGroupKeys
    },
  }
}

// !在这里合并字段联动属性的时候，一个字段的属性我们可以分为基础属性和扩展属性
// !基础属性只有requred&display&editable三个属性可以直接合并
// !其它的基础属性，还是需要等到表单加载完后再去执行
/**
 *
 * @param {*} schema formSchema
 * @param {*} triggerFields 字段联动结果
 * @param {*} formData 表单值
 * @param {*} orderInfo 工单信息
 * @returns
 */
export function mergeFieldLinkage2FormSchema(schema, triggerFields, formData, orderInfo) {
  if (!triggerFields || !triggerFields.length) return { schema, triggerFields: [] }
  if (!schema) return { schema: {}, triggerFields: [] }
  console.time('合并schema耗时')
  const formLocalStorageMap = JSON.parse(localStorage.getItem('formLocalStorageMap')) || {};
  const { dataStatus, readOnlyflag } = orderInfo || {};
  const { fieldStateMap } = linkageAction({ linkageData: triggerFields, formData, schema, options: { disabled: [20, 40, 50, ].includes(dataStatus) || readOnlyflag} })
  const mergeState = (array) => {
    array.forEach(item => {
      const triggerItem = fieldStateMap[item.key]
      // !定制化代码
      // !applicationImpacte有值的话，拿到这个字段的值作为mainApplicationRequiringChange的选项
      if (item.key === 'mainApplicationRequiringChange') {
        // 两种办法 1.直接设置字段的属性dataSource 2.字段联动修改选项的属性changeOptions
        if (triggerItem && triggerItem.componentState) {
          // 如果接口里返回的结果有对这个字段设置选项那我们不要
          delete triggerItem.componentState['changeOptions']
        }
        if (!item['x-props']) {
          item['x-props'] = {}
        }
        const dataSource = []
        if (Array.isArray(formData?.['applicationImpacte']) && formData?.['applicationImpacte'].length > 0 && Array.isArray(formData?.[`applicationImpacte_value`]) && formData?.[`applicationImpacte_value`].length === formData?.[`applicationImpacte`].length) {
          formData['applicationImpacte'].forEach((id, index) => {
            dataSource.push({ id, value: id, label: formData['applicationImpacte_value'][index] })
          })
        }
        item['x-props'].dataSource = dataSource
        item['x-props'].dataType = 'custom'
        item['x-props'].directoryValue = undefined
      }
      // !表单加载，otherApplicationImpacted这个字段，不能设置选项
      if(item.key === 'otherApplicationImpacted' || item.key === 'applicationImpacte'){
        if (triggerItem && triggerItem.componentState) {
          // 如果接口里返回的结果有对这个字段设置选项那我们不要
          delete triggerItem.componentState['changeOptions']
        }
       }

      if (triggerItem) {
        // 只有三个属性可以直接合并到schema, 其它合并不生效
        const _state = {
          disabled: triggerItem.state?.disabled,
          editable: triggerItem.state?.editable,
          display: triggerItem.state?.display,
          readOnly: triggerItem.state?.readOnly,
          required: triggerItem.state?.required
        }
        Object.assign(item, _state)
        item['x-props'] = {
          ...item['x-props'] || {},
          ...triggerItem.componentState || {}
        }
      }
      // in Normal CR process, when set changeFieldHint prop and submit form, noknow way this prop will back to initial value.
      // so we don't merger to schema insead of by linkage to trigger hint.
      delete item['x-props'].changedFieldHint
      if (item.properties) {
        mergeState(Object.values(item.properties))
      }
    })
  }
  mergeState(Object.values(schema.properties || {}))
  const triggerFieldsMap = triggerFields?.reduce((acc, cur) => {
    acc[cur.key] = cur
    return acc
  }, {})
  const hiddenGroupKeys = []
  const updateParentNodeState = (node) => {
    const dfs = (node) => {
      const children = Object.values(node.properties || {});
      if (children.length) {
        children.forEach(dfs);
        if (children.every(child => child.display === false)) {
          node.display = false;
          // !!切记，分组字段千万不要设置display=false,否则分组下的字段都不会渲染，
          if (node['x-component'] === 'ADD_GROUP') {
            delete node['display']
            // 我们暂时用另一个字段代替，有些地方我们还有用
            node.hidden = true
            // 通过字段联动去设置
            hiddenGroupKeys.push(node.key)
          }
        } else {
          node.display = true;
        }
      }
      if (node['x-component'] === 'SELECT') {
        if (node.default && Array.isArray(node.default)) {
          node.default = null
        }
      }
      if(node?.['x-props']?.dataSource){
        formLocalStorageMap[node.key] = uniqBy((formLocalStorageMap[node.key] || []).concat(node?.['x-props']?.dataSource), 'id')
      }
    }
    Object.values(node.properties || {}).forEach(dfs)
  }
  updateParentNodeState(schema)
  localStorage.setItem('formLocalStorageMap', JSON.stringify(formLocalStorageMap))
  // 这里还有部分属性是没法合并到schema上的，比如设置错误信息，必须动态去设置
  const _triggerFields = []
  triggerFields.forEach(tr => {
    const item = { key: tr.key }
    if (!isNil(tr.showPrompt)) {
      item.showPrompt = tr.showPrompt;
      item.promptContent = tr.promptContent
    }
    if (tr.needSetValue && !isNil(tr.value)) {
      item.value = tr.value
      item.needSetValue = true
    }
    if (tr.needSetTableValue && !isNil(tr.value)) {
      item.value = tr.value
      item.needSetTableValue = true
    }
    if (tr.clearFieldValue) {
      item.clearFieldValue = tr.clearFieldValue
    }
    // in Normal CR process, when set changeFieldHint prop and submit form, noknow way this prop will back to initial value.
    // so we don't merger to schema insead of by linkage to trigger hint.
    if(tr.needSetNode && !isNil(tr.needSetNodeValue)){
      item.needSetNode = true
      item.needSetNodeValue = tr.needSetNodeValue
    }
    if (Object.keys(item).length > 1) {
      item.type = tr.type
      _triggerFields.push(item)
    }
  })
  hiddenGroupKeys.forEach(k => {
    _triggerFields.push({
      key: k,
      hidden: true,
      type: 'ADD_GROUP'
    })
  })
  console.log('=====================================================')
  console.log('处理完后的字段属性', fieldStateMap)
  console.log('无法直接处理的字段联动结果：', _triggerFields)
  console.log('处理完成之后的FormSchema：', schema)
  console.log('从接口拿到的字段联动结果：', triggerFieldsMap)
  console.timeEnd('合并schema耗时')
  console.log('======================================================')
  return { schema, triggerFields: _triggerFields }
}

