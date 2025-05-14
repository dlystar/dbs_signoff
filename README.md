import { intl } from '@chaoswise/intl';
import { useEffect, useState, useMemo } from 'react';
import { useTable, useBlockLayout, useResizeColumns } from 'react-table';
import { EditableCell, defaultEnum } from '../../constants/fields';
import { helper, checkType } from '@/utils/T';
import {
  EnumValidationRulesValue,
  EnumDateInitValue,
  EnumAutoNumberRuleComponentType,
  EnumAutoNumberRule,
  EnumAutoDateRuleSelectData,
} from '../../../../constants';
import { getValidateRules } from '../../util/checkRules';
import { langUtil } from '@/lang';

import { EnumType } from '@/constants/common/formType';
import { permission } from '@/services/auth';
import { convertToPrimaryArray } from '@/utils/T/core/helper';
import {
  getUserListByIdsForMember,
  getUserSuperiorsByParam,
  addTableAutoNumber,
  deleteTableAutoNumber,
  getUserGroupInfoById
} from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/api/index.js';
import { userInfoKind } from '@/constants/common/formType';
import { getLabel } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/utils';
import moment from 'moment';
import { eventManager } from '@/utils/T/core/helper';
import { useAsyncEffect, useGetState, useLatest } from 'ahooks';
import { isEmpty } from '@/utils/T/core/checkType';
import { cloneDeep, isObject, isNil } from 'lodash-es'
import { formily } from '@chaoswise/ui/formily';

const { FormPath } = formily

export const $rowKey = Symbol('rowKey')
export const $deleteable = Symbol('removeable')

/**
 * 表格字段的hook
 * @param {*} param0
 * @returns
 */
