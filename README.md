import React, { useEffect, useMemo, useState } from 'react';
import DoVisibleRange from '@/components/DoVisibleRange';
import styles from './style/group.less';
import { convertToPrimaryArray } from '@/utils/T/core/helper';
import { helper } from '@/utils/T';
import { formily } from '@chaoswise/ui/formily';
import { useAsyncEffect, useLatest } from 'ahooks';
import CustomScheduledApproverGroup from './CustomScheduledApproverGroup';
import {approvalGroupEnumField, implementGroupEnumField, approvalParamsFieldEnums} from '@/constants/common/selectGroup';
const { FormPath } = formily;

const IGroup = ({
  isMultiple,
  selectRange,
  fieldWidth,
  selectType,
  onChange = () => { },
  onBlur,
  value,
  placeholder,
  disabled,
  fieldCode,
  additionOptions,
  tableKey,
  t,
  userStatus,
  isShowWorkOrderCount,
  changeOptions,
  ...props
}) => {
  const { isBusinessPanel, baseActions, actions, getPopupContainer, formLayout } = t || {};
  const { setFieldState } = actions || {};
  const { setBaseValue } = baseActions || {};
  const [_value, setValue] = useState([])

  const latestValue = useLatest(value)

  // 监听字段联动【追加选项】，更新选值
  useEffect(() => {
    if (!Array.isArray(additionOptions) || additionOptions?.length === 0 || !isMultiple) return;
    let newGroups = [...(value || [])];
    const key = selectType === 'group' ? 'groupId' : 'userId';
    const ids = convertToPrimaryArray(newGroups, key);
    additionOptions?.forEach(g => {
      if (ids?.indexOf(g?.[key] + '') == -1) newGroups = [...newGroups, g];
    });
    if (!tableKey) {
      setBaseValue && setBaseValue(fieldCode + '_search', handleSearch(newGroups));
    }
    setFieldState && setFieldState(fieldCode, state => {
      state.value = newGroups;
    });
    // 这里再重置一下additionOptions这个属性
    // 不然下一次设置additionOptions属性的值和上一次值相同useEffect里面监听不到
    // 场景：追加一个值，然后把这个值删了，然后再次触发使追加这个值，不会生效
    setFieldState && setFieldState(fieldCode, (state) => {
      FormPath.setIn(state, 'props.x-props.additionOptions', null);
    })
  }, [additionOptions]);
  useEffect(() => {
    let list = []
    if (selectType == 'person') {
      //如果仅到人 ，把value中带userId的过滤出来
      list = Array.isArray(value) ? value.filter((item) => {
        return !!item.userId;
      }) : []
    }
    if (selectType == 'group') {
      //如果仅到组 ，把value中不带userId的过滤出来
      list = Array.isArray(value) ? value?.filter((item) => {
        return !item?.userId;
      }) : []
    }
    if (selectType == 'all') {
      //如果到人到组 不做处理
      list = Array.isArray(value) ? value : [];
    }
    //如果是单选，并且有value值并且value是个数组，并且数组长度大于1 就说明之前数据是多选状态，那么吧默认值直接给清掉
    if (!isMultiple && value && Array.isArray(value) && value?.length > 1) {
      list = []
      helper.eventManager.emit("showMessage");
    }
    //如果筛选后的数组list 和之前传入的value长度相等，就说明这块规则没有变过，否则在模版建单的时候要提示并且把数据清空
    if (list?.length == (Array.isArray(value) && value?.length)) {
      list = value || []
    } else {
      list = []
      helper.eventManager.emit("showMessage");
    }
    setValue(list);
    if ((value || [])?.length > 0 && value?.length != list?.length) {
      onChange && onChange(list);
    }
    if (!tableKey) {
      setBaseValue && setBaseValue(fieldCode + '_search', handleSearch(list))
    }
  }, [value])

  // changeOptions 重置非表格成员组字段值
  useAsyncEffect(async () => {
    if (!changeOptions || !actions) return;
    if (!tableKey) {
      const _value = await actions.getFieldValue(fieldCode)
      if (!_value || !_value.length) return
      const ids = changeOptions.map(ch => ch.groupId);
      actions.setFieldValue(fieldCode, _value.filter(v => ids.includes(v.groupId)))
    }
  }, [changeOptions])

  // changeOptions 重置表格字段值
  useEffect(() => {
    if (!changeOptions || !actions) return;
    if (!latestValue.current || !latestValue.current.length) return
    if (tableKey) {
      const ids = changeOptions.map(ch => ch.groupId);
      const _value = latestValue.current.filter(v => ids.includes(v.groupId))
      onChange && onChange(_value, '', false)
    }
  }, [changeOptions])

  /*
    isMultiple  //是否支持多选
    defaultValue //默认当前人
    placeholder
    selectRange  //选择范围
    selectType  group person all
  */
  const handleChange = (value) => {
    if (!tableKey) {
      setBaseValue && setBaseValue(fieldCode + '_search', handleSearch(value))
    }
    onChange && onChange(value)
    setValue(value)
    onBlur && onBlur(value);
  }

  const handleSearch = (value) => {
    if (Array.isArray(value)) {
      return (value || [])?.map((item) => {
        if (item.userId) {
          return item.groupId + '|' + item.userId;
        } else {
          return item.groupId;

        }
      })
    }
  }

  const changeUserGroupOptions = useMemo(() => {
    return changeOptions?.map(op => ({
      ...op,
      title: op.groupName,
      key: op.groupId,
      type: 'group',
      isLeaf: true,
      id: op.groupId,
    }))
  }, [changeOptions])
  if((approvalGroupEnumField.includes(fieldCode) || implementGroupEnumField.includes(fieldCode)) && !(isBusinessPanel || disabled)){
    return <CustomScheduledApproverGroup
    isMultiple={isMultiple}
    onChange={handleChange}
    value={Array.isArray(_value) ? _value : []}
    disabled={isBusinessPanel || disabled}
    placeholder={placeholder}
    fieldCode={fieldCode}
    t={t}
    {...props}
    />
  }

  return (
    <div className={`${disabled ? styles['dynamic-group-disabled'] : styles['dynamic-group']} ${(!disabled || _value?.length > 0 || isBusinessPanel) ? '' : styles['empty']}`} >
      {
        (disabled && !_value?.length) ? <span className={styles['no-val']}>--</span>
          : <DoVisibleRange
            types={['group']}
            group={{
              multiple: isMultiple,
              visibleGroupIds: (selectRange || [])?.map(item => item.groupId),
              onlyGroup: selectType === 'group',
              groupSelectable: !(selectType === 'person'),
              ...props
            }}
            showValueInTag={isMultiple}
            onChange={handleChange}
            value={Array.isArray(_value) ? _value : []}
            disabled={isBusinessPanel || disabled}
            placeholder={placeholder}
            userStatus={userStatus}
            isShowWorkOrderCount={isShowWorkOrderCount}
            isShow
            className={`dynamic-visible-range ${styles['group']}`}
            getPopupContainer={getPopupContainer}
            formLayout={formLayout}
            changeOptions={changeUserGroupOptions}
          />
      }
    </div>
  );
}

export default IGroup;