function useTableItems({ ...props }) {
  const defaultColumn = { Cell: EditableCell };
  const {
    columns: columnsTable = [],
    value,
    onChange,
    fieldCode,
    t,
    utils,
    disabled,
    linkTable,
    useByChanges,
    readOnly,
    quoteDataTable,
    version,
    tableEleId,
    setValidatorBool,
    tableEdit,
  } = props;
  const columns = version === 'v2' ? quoteDataTable?.bringOutFieldSchema || [] : columnsTable;
  const { handleValueToLabel } = utils || {};
  let {
    linkCol,
    linkVal,
    linkOption,
    linkAdditionOptions,
    linkageChangeOptions,
    linkageSetFieldHint,
    setDateRange
  } = linkTable || {};
  const {
    actions,
    followTableInfo,
    setChangedColumnField,
    tableColMap = {},
    linkTableRef = {},
  } = t || {};
  const { isBusinessPanel, orderInfo } = t || {};
  const { workOrderId, formModelId } = orderInfo || {};
  const {
    adminFlag,
    currentUserId,
    followTableCode,
    followTableColCode,
    formReadOnly,
  } = followTableInfo || {}; // 节点设置-处理设置-多人处理-跟随表格成员
  const initValue = useMemo(() => (Array.isArray(value) ? value : []), []); // 初始value
  const [excludeCheckRow, setExcludeCheckRow] = useState([]);
  // 操作按钮权限
  const btnPermission = useMemo(() => {
    let obj = {};
    obj['flag'] = (!disabled || adminFlag) && !formReadOnly; // 【添加行\删除行】的权限 ------- （字段联动-表格非只读 || 是系统管理员） && 表单非只读
    obj['disabledDelMaxRow'] =
      obj['flag'] && followTableCode === fieldCode && !adminFlag
        ? initValue?.length
        : ''; // 有【不能删除的行】 ------- 表格非只读 && 当前表格是跟随表格 && 不是系统管理员 && 表单非只读
    return obj;
  }, [disabled, followTableInfo]);
  // 权限控制下、不能编辑的行号list
  // 当前表格是跟随表格 && 不是系统管理员 && 表单非只读 ===> true: 当前用户只能编辑【自己那一行】
  const disabledRows = useMemo(() => {
    const flag = followTableCode === fieldCode && !formReadOnly;
    let rows = [];
    flag &&
      initValue?.forEach((v, i) => {
        const rowUser = v?.rowData?.[followTableColCode]?.[0]?.userId;
        if (rowUser != currentUserId) rows = [...rows, i + ''];
      });
    // 如果是表格引用数据表，则单元格斗不可编辑
    if (version === 'v2') {
      value?.forEach((v, i) => {
        rows = [...rows, i + ''];
      });
      return rows;
    }
    setExcludeCheckRow(rows);
    return !adminFlag && flag ? rows : '';
  }, [disabled, followTableInfo, value]);

  const [cols, setCols, getCols] = useGetState(() =>
    checkType.isArray(columns)
      ? columns?.map((c) => ({
        ...c,
        Header: c?.title || '',
        accessor: c?.key,
      }))
      : []
  );

  const [adding, setAdding] = useState(false)
  const [data, setData] = useState(() => getTableData(value, columns));
  const [errList, setErrList] = useState();
  const [requiredCells, setRequiredCells] = useState([]);
  const fakeData = useMemo(() => [getNewRowData(cols)], [cols]);

  const latestColsRef = useLatest(cols);

  // 字段联动返回的列状态：必填、隐藏、只读
  useEffect(() => {
    // ----获取默认列宽 ---- start -------
    let containerClientWidth =
      document.getElementById(tableEleId)?.clientWidth -
      (!useByChanges && !readOnly ? 30 : 5);
    let containerEl = containerClientWidth / 7;
    let totalCols = columns?.length;
    if (totalCols && totalCols < 8) {
      let totalDefaultWidth = 0;
      let totalCount = 0;
      // 设置了默认列宽的总长
      columns?.map?.((col) => {
        let inputVal = col['x-props']?.['defaultColWidth']?.inputVal;
        if (inputVal) {
          totalDefaultWidth += inputVal;
          totalCount++;
        }
      });
      let restWidth = containerClientWidth - totalDefaultWidth; // 剩余宽度
      if (restWidth > (totalCols - totalCount) * 80)
        containerEl = restWidth / (totalCols - totalCount); // 考虑交互性和美观性，最小列宽为80
    }
    // ----获取默认列宽 ---- end -------
    // 每次都需要用最原始的columns过滤
    const _cols = columns?.map((col, index) => {
      let inputVal = col['x-props']?.['defaultColWidth']?.inputVal;
      let initVal = containerEl;
      let newCol = {
        ...col,
        width: inputVal || initVal || 120,
        Header: col?.title || '',
        accessor: col?.key,
      };
      if (!newCol['x-props']) {
        newCol['x-props'] = {};
      }
      newCol['x-props']['defaultColWidth'] = { inputVal, initVal };
      if (!checkType.isEmpty(linkCol)) {
        newCol = {
          ...newCol,
          ...(linkCol?.[col?.key] || {}),
        };
      }
      return newCol;
    });
    setCols(_cols);
  }, [linkCol, fieldCode]);

  useAsyncEffect(async () => {
    if (tableEdit === 'form') return;
    let newValue = cloneDeep(value || []) || [];
    const _cols = getCols()
    // 字段联动返回的单元格：清空值、设置值
    // 项目上有一个场景是通过一个表格列给另一个表格列赋值
    // 他们想要的效果就是第一个表格有的行第二个表格也要有，所以我们遍历字段联动结果linkVal
    // 把没有的行补上
    if (!checkType.isEmpty(linkVal)) {
      for (const [k, v] of Object.entries(linkVal)) {
        if (k == -1) continue; // -1 用在新增行数据的时候
        let rawData = newValue.find(n => n.rowNum == k);
        if (!rawData) {
          rawData = {
            id: helper.guid(15),
            rowNum: k + '',
            rowData: await setDefaultToCell(getNewRowData(), _cols, { workOrderId, formModelId, value: newValue }),
          }
          newValue.push(rawData)
        }
        Object.assign(rawData.rowData, v)
      }
    }
    // 字段联动返回的单元格：追加选项
    if (!checkType.isEmpty(linkAdditionOptions)) {
      newValue = (newValue || [])?.map?.((val) => {
        const linkRowData = linkAdditionOptions?.[val?.rowNum];
        if (linkRowData) {
          let _rowData = {};
          for (const fieldCode in val?.rowData) {
            if (
              !checkType.isEmpty(linkRowData) &&
              Object.keys(linkRowData)?.indexOf(fieldCode) > -1
            ) {
              const oldData = [...(val?.rowData?.[fieldCode] || [])];
              const additionData = [...(linkRowData?.[fieldCode] || [])];
              let data = oldData;
              // 成员/成员组去重
              const key = (data?.length > 0 ? data : additionData)?.[0]?.userId
                ? 'userId'
                : (data?.length > 0 ? data : additionData)?.[0]?.groupId
                  ? 'groupId'
                  : undefined;
              const ids = key
                ? convertToPrimaryArray(data || [], key)
                : undefined;
              ids &&
                additionData?.forEach((m) => {
                  if (ids?.indexOf(m?.[key] + '') == -1) data = [...data, m];
                });
              _rowData[fieldCode] = ids
                ? data
                : Array.from(new Set([...oldData, ...additionData]));
            } else {
              _rowData[fieldCode] = val?.rowData?.[fieldCode];
            }
          }
          return { ...val, rowData: _rowData };
        } else {
          return { ...val };
        }
      });
    }
    actions?.setFieldValue(fieldCode, newValue);
  }, [linkVal, linkAdditionOptions]);

  const columnsKVMap = useMemo(() => {
    return helper.convertToKeyVal(columns || [], 'key');
  }, [columns]);

  useEffect(() => {
    setData(() => {
      let newData = getTableData(value, columns);
      checkTable(newData);
      if (handleValueToLabel) {
        const formLocalStorageMap =
          JSON.parse(localStorage.getItem('formLocalStorageMap') || '{}') || {};
        newData.forEach((row) => {
          Object.entries(row || {}).forEach(([k, v]) => {
            if (v) {
              const col = columnsKVMap[k];
              if (
                col &&
                ['SELECT', 'SELECT_MANY'].includes(col['x-component'])
              ) {
                const _value = handleValueToLabel(
                  v,
                  formLocalStorageMap?.[k] || []
                );
                if (Array.isArray(v)) {
                  if (!v.length) {
                    row[`${k}_value`] = [];
                  } else {
                    row[`${k}_value`] = _value || row[`${k}_value`];
                  }
                } else {
                  if (!v) {
                    row[`${k}_value`] = '';
                  } else {
                    row[`${k}_value`] = _value || row[`${k}_value`];
                  }
                }
              } else if (col && col['x-component'] === 'MULTI_SELECT') {
                row[`${k}_value`] = getLabel(
                  v,
                  col['x-props']?.dataSource || []
                );
              } else if (col && col['x-component'] === 'GROUP') {
                row[`${k}_search`] = (v || [])?.map?.((_v) => {
                  if (_v.userId) {
                    return _v.groupId + '|' + _v.userId;
                  } else {
                    return _v.groupId;
                  }
                });
              } else if (col && col['x-component'] === 'MEMBER') {
                row[`${k}_search`] = (v || [])?.map?.((_v) => _v.userId);
              }
            }
          });
        });
      }
      return newData;
    });
  }, [value, handleValueToLabel, columns]);

  // 提交的时候校验表单啊
  useEffect(() => {
    const checkFormData = (data) => {
      checkTable && checkTable(getTableData(value, columns), data?.isCmdb);
    }
    eventManager.off(`on-table-validate-${fieldCode}`, checkFormData);
    eventManager.on(`on-table-validate-${fieldCode}`, checkFormData);
    return () => {
      eventManager.off(`on-table-validate-${fieldCode}`, checkFormData);
    };
  }, [value, columns]);

  /**
   * 校验表格
   */
  const checkTable = (newData, isCmdb) => {
    if (tableEdit === 'form') return; // 表单编辑模式不校验
    const _cols = helper.convertToKeyVal(latestColsRef.current, 'key');
    let errList = [];
    let hasErr = false;
    let checkAll = false;
    Array.isArray(value) &&
      value?.forEach((val, rowNum) => {
        errList[rowNum] = {};
        for (const key in _cols) {
          // 隐藏起来的字段就不用校验了啊！！！
          if (_cols[key].hide) continue;
          const needCheckRequired =
            requiredCells?.[rowNum]?.indexOf(key) > -1 ||
            val?.needCheck === null ||
            isCmdb;
          let error = registerValidationRules(
            _cols?.[key],
            val?.rowData?.[key],
            rowNum,
            newData,
            needCheckRequired,
            excludeCheckRow
          );
          errList[rowNum][key] = error;
          if (error) hasErr = true;
        }
        if (!checkAll) checkAll = val?.needCheck === null;
      });
    setErrList(errList);
    // 配置项标签 -- 嵌入表格做的兼容处理
    if (setValidatorBool) {
      setValidatorBool(fieldCode, hasErr);
    }
    actions?.setFieldState(fieldCode, (state) => {
      // editable = false的时候不会校验
      if (hasErr) {
        state.editable = true;
        // 我们的表格操作列权限是通过readOnly来控制的，这里我们把editable设置成true的时候，disabled属性会跟着变
        // readOnly属性则丢失，即使在这里再去设置（readOnly-true, disabled=true）也是无济于事的
        // 只有通过FormPath去设置disabled和readOnly属性，才能保证这俩属性不随着editable属性的变化而变化
        FormPath.setIn(state, 'props.x-props.disabled', disabled);
        FormPath.setIn(state, 'props.x-props.readOnly', readOnly);
      }
      // dbs--隐藏表格提示内容
      const ErrorMsg = () => {
        return <span style={{ display: 'none' }}>{langUtil.t(
          intl
            .get('ed1a1ab9-a0a0-4666-a9ca-1204ef992d0e')
            .d('表格字段填写错误')
        )}</span>
      }
      state.errors = hasErr
        ? [
          <ErrorMsg />
        ]
        : [];
      // 在这个里给表格设置errors会给formitem组件加一个'has-error'的类
      // 在代码中某处设置了一个样式，就是在有has-error类下给下拉框加个红色的边框
      // 这样会导致，在表格个有has-error时，表格里面所有的下拉框都加了个红色边框，甚至连分页组件都有红色边框
      // 而我们不知道为什么会加这个样式，有不能去掉
      // 所以我们解决方案如下：
      // 1.通过修改样式去掉表格formItem的has-error类
      // 2.在校验不通过的表格列具体的单元格中加上类has-error
      setTimeout(() => {
        document
          ?.querySelector(`.com-path-${fieldCode}`)
          ?.querySelector('.ant-form-item-control.has-error')
          ?.classList?.remove('has-error');
        const explain = document
          ?.querySelector(`.com-path-${fieldCode}`)
          ?.querySelector('.ant-form-explain');
        if (explain) {
          explain.style.color = '#f5222d';
        }
      }, 100);
    });
  };


  const getNewRow = async (row, latestValue) => {
    const _cols = getCols();
    const rowData = await setDefaultToCell(getNewRowData(_cols), _cols, { workOrderId, formModelId, value: latestValue ?? value }, row); 
    const data = {
      id: rowData[$rowKey],
      rowNum: (value?.length || 0) + '',
      rowData,
    }
    return data
  }

  /**
   * 新增行
   */
  const addRow = async (e, row, rowNum) => {
    setAdding(true)
    try {
      const newRow = await getNewRow(row)
      if (tableEdit != 'form' && linkTable && linkTableRef && linkTableRef.current && linkTableRef.current[fieldCode]) {
        // 下拉选项
        if (linkTableRef.current[fieldCode]?.linkOption) {
          if (!linkOption) linkOption = {};
          linkOption[newRow.rowNum] = {
            ...(linkTableRef.current[fieldCode].linkOption[rowNum ?? -1] || {}),
          };
          linkTable.linkOption = { ...linkOption };
        }
        // 追加字段值
        if (linkTableRef.current[fieldCode]?.linkAdditionOptions) {
          if (!linkAdditionOptions) linkAdditionOptions = {};
          linkAdditionOptions[newRow.rowNum] = {
            ...(linkTableRef.current[fieldCode].linkAdditionOptions[rowNum ?? -1] || {}),
          };
          linkTable.linkAdditionOptions = { ...linkAdditionOptions };
        }
        if (linkTableRef.current[fieldCode]?.linkVal) {
          // -1里面放的是我们字段联动对于整个表格列的值的设置
          // 我们在新增行的时候把这些值同时设置上
          const val = linkTableRef.current[fieldCode]?.linkVal?.[-1]
          Object.assign(newRow.rowData, val)
        }
        // 改变字段下拉选项
        if (linkTableRef.current[fieldCode]?.linkageChangeOptions) {
          if (!linkageChangeOptions) linkageChangeOptions = {};
          linkageChangeOptions[newRow.rowNum] = {
            ...(linkTableRef.current[fieldCode].linkageChangeOptions[rowNum ?? -1] || {}),
          };
          linkTable.linkageChangeOptions = { ...linkageChangeOptions };
        }
        linkTableRef.current[fieldCode] = linkTable
      }
      newRow.rowIsDel = true
      onChange([...(value || []), newRow]);
      setChangedColumnField && setChangedColumnField(fieldCode, fieldCode);
    } catch (e) {
      console.error(e)
    } finally {
      setAdding(false)
    }
  };
  /**
   * 复制行
   * @param {*} row 被复制的行数据
   */
  const copyRow = async (e, row) => {
    return addRow(e, row.values, row.id);
  };

  /**
   * 删除行
   * @param {*} rowNum 行号
   */
  const delRow = async (rowNum, cb) => {
    let _value = value
      ?.filter((v) => v?.rowNum != rowNum)
      ?.map((v, idx) => ({ ...v, rowNum: idx }));

    let autoNumberList = [];
    let autoNumberValue = {};
    // 如果isRenumbering等于true，说明当前表格内有自动编号字段，并且 删除行是否重新排序 需要重新排序
    let isRenumbering = false;

    columns?.forEach((c) => {
      if (c?.['x-component'] === EnumType.autoNumber) {
        if (c?.['x-props']?.renumbering === 'true') {
          autoNumberList.push({
            code: c?.key,
            autoNumberInfo: { ...c?.['x-props']?.autoNumberRule },
            renumbering: c?.['x-props']?.renumbering,
          });
          autoNumberValue[c?.key] = _value.map((item) => item?.rowData[c?.key]);
          isRenumbering = true;
        }
      }
    });

    if (isRenumbering) {
      let params = {
        workOrderId,
        autoNumberList,
        autoNumberValue,
        mdlFormTemplateId: formModelId,
      };
      let resp = await deleteTableAutoNumber(params);
      const data = resp?.data || {};
      _value = _value?.map((item, idx) => {
        let target = data[idx] || {};
        for (let key in target) {
          item.rowData[key] = target[key];
        }
        return item;
      });
    }

    if (linkTableRef && linkTableRef.current && linkTableRef.current[fieldCode]) {
      // 下拉选项
      if (linkTableRef.current[fieldCode]?.linkOption) {
        if (linkOption) {
          delete linkOption[rowNum]
        }
      }
      // 追加字段值
      if (linkTableRef.current[fieldCode]?.linkAdditionOptions) {
        if (linkAdditionOptions) {
          delete linkAdditionOptions[rowNum];
        }
      }
      if (linkTableRef.current[fieldCode]?.linkVal) {
        if (linkVal) {
          delete linkVal[rowNum];
        }
      }
      Object.values(linkTable)?.forEach(v => {
        if (isObject(v)) {
          Object.keys(v || {})?.forEach?.(_k => {
            if (_k > rowNum) {
              v[_k - 1] = v[_k];
              delete v[_k]
            }
          })
        }
      })
      linkTableRef.current[fieldCode] = linkTable
    }

    // console.log(rowNum, value, _value, 'rowNum');
    // 930修改
    // 传null的时候后端不会保存，就会设置成初始的值，导致表格行删不掉
    // 后端说是传个[]
    onChange(_value?.length > 0 ? _value : []);
    setChangedColumnField && setChangedColumnField(fieldCode, fieldCode);
    cb && cb()
  };

  const userInfoMsg = useMemo(() => {
    let obj = {};
    columns?.forEach((v) => {
      obj[v.id] = v;
    });
    return obj;
  }, [columns]);

  /**
   * 单元格onChange事件
   * @param {*} columnCode 列code
   * @param {*} rowNum 行号
   * @param {*} val 值
   */
  const onCellChange = async (columnCode, rowNum, val, label) => {
    localStorage.setItem('currentEditRow', rowNum);
    const _value = (value || [])?.map((v) => {
      if (v?.rowNum != rowNum) {
        return { ...v };
      } else {
        const _rowData = {
          [columnCode]: val,
        };
        if (label) {
          _rowData[`${columnCode}_value`] = label;
        }
        return {
          ...v,
          rowData: {
            ...v?.rowData,
            ..._rowData,
          },
        };
      }
    });
    const xProps = userInfoMsg?.[columnCode]?.['x-props'] || {};
    let selectedInfo = xProps?.['memberMes']?.['selected'] || [];
    const componentType = userInfoMsg?.[columnCode]?.['x-component'];
    if (
      (componentType == 'MEMBER' || componentType == 'GROUP') &&
      selectedInfo?.length
    ) {
      if (componentType == 'GROUP' && xProps.selectType === 'group') {
        // 同步成员组信息
        const gid = val?.[0]?.['groupId'];
        const subFieldList = columns.filter(c => c.userParentId == columnCode) || []
        if (subFieldList && subFieldList.length) {
          const tempData = {}
          if (gid) {
            // 查询用户组信息
            const { data: groupInfo } = await getUserGroupInfoById(gid) || {};
            Object.assign(tempData, groupInfo)
            groupInfo.extend?.forEach(ex => {
              tempData[ex.alias || ex.name] = ex.valueForMember || ex.value
            })
            // parentId-上级用户组
            if (subFieldList.some(s => s.kind === 'parentId') && groupInfo.parentId) {
              try {
                const parentGroup = await getUserGroupInfoById(groupInfo.parentId)
                tempData['parentId'] = [{
                  groupId: parentGroup?.data?.groupId,
                  groupName: parentGroup?.data?.groupName
                }]
              } catch (err) {
                console.error(err)
              }
            }
            // leader-用户组组长
            if (subFieldList.some(s => s.kind === 'leader') && groupInfo.leader) {
              try {
                const res = await getUserListByIdsForMember(groupInfo.leader) || {}
                const userInfo = res?.data?.[0] || {};
                tempData['leader'] = [{
                  userId: userInfo.userId,
                  userName: userInfo.userAlias,
                }]
              } catch (err) {
                console.error(err)
              }
            }
          }
          const obj = {}
          subFieldList.forEach(sub => {
            if (sub.kind === userInfoKind.vip) {
              if (tempData[sub.kind]) {
                obj[sub.key] = tempData[sub.kind].toString()
              } else {
                obj[sub.key] = null
              }
            } else if (sub['x-component'] === EnumType.selectMany) {
              // 多选类型字段值这里接口返回的是一个字符串，我们处理一下
              if (tempData[sub.kind]) {
                obj[sub.key] = Array.isArray(tempData[sub.kind]) ? tempData[sub.kind] : tempData[sub.kind].split(',')
              } else {
                obj[sub.key] = null
              }
            } else {
              obj[sub.key] = tempData[sub.kind]
            }
          })
          _value?.forEach((item, index) => {
            if (item.rowNum == rowNum) {
              _value[index]['rowData'] = {
                ...item?.rowData,
                ...obj,
              };
            }
          });
          setRequiredCells(getCheckObj({ ...requiredCells }, columnCode, rowNum));
          onChange(_value);
          setChangedColumnField && setChangedColumnField(fieldCode, columnCode);
        }
      } else {
        // 成员且有成员信息
        const userId = val?.[0]?.['userId'];
        if (userId || !userId) {
          const needAddData = columns?.filter(
            (v) => v.userParentId == columnCode
          ); //需要添加的成员信息列信息
          let userList = await getUserListByIdsForMember(userId);
          let data = userList?.data?.[0] || {};
          let tempVal = {};
          if (data.extend && data.extend?.length) {
            data.extend?.forEach((item) => {
              if (item.alias) {
                tempVal[item.alias] = item.valueForMember || item.value;
              }
            });
          }
          data = {
            ...data,
            ...tempVal,
          };
          const needObj = {};
          needAddData?.forEach((v) => {
            needObj[v.id] = data[v.kind];
            if (
              v.kind == userInfoKind.associatedCi ||
              v.kind === userInfoKind.associatedCiMulti
            ) {
              needObj[v.id] = v.kind;
            }
          });
          if (!isEmpty(needObj)) {
            const res = await getUserSuperiorsByParam(userId);
            const superiors = res.data || [];
            if (superiors && superiors.length) {
              Object.entries(needObj).forEach(([k, v]) => {
                if (v === userInfoKind.associatedCiMulti) {
                  needObj[k] = superiors.map((u) => ({
                    userId: u.id,
                    userName: u.userAlias,
                  }));
                } else if (v === userInfoKind.associatedCi) {
                  needObj[k] = [
                    { userId: superiors[0].id, userName: superiors[0].userAlias },
                  ];
                }
              });
            } else {
              Object.entries(needObj).forEach(([k, v]) => {
                if (
                  [
                    userInfoKind.associatedCiMulti,
                    userInfoKind.associatedCi,
                  ].includes(v)
                ) {
                  needObj[k] = [];
                }
              });
            }
          }
          _value?.forEach((item, index) => {
            if (item.rowNum == rowNum) {
              _value[index]['rowData'] = {
                ...item?.rowData,
                ...needObj,
              };
            }
          });
          setRequiredCells(getCheckObj({ ...requiredCells }, columnCode, rowNum));
          onChange(_value);
          setChangedColumnField && setChangedColumnField(fieldCode, columnCode);
        }
      }
    } else {
      setRequiredCells(getCheckObj({ ...requiredCells }, columnCode, rowNum));
      onChange(_value);
      setChangedColumnField && setChangedColumnField(fieldCode, columnCode);
    }
  };

  /**
   * 已编辑过的单元格，用于校验必填
   * @param {*} obj
   * @param {*} fieldCode 列code
   * @param {*} rowNum 行号
   * @returns
   */
  const getCheckObj = (obj, fieldCode, rowNum) => {
    if (!obj[rowNum]) obj[rowNum] = [];
    if (obj[rowNum]?.indexOf(fieldCode) === -1) obj[rowNum]?.push(fieldCode);
    return obj;
  };

  /**
   * 批量新增行-仅供数据表选择数据使用
   */
  const addRows = async (rows) => {
    const newRows = [];
    await rows.map(async (item, index) => {
      let rowNum = value.length + index;
      const newRow = {
        id: helper.guid(15),
        rowNum: rowNum + '',
        rowData: await setDefaultToCell(
          item,
          cols,
          { workOrderId, formModelId, value },
          item
        ),
      };
      newRows.push(newRow);
    });
    onChange([...(value || []), ...newRows]);
    setChangedColumnField && setChangedColumnField(fieldCode, fieldCode);
  };
  /**
   * 根据数据组装表格数据
   */
  const formatRows = async (rows) => {
    const newRows = [];
    await rows.map(async (item, index) => {
      let rowNum = index;
      const newRow = {
        id: helper.guid(15),
        rowNum: rowNum + '',
        rowData: await setDefaultToCell(
          item,
          cols,
          { workOrderId, formModelId, value },
          item
        ),
      };
      newRows.push(newRow);
    });
    return newRows;
  };
  // 行数据编辑
  const onRowChange = (row) => {
    const _value = (value || [])?.map((v) => {
      if (v?.rowNum != row.rowNum) {
        return { ...v };
      } else {
        return {
          ...v,
          rowData: row.rowData,
        };
      }
    });
    onChange(_value)
  }
  const { getTableProps, getTableBodyProps, state, prepareRow, headers, rows } =
    useTable(
      {
        columns: cols,
        data: isBusinessPanel ? fakeData : data,
        defaultColumn,
        utils,
        t,
        onCellChange,
        disabledRows,
        formReadOnly: formReadOnly || (tableEdit && tableEdit === 'form'),
        useByChanges,
        linkOption,
        linkageChangeOptions,
        linkageSetFieldHint,
        tableKey: fieldCode,
        setDateRange,
      },
      useBlockLayout,
      useResizeColumns
    );
  return {
    getTableProps,
    getTableBodyProps,
    colState: state,
    rows,
    cols,
    headers,
    prepareRow,
    addRow,
    delRow,
    copyRow,
    errList,
    btnPermission,
    addRows,
    formatRows,
    getNewRow,
    onRowChange,
    setData,
    adding
  };
}

export default useTableItems;

/**
 * 新的行数据
 * @param {*} cols
 * @returns
 */
export const getNewRowData = (cols) => {
  let _rowData = {};
  let _col = helper.convertToKeyVal(cols, 'key');
  for (const key in _col) {
    _rowData[key] = undefined;
  }
  _rowData[$rowKey] = helper.guid()
  return _rowData;
};

/**
 * 处理表格数据结构
 * @param {*} originValue 源数据
 * @returns
 */
export const getTableData = (originValue, columns) => {
  const autoNumberCols = columns?.filter(col => col['x-component'] === 'AUTO_NUMBER')?.map(col => col.key);
  if (!Array.isArray(originValue)) {
    return [];
  }
  let val = [];

  originValue?.forEach(v => {
    if (v.rowData) {
      v.rowData[$rowKey] = v.rowData[$rowKey] || v.id || helper.guid()
    }
  })

  originValue
    ?.sort((a, b) => (a?.rowNum || 0) - (b?.rowNum || 0))
    ?.forEach((v) => {
      if (v.rowIsDel === false && v.rowData) {
        v.rowData[$deleteable] = false
      }
      val = [...val, v?.rowData];
    });
  val = val.map(v => ({
    ...v,
    [$rowKey]: v[$rowKey] || helper.guid()
  }))
  const array1 = [], array2 = [];
  val?.forEach(v => {
    if(v[$deleteable] === false){
      array1.push({...v})
    }else{
      array2.push({...v})
    }
  })
  const newArray = [...array1, ...array2];
  if(autoNumberCols?.length > 0){
    val.forEach((v, index) => {
      autoNumberCols.forEach(k => {
        newArray[index][k] = v[k]
      })
    })
  }
  return newArray;
};

/**
 * 给单元格设置初始值
 * @param {*} rowData 行数据
 * @param {*} cols 列数据
 * @returns
 */
// getUserListByIdsForMember接口返回的data数组
const parseUserInfo = (data) => {
  if (!data?.[0]) return null;
  let source = helper.deepClone(data[0]);
  const extend = source?.extend || [];
  if (extend?.length) {
    let obj = {};
    extend?.forEach((item) => {
      if (item.alias) {
        obj[item.alias] = item.valueForMember || item.value;
      }
    });
    source = {
      ...source,
      ...obj,
    };
  }
  return source;
};
export const setDefaultToCell = async (
  rowData,
  cols,
  { workOrderId, formModelId, value },
  row
) => {
  const curUser = permission.getUserInfo();
  let _rowData = { ...rowData };
  const needAddUserInfo = []; //记录需要添加成员信息的成员的id
  const autoNumberList = []; // 需要保留是自动编号的列数据
  (cols || [])?.forEach((c) => {
    const currentUserSuperiors =
      JSON.parse(localStorage.getItem('current_user_superiors')) || [];
    let superiors = JSON.parse(localStorage.getItem('superiors')) || {};
    const _leaderuserName =
      (superiors?.name || '') + '(' + (superiors?.userAlias || '') + ')';
    const defaultUserleader = [
      { userId: superiors?.id, userName: _leaderuserName },
    ];

    const isCurrentUser =
      c?.['x-component'] == EnumType?.member &&
      c?.['x-props']?.defaultValue === true; // 判断是否是成员组件且默认当前用户
    const _userName =
      (curUser?.name || '') + '(' + (curUser?.userAlias || '') + ')';
    const defaultUser = [{ userId: curUser?.userId, userName: _userName }];
    const needSetCurrentUser = (obj) =>
      obj?.['x-component'] == EnumType.member &&
      obj?.['x-props']?.defaultValue === true &&
      obj?.['x-props']?.defaultValueJson == null;
    const newNeedSetCurrentUser = (obj) =>
      obj?.['x-component'] == EnumType.member &&
      obj?.['x-props']?.defaultValueJson != null;
    let _initDefaultValue = c?.default;
    if (needSetCurrentUser(c)) {
      //旧的默认值
      _initDefaultValue = defaultUser;
    }
    if (newNeedSetCurrentUser(c)) {
      //新的默认值
      let dtype = c['x-props'].defaultValueJson;
      switch (dtype?.type) {
        case defaultEnum.none:
          //无默认值
          _initDefaultValue = [];
          break;
        case defaultEnum.currentUser:
          //当前用户，
          _initDefaultValue = defaultUser;
          break;
        case defaultEnum.currentUserLeader: {
          if (c['x-props'].isMultiple) {
            _initDefaultValue = currentUserSuperiors?.map((u) => ({
              userId: u.id,
              userName: (u?.name || '') + '(' + (u?.userAlias || '') + ')',
            }));
          } else {
            //当前用户上级
            if (defaultUserleader[0]?.userId) {
              _initDefaultValue = defaultUserleader;
            } else {
              _initDefaultValue = [];
            }
          }
          break;
        }
        case defaultEnum.custom:
          //自定义
          _initDefaultValue = dtype.value;
          break;
        case defaultEnum.currentFieldLeader: {
          if (c['x-props'].isMultiple) {
            _initDefaultValue = dtype.value;
          } else {
            if (dtype.value?.[0]?.['userId']) {
              _initDefaultValue = dtype.value?.[0] ? [dtype.value?.[0]] : [];
            } else {
              _initDefaultValue = [];
            }
          }
          break;
        }
        default:
          _initDefaultValue = [];
          break;
      }
    }
    _rowData[c?.key] = _initDefaultValue;
    if (
      (_initDefaultValue == true ||
        (_initDefaultValue?.length && _initDefaultValue?.[0]?.['userId'])) &&
      c?.['x-props']?.['memberMes']?.['selected']?.length
    ) {
      needAddUserInfo?.push({ id: c.id, user: _initDefaultValue });
    }
    // 保留自增编号
    if (c?.['x-component'] === EnumType.autoNumber) {
      autoNumberList.push({
        code: c?.key,
        autoNumberInfo: { ...c?.['x-props']?.autoNumberRule },
        renumbering: c?.['x-props']?.renumbering,
      });
    }
    if (c?.['x-component'] === EnumType.date) {
      const dataDefault = c?.['x-props']?.['dataDefault'];
      if (dataDefault?.key == EnumDateInitValue.todayBefore) {
        _rowData[c?.key] = moment()
          .subtract(dataDefault?.days, 'days')
          .valueOf();
      }
      if (dataDefault?.key == EnumDateInitValue.todayAfter) {
        _rowData[c?.key] = moment().add(dataDefault?.days, 'days').valueOf();
      }
      if (dataDefault?.key === EnumDateInitValue.today) {
        _rowData[c?.key] = moment().valueOf();
      }
      if (dataDefault?.key === EnumDateInitValue.defined) {
        _rowData[c?.key] = moment(Number(dataDefault?.defined))?.valueOf();
      }
    }
  });

  // ———————————————同步成员信息——————————————————————
  const setExtendUserInfo = (key, userId) => {
    const fields = cols.filter(co => co.userParentId === key);
    if (!fields.length) return Promise.resolve()
    return Promise.all([getUserListByIdsForMember(userId), getUserSuperiorsByParam(userId)]).then(res => {
      const [baseRes, superiorRes] = res
      const info = { ...baseRes.data?.[0] || {} }
      baseRes.data?.[0].extend?.forEach(ex => {
        info[ex.alias || ex.name] = ex.valueForMember || ex.value
      })
      if (superiorRes.data && superiorRes.data.length) {
        info[userInfoKind.associatedCi] = [{ userId: superiorRes.data[0].id, userName: superiorRes.data[0].userAlias || superiorRes.data[0].name }]
        info[userInfoKind.associatedCiMulti] = superiorRes.data.map(u => ({ userId: u.id, userName: u.userAlias || u.name }))
      }
      fields.forEach(field => {
        _rowData[field.key] = info[field.kind]
      })
    })
  }
  // 同步成员信息
  for (let i = 0;i < cols.length;i++) {
    const col = cols[i];
    if (col['x-component'] !== 'MEMBER') continue;
    const value = _rowData[col.key]
    if (!value || !value.length || isNil(value[0].userId)) continue;
    if (col['x-props']?.memberMes?.isSync && col['x-props']?.memberMes?.selected?.length) {
      await setExtendUserInfo(col.key, value[0].userId)
    }
  }
  // ———————————————同步成员信息——————————————————————

  if (autoNumberList?.length) {
    let len = value?.length || 0;
    let lastRowValue = len ? value[len - 1]?.rowData : {};
    let autoNumberLastRowValue = {};
    autoNumberList.forEach((item) => {
      autoNumberLastRowValue[item?.code] = lastRowValue[item?.code];
    });
    let params = {
      workOrderId,
      // mdlFormTemplateId: formModelId,
      autoNumberList,
      autoNumberLastRowValue,
    };
    let result = await addTableAutoNumber(params);
    let data = result?.data || {};
    for (let key in data) {
      _rowData[key] = data[key];
    }
  }
  //复制行数据,保留自动编号自增,不被复制
  if (row) {
    for (let key in row) {
      const col = cols?.find((c) => c.key === key);
      if (col && col['x-component'] !== 'AUTO_NUMBER') {
        _rowData[key] = row[key];
      }
    }
  }

  return _rowData;
};

/**
 * 字段校验
 * @param {*} col 列数据
 * @param {*} value 字段值
 * @param {*} rowNum 行号
 * @param {*} data 表格所有值
 * @param {*} needCheckRequired 要校验必填：点击提交/更新按钮 或者 曾经编辑过该单元格
 */
const registerValidationRules = (
  col,
  value,
  rowNum,
  data,
  needCheckRequired,
  excludeCheckRow = []
) => {
  const xRules = col?.['x-rules'];
  const fieldCode = col?.key;
  const isRequired = col?.required;
  const isDisabled =
    col?.disabled?.indexOf(rowNum) > -1 || col?.disabled?.indexOf(-1) > -1; // -1代表表头，此单元格只读或者整列只读，则不校验必填
  const isShow =
    col?.show?.indexOf(rowNum) > -1 ||
    (col?.hide?.indexOf(rowNum) || -1) === -1; // 此单元格展示，则要校验
  // console.log(col,col?.key,isRequired,isDisabled,isShow,'💢',needCheckRequired);
  if ((xRules && xRules?.length == 0 && !isRequired) || isShow === false) {
    return '';
  } else {
    const enumRules = Object.values(EnumValidationRulesValue); // 校验类型
    const validators = getValidateRules(); // 所有校验器
    let rules = [];
    xRules &&
      xRules?.map((r) => {
        let rule = {
          key: Object.keys(r)?.find((v) => enumRules?.indexOf(v) != -1),
          rule: r?.valueUniqueFlag
            ? { ...r, colValues: getColValues(fieldCode, data), rowNum }
            : { ...r },
        };
        rules = [...rules, rule];
      });
    if (needCheckRequired && isRequired)
      rules = [...rules, { key: 'required', rule: { required: true } }]; // 只读时也要校验必填
    // console.log(rules,'🎂🎂');
    let error = '';
    rules?.forEach((rule) => {
      if (!error) error = validators[rule?.key]?.(value, rule?.rule);
      // 必填时校验=>表格配置了成员字段。处理设置中的指派范围设置为多人处理。跟随功能字段-成员字段
      // 核心：不属于当前成员的行必填不校验
      if (rule?.key == 'required' && excludeCheckRow?.includes(rowNum + '')) {
        error = '';
      }
    });
    return error;
  }
};

/**
 * 获取列的所有值
 * @param {*} key 列code
 * @param {*} data 表格所有值
 */
const getColValues = (key, data) => {
  let list = [];
  data?.map((v, idx) => {
    list[idx] = v?.[key];
  });
  return list;
};
