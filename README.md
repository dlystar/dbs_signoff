import { intl } from '@chaoswise/intl';
import { theme } from '@/theme';
import React, {
  useMemo,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  Popconfirm,
  Button,
  Tooltip,
  message,
  Icon,
  Modal,
  Progress,
  Pagination,
  Spin,
  Drawer,
  Space
} from '@chaoswise/ui';
import { Upload } from 'antd';
import useTableItems, { $rowKey, $deleteable } from '../hooks/useTableItems';
import styles from '../style/table.less';
import { downloadFile, downloadFileByUrl } from '@/utils/T/core/helper';
import { downloadFile as downLoad } from '@/hooks/useFile/api';
import DoAppIcon from '@/components/DoAppIcon';
import { useAsyncEffect, useMemoizedFn } from 'ahooks';
import { langUtil } from '@/lang';
import {
  importTableData,
  downLoadTableTemplate,
} from '@/services/commonAPI/updateFile';
import moment from 'moment';
import { EnumType } from '@/constants/common/formType';
import { eventManager, guid } from '@/utils/T/core/helper';
import DosmDpCom from '@/components/ModuleFederation/DosmDpCom';
import { getReferenceData } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/api';
import { useCreation } from 'ahooks';
import TableFilterIcon, { isFilters } from './TableFilterIcon';
import RowForm from './RowForm';
import FormFieldTooltip from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/FormEngine/FormRender/CustomFieldBox/FormFieldTooltip'
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import DragIcon from '@/pages/ListNew/FieldShowSetting/DragIcon';
import cls from 'classnames'
import arrayMove from 'array-move';
import {nanoid} from 'nanoid';

const { Dragger } = Upload;

const isNewData = Symbol('@@标记这条数据是用户新关联的@@'); // cw-i18n-disable-line


const ITableForm = ({ ...props }) => {
  const tableEl = useRef(null);
  const uploadRef = useRef(null);
  const selectDataTableRef = useRef({ current: {} });
  const {
    fieldName,
    fieldCode,
    useByChanges,
    modifiedValue,
    t,
    isSupportExport,
    isSupportImport,
    value,
    linkTable,
    readOnly,
    onChange,
    columns,
    utils,
    hasAddBtn,
    version = 'v1',
    quoteDataTable = {},
    colMinWidth,
    isValid,
    tableFieldRowConf = {
      startNum: 0,
      pageSize: '5'
    },
    tableEdit,
    enableRowSort,
    disabled
  } = props;
    const tableEleId = useCreation(() => `${guid(6)}_${fieldCode}`);
  const {
    getTableBodyProps,
    colState,
    rows: _rows,
    cols,
    headers,
    prepareRow,
    addRow,
    delRow,
    copyRow,
    errList,
    btnPermission = {},
    addRows,
    formatRows,
    getNewRow,
    onRowChange,
    setData,
    adding
  } = useTableItems({ ...props, tableEleId });
  const { startNum, pageSize: settingSize } = tableFieldRowConf;

  const [filters, setFilters] = useState({}); // 筛选条件

  const onFilters = (value, column) => {
    setFilters({ ...filters, [column.id]: { column, value } });
    setCurrentPage(1);
  }
  // 是否有配置项
  const isCMDB = !!useMemo(() => (headers || []).find(item => item['x-component'] === 'CMDB_CONFIG'), [headers]);
  const isCmdbField = !!(props.dpItem || props.attrId);

  // 是否有在筛选
  const _isFilters = useMemo(() => Object.values(filters).some(item => isFilters(item?.value)), [filters]);
  // 筛选行
  const rows = useMemo(() => {
    if (!_isFilters) return _rows;
    return (_rows || []).filter(row => {
      return Object.entries(row.values || {}).every(([id, value]) => {
        const filter = filters[id];
        if (!filter || !filter.value) return true;
        if (Object.prototype.toString.call(filter.value) === '[object Array]' && !filter.value.length) return true;
        // 下拉单选
        if (filter.column['x-component'] === 'SELECT') {
          return filter.value.includes(value);
        }
        // 下拉多选
        if (filter.column['x-component'] === 'SELECT_MANY') {
          return (value || []).find(v => filter.value.includes(v));
        }
        // 多级下拉
        if (filter.column['x-component'] === 'MULTI_SELECT') {
          return (value || []).find(v => filter.value.includes(v));
        }
        // 成员
        if (filter.column['x-component'] === 'MEMBER') {
          return (value || []).find(v => filter.value.find(_v => v.userId === _v.userId));
        }
        // 成员组-仅到人
        if (filter.column['x-component'] === 'GROUP' && filter.column['x-props'].selectType === 'person') {
          return (value || []).find(v => filter.value.find(_v => v.userId === _v.userId));
        }
        // 成员组-仅到组
        if (filter.column['x-component'] === 'GROUP' && filter.column['x-props'].selectType === 'group') {
          return (value || []).find(v => filter.value.find(_v => v.groupId === _v.groupId));
        }
        // 成员组-既可到组也可到人
        if (filter.column['x-component'] === 'GROUP' && filter.column['x-props'].selectType === 'all') {
          let filterValue = [];
          if (Object.prototype.toString.call(filter.value) === '[object Array]') {
            filterValue = filter.value;
          } else {
            filterValue = [...(filter.value.group || []), ...(filter.value.user || [])];
          }
          return (value || []).find(v => filterValue.find(_v => (v.groupId === _v.groupId && (!!v.groupId)) || ((v.userId === _v.userId) && (!!v.userId))));
        }

      });
    })
  }, [_rows, filters, _isFilters]);

  const { dataTableName, listViewId, dataTableId, formViewId } = quoteDataTable;
  const {
    isBusinessPanel,
    actions,
    baseActions,
    linkage,
    onFieldLinkage,
    isType = 'myStart',
    linkTableRef,
    orderInfo,
    formLayout
  } = t || {};
  const { referenceTableFormMap } = orderInfo || {};
  const { handleValueToLabel } = utils || {};
  let { linkageChangeOptions } = linkTable || {};
  const [exportBtnLoading, setExportBtnLoading] = useState(false);
  const [valid, setValid] = useState(isValid || false);
  const [isRightMost, setIsRightMost] = useState(false); // 横向滚动条是否滑到最右
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(settingSize);
  const [dataLength, setDataLength] = useState(rows?.length);
  const [updateItems, setupdateItems] = useState(null); // 表格配置项附带回显数据
  const isDataTable = version === 'v2'; // 表格是否使用数据表作为数据来源
  const [selectedTableData, setSelectedTableData] = useState([]); // 数据表记录
  const [title, setTitle] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentViewData, setCurrentViewData] = useState({});
  const [refDataLoading, setRefDataLoading] = useState(false);
  const [initRowsNum, setInitRowsNum] = useState(0);
  const [radKey, setRadKey] = useState(nanoid());

  actions?.getFieldState(fieldCode).then((state) => {
    setValid(state?.valid || true);
  });

  useEffect(() => {
    let eventManagerCode = `tableItemChange${fieldCode}`;
    const updateOthreFuntion = (dataItems = {}) => {
      setupdateItems(dataItems);
    };
    // 把选定配置项待渲染字段数据存到状态
    eventManager.on(eventManagerCode, updateOthreFuntion);
    return () => {
      eventManager.off(eventManagerCode, updateOthreFuntion);
    };
  }, []);
  useEffect(() => {
    // 渲染选定配置项字段数据 然后清空待渲染字段数据
    if (updateItems) {
      let _value = value.map((el, index) => {
        if (index == updateItems?.rowNum) {
          let newEl = { ...el };
          let filterUpdateItems = {};
          let rowItemKeys = Object.keys(newEl?.rowData || {});
          for (let [key, value] of Object.entries(updateItems || {})) {
            if (rowItemKeys.includes(key)) {
              filterUpdateItems[key] = value;
            }
          }
          newEl.rowData = { ...newEl.rowData, ...filterUpdateItems };
          return newEl;
        }
        return el;
      });
      if (onChange) {
        onChange(_value);
      }
      setupdateItems(null);
    } else if (
      version === 'v2' &&
      referenceDependentField &&
      value &&
      value.length
    ) {
      // 字段联动的value没有带出字段的值，这里判断如果value没有带出字段的值，就走onChane
      const rowData = value?.[0]?.rowData || {};
      let noAttrs = false;
      quoteDataTable.bringOutFieldSchema.forEach((item) => {
        if (!rowData.hasOwnProperty(item.key)) {
          noAttrs = true;
        }
      });
      const _value = {
        value: value?.map((item) => item.rowData[referenceDependentField]),
        tableData: value?.map((item) => ({
          low_code_sys_id: item.rowData[referenceDependentField],
        })),
      };
      if (noAttrs) {
        handleDataChange(_value);
      }
    }
  }, [value, updateItems]);

  //要展示的数据
  const showRows = useMemo(() => {
    // 如果新增一条列表数据，表格显示最后一页数据，处在筛选状态除外
    if (!_isFilters && (rows?.length > parseInt(dataLength))) {
      let lastPage = Math.floor(rows?.length / pageSize);
      const remainder = rows?.length % pageSize;
      if (remainder == 0) {
        setCurrentPage(lastPage);
        lastPage--;
      } else {
        setCurrentPage(lastPage + 1);
      }
      setDataLength(rows?.length); //存储当前数据条数，用于下次区分变更数据量
      return rows.slice(lastPage * pageSize, rows?.length);
    }
    !_isFilters && setDataLength(rows?.length); //存储当前数据条数，用于下次区分变更数据量
    return rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [rows, currentPage, pageSize]);

  // all columns is hide
  const isAllColumnsHide = useMemo(() => {
    if (!cols || !cols.length) return false;
    return cols.every((col) => col.hide && !col.show);
  }, [cols])

  // 要展示的列数，所有列都隐藏时，不显示添加按钮和表头
  const showColumns = useMemo(() => {
    let count = 0;
    headers?.length > 0 &&
      headers?.forEach((h) => {
        // -1是表头，show集合里有-1 或有要展示的单元格时，表头则需要展示
        // 针对的特殊场景：
        // 1.把表格所有列隐藏，但表格不隐藏，则把整个表格内容隐藏但是表格的名称显示
        // 2.把表格某一列隐藏，再把该列的某一行/几行设置为显示，则该列显示，且只显示该一行/几行的单元格，其他行隐藏
        if (
          h?.show?.indexOf(-1) > -1 ||
          h?.show?.length > 0 ||
          !h?.hide?.length
        )
          count++;
      });
    return count;
  }, [headers, rows]);

  // 可以编辑的列
  const editabledColumns = useMemo(() => {
    return headers?.filter((col) => !col.disabled && !col.hide)?.length || 0;
  }, [headers, rows]);

  // 默认最小列宽:
  // 小于7列时，按容器大小平均分配列宽；
  // 超过7列时，每列默认宽度为当前容器的7分之1
  const colWidth = useMemo(() => {
    const containerWidth = tableEl?.current?.offsetWidth;
    return containerWidth ? (containerWidth - 2) / 5 : 120;
  }, [headers]);

  // table操作列样式
  const tableContentClassName = useMemo(() => {
    // 没有滚动条时，不显示操作列阴影
    const clientWidth = tableEl.current?.clientWidth || 0;
    const scrollWidth = tableEl.current?.scrollWidth || 0;
    return isRightMost || clientWidth == scrollWidth
      ? styles['ticket-panel-wrapper']
      : `${styles['ticket-panel-wrapper']} ${styles['action-col-box-shadow']}`;
  }, [isRightMost, headers]);

  // 是否有关联数据的权限
  // 是否有移除数据的权限（当前用户新增的数据未提交前都可移除，其它数据则看权限）
  // 查看数据的权限
  const [addedable, removeable, viewabled] = useMemo(() => {
    // 新需求-12-25：默认都可编辑
    return [true, true, true];
    // return [
    //   !!referenceTableFormMap?.[fieldCode]?.insert,
    //   !!referenceTableFormMap?.[fieldCode]?.delete,
    //   !!referenceTableFormMap?.[fieldCode]?.read,
    // ]
  }, [referenceTableFormMap]);

  // 表格引用新数据表的依赖字段
  const referenceDependentField = useMemo(() => {
    if (version === 'v2' && columns && columns.length > 0) {
      const column = columns[0];
      const referenceDependentField =
        column?.['x-props']?.referenceAttr?.referenceDependentField || '';
      setSelectedTableData(
        value?.map((item) => item.rowData[referenceDependentField])
      );
      return referenceDependentField;
    } else {
      return '';
    }
  }, [columns]);
  /**
   * table滚动条事件
   */
  const onTableScroll = () => {
    const scrollLeft = tableEl.current?.scrollLeft || 0;
    const clientWidth = tableEl.current?.clientWidth || 0;
    const scrollWidth = (tableEl.current?.scrollWidth || 0) - 2;
    setIsRightMost(scrollLeft + clientWidth > scrollWidth);
  };

  /**
   * 获取拖拽后的列宽
   * @param {*} param0
   * @returns
   */
  const getWidth = ({ defaultColSetting, id, getProps, column }) => {
    const { inputVal, initVal } = defaultColSetting || {};
    // colState存放拖拽过的列信息， inputVal是流程配置的默认列宽， initVal是计算出来的默认初始列宽
    const resizingWidth =
      colState?.columnResizing?.columnWidths?.[id] || inputVal || initVal;
    let resizingStyle = getProps();
    let minWidth = 150;
    switch(column?.['x-component']){
      case 'AUTO_NUMBER':
        minWidth = 50;
        break;
      case 'DATE':
        minWidth = 200;
        break;
    }
    resizingStyle.style.width = resizingWidth < 0 ? colWidth : resizingWidth;
    resizingStyle.style.minWidth = colMinWidth || minWidth;
    if (inputVal || colState?.columnResizing?.columnWidths?.[id])
      resizingStyle.style['flexGrow'] = 0; // 拖拽过、设置了列宽的列，不延展
    return resizingStyle;
  };

  const handleExport = (e) => {
    setExportBtnLoading(true);
    uploadRef.current.export(e, () => {
      setExportBtnLoading(false);
    });
  };

  const handleImportSubmit = (data = []) => {
    return new Promise(async (resolve, reject) => {
      try {
        // 表格赋值
        actions.setFieldValue(fieldCode, [...(value || []), ...(data || [])]);
        resolve();
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  };

  // 分页会导致不在当前页的组件被卸载，某些字段联动的结果会丢失
  // 如字段联动-改变选项 等动作，并未直接修改schema,
  // 这时候若是切换了页码会致使原来的组件被卸载，这个结果丢失
  // 所以我们在页码改变的时候重新去设置一下
  const handleChangePageSize = (current, pageSize) => {
    if (current === currentPage) return;
    if (
      linkTableRef &&
      linkTableRef.current &&
      linkTableRef.current[fieldCode]
    ) {
      if (!linkageChangeOptions) linkageChangeOptions = {};
      Object.entries(linkTableRef.current[fieldCode].linkageChangeOptions || {})
        .slice(0, current * pageSize)
        .forEach(([k, v]) => {
          linkageChangeOptions[k] = { ...v };
        });
      linkTable.linkageChangeOptions = { ...linkageChangeOptions };
    }
  };

  // 数据表弹窗选择
  const handleDataChange = async (tableDataValue = {}) => {
    const mainKey = 'low_code_sys_id';
    const { tableData = [] } = tableDataValue;
    const tableDataTrans = tableData.map((item) => {
      return {
        ...item,
        [mainKey]: item[mainKey].value || item[mainKey],
      };
    });
    let rows = [];
    const sysIds = tableDataTrans.map((item) => item[mainKey]);
    // if(sysIds.length < 1) return
    let dosmData = {};
    if (sysIds.length > 0) {
      setRefDataLoading(true);
      dosmData = await getReferenceData({
        tableName: dataTableName,
        columnValues: sysIds,
      });
      setRefDataLoading(false);
    }
    const { data: transData = {} } = dosmData;
    // 引用的表格有一列隐藏数据，为带出字段的引用字段，意思就是使用这个字段可以带出其他所有列数据
    Object.values(transData).forEach((dataItem) => {
      let tableItem = {};
      quoteDataTable.bringOutFieldSchema.forEach((item) => {
        tableItem[item.key] = dataItem[item['x-props'].referenceAttr.column];
      });
      tableItem[referenceDependentField] = dataItem[mainKey];
      rows.push({
        ...tableItem,
        [isNewData]: true, // 标记这个数据是新关联的
      });
      // if(!selectedTableData.includes(dataItem[mainKey])){
      //   rows.push({
      //     ...tableItem,
      //     [isNewData]: true, // 标记这个数据是新关联的
      //   })
      // }
    });
    setSelectedTableData([...selectedTableData, ...sysIds]);
    // rows.length && addRows(rows)
    const newRows = await formatRows(rows);
    onChange(newRows);
    // 触发字段联动
    const formState = await actions.getFormState();
    const formValues = { ...formState.values, ...baseActions.getBaseValue() };
    for (let i = 0;i < rows?.length;i++) {
      // 遍历导入的表格数据
      for (const k in rows[i]) {
        if (rows[i]?.hasOwnProperty?.(k) && k != referenceDependentField) {
          // 触发字段联动
          await onFieldLinkage({
            linkage,
            fieldState: {
              fieldCode: k,
              values: await actions.getFieldValue(fieldCode),
              value: await actions.getFieldValue(fieldCode),
              props: { key: fieldCode },
              path: fieldCode,
              name: fieldCode,
            },
            values: formValues,
            actions,
          });
        }
      }
    }
  };
  // 移除单条数据-数据表
  const removeRowForDataTable = (index, row) => {
    selectDataTableRef.current.setSelectedKeys((pre) => {
      const preC = JSON.parse(JSON.stringify(pre));
      preC.splice(index, 1);
      return preC;
    });
    setSelectedTableData((pre) => {
      const preC = JSON.parse(JSON.stringify(pre));
      preC.splice(index, 1);
      return preC;
    });
    delRow(index);
  };

  // 新数据表回显value
  const dataTabelValue = () => {
    if (version === 'v2') {
      if (value && value.length) {
        return value.map((item) => item.rowData[referenceDependentField]);
      } else {
        return value;
      }
    }
    return value;
  };
  const [tableRowEditVisible, setTableRowEditVisible] = useState(false)
  const [currentRow, setCurrentRow] = useState(undefined)
  const onEdit = (row) => {
    setCurrentRow(row)
    setTableRowEditVisible(true)
  }
  const onAddRow = useMemoizedFn(() => {
    // 弹窗编辑行
    if (tableEdit && tableEdit === 'form') {
      getNewRow().then(res => {
        res.allCells = cols
        res.values = res.rowData
        setCurrentRow(res)
        setTableRowEditVisible(true)
      })
    } else {
      addRow()
    }
  })
  const renderRowFormTitle = () => {
    const preDisabled = () => {
      if (currentRow?.index === 0) return true
      if (currentRow?.index === undefined && rows.length === 0) return true
      return false
    }
    const nextDisabled = () => {
      if (rows[rows.length - 1]?.id === currentRow?.id) return true
      if (currentRow?.index === undefined) return true
      return false
    }
    return <div className={styles['row-form-title']}>
      <span>{fieldName}</span>
      <div className={styles['row-form-title-operator']}>
        <Space>
          <Button size='small' shape="circle" disabled={preDisabled()} onClick={() => {
            const findRow = rows.find(i => i.index === (currentRow?.index - 1))
            setCurrentRow(findRow || rows[rows.length - 1])
          }}>
            <DoAppIcon type="left" style={{ marginLeft: '-2px' }} />
          </Button>
          <Button size='small' disabled={nextDisabled()} shape="circle" onClick={() => {
            setCurrentRow(rows.find(i => i.index === (currentRow?.index + 1)))
          }}>
            <DoAppIcon type="right" style={{ marginLeft: '2px' }} />
          </Button>
        </Space>
      </div>
    </div>
  }
  const renderOprater = (row, rowIdx) => {
    if (isDataTable) {
      if (useByChanges || readOnly) {
        return (
          <div key={row?.original?.[$rowKey]} className={styles['del-btn']}>
            {viewabled && isDataTable && (
              <span
                onClick={() => {
                  setCurrentViewData(row.original);
                  setDrawerVisible(true);
                }}
                className='i-btn'
              >
                {langUtil.t(
                  intl.get('7c1dda3c-d117-4089-ac1f-2fa18072b078').d('查看详情')
                )}
              </span>
            )}
          </div>
        );
      } else {
        return (
          <div key={row?.original?.[$rowKey]} className={styles['del-btn']}>
            {btnPermission?.flag &&
              rowIdx >= btnPermission?.disabledDelMaxRow &&
              showColumns != 0 &&
              (row.original[isNewData] || removeable) ? (
              <Popconfirm
                title={langUtil.t(
                  intl
                    .get('3a04d5d4-aa3b-4493-b4b2-1a9209ffb523')
                    .d('是否确认删除该行？')
                )}
                onConfirm={() => removeRowForDataTable(row?.index, row)}
              >
                <span className='i-btn'>
                  {langUtil.t(
                    intl.get('2e0705c0-2c31-49e6-bb8e-0de22443e9f3').d('移除')
                  )}
                </span>
              </Popconfirm>
            ) : null}

            {viewabled && (
              <span
                onClick={() => {
                  setCurrentViewData(row.original);
                  setDrawerVisible(true);
                }}
                className='i-btn'
              >
                {langUtil.t(
                  intl.get('7c1dda3c-d117-4089-ac1f-2fa18072b078').d('查看详情')
                )}
              </span>
            )}
          </div>
        );
      }
    } else {
      if (useByChanges || readOnly) return null;
      return (
        <div key={row?.original?.[$rowKey]} className={styles['del-btn']} style={{ padding: '0 12px' }}>
          {
            tableEdit === 'form' && (
              <Icon type="form" className='i-btn' onClick={() => onEdit(row)} />
            )
          }
          {btnPermission?.flag &&
            rowIdx >= btnPermission?.disabledDelMaxRow &&
            showColumns != 0 && 
            row?.original?.[$deleteable] !== false ? (
            <Popconfirm
              title={langUtil.t(
                intl
                  .get('3a04d5d4-aa3b-4493-b4b2-1a9209ffb523')
                  .d('是否确认删除该行？')
              )}
              onConfirm={() => delRow(row?.index, () => {
                if(row?.index % pageSize === 0 && row?.index === rows?.length -1 && currentPage > 1){
                  setCurrentPage(currentPage - 1)
                }
              })}
            >
              <DoAppIcon type='shanchu' className='i-btn' />
            </Popconfirm>
          ) : (
            (row?.original?.[$deleteable] !== false && disabled != true) && (
              <DoAppIcon type='shanchu' className='i-btn' />
            )
          )}

          {(hasAddBtn !== false && disabled != true) && (
            <DoAppIcon
              className='i-btn'
              type='fuzhi'
              onClick={(e) => copyRow(e, row)}
            />
          )}
        </div>
      );
    }
  };

  useEffect(() => {
    if (!Array.isArray(value) && !value) {
      setInitRowsNum(startNum);
    }
  }, [value])

  useAsyncEffect(async () => {
    if (initRowsNum) {
      let _rows = [];
      for (let i = 0; i < initRowsNum; i++) { 
        const newRows = await getNewRow(null, i > 0 ? [_rows[_rows.length - 1]] : undefined);
        _rows.push({
          ...newRows,
          rowNum: i?.toString()
        })
      }
      onChange(_rows);
    }
  }, [initRowsNum])

  const onSortOver = ({ index, newIndex, oldIndex, nodes }) => {
    if(_rows?.[newIndex]?.original?.[$deleteable] === false) return;
    const parentNode = nodes[0].node.parentNode;
    const overNode = nodes[newIndex].node;
    const moveNode = nodes[index].node;
    let top = overNode.offsetTop
    if (overNode.clientHeight > moveNode.clientHeight) {
      top = overNode.offsetTop + overNode.clientHeight - moveNode.clientHeight
    } else if (moveNode.clientHeight > overNode.clientHeight) {
      top = overNode.offsetTop - (moveNode.clientHeight - overNode.clientHeight)
    }
    if (top < 0) {
      top = 0
    }
    parentNode.style.setProperty('--moveY', `${top}px`);
    parentNode.style.setProperty('--height', `${moveNode.clientHeight}px`);
    parentNode.classList.add(styles['move-active']);
  };

  const onSortEnd = (e) => {
    const { nodes, newIndex } = e;
    nodes[0].node.parentNode.classList.remove(styles['move-active']);
    nodes[0].node.parentNode.style.setProperty('--moveY', '0px');
    tableEl.current.classList.remove(styles['moving'])

    if(_rows?.[newIndex]?.original?.[$deleteable] === false) return;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currPageValue = value.slice(startIndex, endIndex)

    const fixedCols = [];
    cols.forEach(col => {
      if ([EnumType.autoNumber].includes(col['x-component'])) {
        fixedCols.push(col.key)
      }
    })
    const fixedValueArray = currPageValue.map(v => {
      const fixedRowData = {}
      fixedCols.forEach(k => {
        fixedRowData[k] = v?.rowData?.[k]
      })
      return {
        rowNum: v.rowNum,
        rowData: fixedRowData
      }
    })
    const sortedArray = arrayMove(currPageValue, e.oldIndex, e.newIndex)
    sortedArray.forEach((item, index) => {
      item.rowNum = fixedValueArray[index].rowNum
      item.rowData = {
        ...item.rowData,
        ...fixedValueArray[index].rowData
      }
    })
    value.splice(startIndex, endIndex, ...sortedArray)
    setData(value.map(v => ({ ...v.rowData })))
    actions.setFieldValue(fieldCode, [...value])
    setRadKey(nanoid())
  }

  const onSortStart = () => {
    tableEl.current.classList.add(styles['moving'])
  }

  return (
    <>
      <div
        className={`${styles['dynamic-table-container']} ${isBusinessPanel ? '' : styles['ticket']
          }`}
      >
        {/* 导入导出 */}
        {(isSupportExport || isSupportImport) && valid && showColumns > 0 && (
          <div className={styles['tool-bar']}>
            {!readOnly &&
              isSupportImport &&
              editabledColumns > 0 &&
              btnPermission?.flag && (
                <Button type='link' onClick={() => uploadRef.current.show()}>
                  {langUtil.t(
                    intl.get('e7e28773-1133-41f7-9e97-01bed6dae4ae').d('导入')
                  )}
                </Button>
              )}

            {isSupportExport &&
              ((rows && rows?.length > 0) || isBusinessPanel) && (
                <Button
                  style={{ marginLeft: '16px' }}
                  type='link'
                  loading={exportBtnLoading}
                  onClick={handleExport}
                >
                  {langUtil.t(
                    intl.get('72d79e31-d6c8-4852-a43c-85a3ad2a45f0').d('导出')
                  )}
                </Button>
              )}
          </div>
        )}

        <Spin spinning={refDataLoading}>
          <div className={styles['dynamic-table']}>
            {/* 流程配置页的表格 */}
            {isBusinessPanel ? (
              <div ref={tableEl} className={styles['business-panel-wrapper']}>
                <div className={styles['dynamic-table-thead']}>
                  {(headers || [])?.map((column) => {
                    const defaultColWidth = column['x-props']?.['defaultColWidth']?.inputVal;
                    // 悬浮展示的hintType为2
                    const changeHint = linkTable?.linkageSetFieldHint?.[0]?.[column?.id]
                    const useChangeHint = changeHint?.hintType == 2
                    return (
                      <div
                        id={column?.id}
                        key={column?.id}
                        className={styles['dynamic-table-th']}
                        style={{
                          width: `${defaultColWidth || colWidth}px`,
                          flexGrow: defaultColWidth ? 0 : 1,
                        }}
                      >
                        <span className={styles['dynamic-table-title']}>
                          {column.render('Header')}
                          <FormFieldTooltip
                            fieldHint={useChangeHint ? [changeHint] : column['x-props']?.fieldHint}
                            fontSize={formLayout?.fontSize}
                          />
                        </span>
                        <span
                          className={styles['dynamic-table-quote']}
                          style={{
                            display: column?.kind ? 'inline-block' : 'none',
                            fontSize: '18px',
                            color: '#ffb02c',
                          }}
                        >
                          <DoAppIcon type='yinyong-1' />
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div
                  {...getTableBodyProps()}
                  className={styles['dynamic-table-tbody']}
                >
                  {(rows || [])?.map((row, rowIdx) => {
                    prepareRow(row);
                    return (
                      <div
                        key={row?.original?.[$rowKey]}
                        className={styles['dynamic-table-row']}
                      >
                        {row.cells?.map((cell, cellIdx) => {
                          const { row, column } = cell || {};
                          const defaultColWidth =
                            column['x-props']?.['defaultColWidth']?.inputVal;
                          return (
                            <span
                              key={`${column?.key}_${row?.original?.[$rowKey]}`}
                              className={styles['dynamic-table-col']}
                              style={{
                                width: `${defaultColWidth || colWidth}px`,
                                flexGrow: defaultColWidth ? 0 : 1,
                              }}
                            >
                              {cell.render('Cell')}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 工单页的表格 */}
            {!isBusinessPanel ? (
              <div
                className={tableContentClassName}
                ref={tableEl}
                onScroll={onTableScroll}
                id={tableEleId}
              >
                <div className={styles['dynamic-table-thead']}>
                  {
                    enableRowSort?.includes?.('1') && !readOnly && (
                      <div className={cls(styles['dynamic-table-th'])} style={{ width: '20px', minWidth: '20px', flex: 0 }} />
                    )
                  }
                  {(headers || [])?.map((column) => {
                    const theadStyle = getWidth({
                      defaultColSetting: column['x-props']['defaultColWidth'],
                      id: column?.id,
                      getProps: column.getHeaderProps,
                      column
                    });
                    const isShowHeader =
                      !column?.hide?.length ||
                      column?.hide?.indexOf(-1) < 0 ||
                      column?.show?.indexOf(-1) > -1 ||
                      column?.show?.length > 0 ||
                      useByChanges;
                    const isColumnCmdbField = !!column.dpCode; // 当前列是否来自cmdb
                    const isShowFilterIcon = !(isColumnCmdbField || isCmdbField || isCMDB) && !isDataTable && ['SELECT', 'SELECT_MANY', 'MULTI_SELECT', 'MEMBER', 'GROUP'].includes(column?.['x-component']);
                    // 悬浮展示的hintType为2
                    const changeHint = linkTable?.linkageSetFieldHint?.[0]?.[column?.id]
                    const useChangeHint = changeHint?.hintType == 2
                    return isShowHeader ? (
                      <div
                        id={column?.id}
                        key={column?.id}
                        {...theadStyle}
                        className={cls(styles['dynamic-table-th'], { [styles['dynamic-table-th-filter-icon']]: isShowFilterIcon })}
                      >
                        {column?.required ? (
                          <span
                            className={styles['dynamic-table-th-required']}
                          ></span>
                        ) : null}
                        <Tooltip
                          title={column.render('Header')}
                          placement='topLeft'
                        >
                          {column.render('Header')}
                        </Tooltip>
                        <FormFieldTooltip
                          fieldHint={useChangeHint ? [changeHint] : column['x-props']?.fieldHint}
                          fontSize={formLayout?.fontSize}
                        />
                        {isShowFilterIcon && <TableFilterIcon column={column} onChange={onFilters} />}
                        <div
                          {...column.getResizerProps()}
                          className={`${styles['resizer']}`}
                        />
                      </div>
                    ) : null;
                  })}
                  {headers?.length > 0 &&
                    showColumns != 0 &&
                    !useByChanges &&
                    (!readOnly || isDataTable) ? (
                    <div className={styles['action-th']}></div>
                  ) : null}
                </div>
                <SortableList
                  distance={5}
                  helperClass='custom-table-row-dragging'
                  onSortOver={onSortOver}
                  onSortEnd={onSortEnd}
                  onSortStart={onSortStart}
                  helperContainer={tableEl.current}
                  useDragHandle
                  key={radKey}
                  {...getTableBodyProps()}
                >
                  {(showRows || [])?.map((row, rowIdx) => {
                    prepareRow(row);
                    return (
                      <SortableItem
                        key={`item-${row?.original?.[$rowKey]}`}
                        index={rowIdx}
                        disabled={readOnly || !enableRowSort?.includes?.('1') || row.original?.[$deleteable] === false}
                      >
                        <div className={styles['dynamic-table-row']}>
                          {
                            (!readOnly && enableRowSort?.includes?.('1')) && (
                              <DragHandler
                                disabled={row.original?.[$deleteable] == false}
                              />
                            )
                          }
                          {row.cells?.map((cell, cellIdx) => {
                            const { row, column } = cell || {};
                            const cellStyle = getWidth({
                              defaultColSetting:
                                column['x-props']['defaultColWidth'],
                              id: column?.id,
                              getProps: cell.getCellProps,
                              column
                            });
                            let error = errList
                              ? errList?.[row?.index]?.[column?.key] || ''
                              : '';
                            if (error) error = new String(error);
                            let cellClassName = error
                              ? `${styles['error']} has-error`
                              : `${styles['dynamic-table-col']}`;
                            // 用于改动记录的样式：修改过的单元格为红色
                            if (Array.isArray(modifiedValue)) {
                              modifiedValue?.forEach((r) => {
                                if (
                                  r.rowNum == row?.index &&
                                  r?.rowData?.hasOwnProperty(column.id)
                                )
                                  cellClassName += ` ${styles['new-val']}`;
                              });
                            }
                            const isShowHeader =
                              !column?.hide?.length ||
                              column?.hide?.indexOf(-1) < 0 ||
                              column?.show?.length > 0 ||
                              useByChanges;
                            const isShowCell =
                              column?.show?.indexOf(rowIdx) > -1 ||
                              (column?.hide?.indexOf(rowIdx) === undefined
                                ? -1
                                : column?.hide?.indexOf(rowIdx)) === -1;
                            return isShowHeader ? (
                              <div
                                {...cellStyle}
                                className={cellClassName}
                                key={`${column?.key}_${row?.original?.[$rowKey]}`}
                              >
                                {/* 当表格字段没有参与字段联动时，只有初始时会返回show:[-1]【展示表头】，新增行/删除行时，show也不会更新，所以结合hide来展示单元格 */}
                                {isShowCell ? cell.render('Cell') : null}
                                <span className={styles['explain']}>
                                  {error}
                                </span>
                              </div>
                            ) : null;
                          })}
                          {!isAllColumnsHide && renderOprater(row, rowIdx)}
                        </div>
                      </SortableItem>
                    );
                  })}
                </SortableList>
              </div>
            ) : null}

            {/* 工单页的分页和添加行 */}
            {(!isBusinessPanel && !isAllColumnsHide) ? (
              <div className={styles['footer']}>
                {btnPermission?.flag &&
                  headers?.length > 0 &&
                  showColumns != 0 &&
                  !useByChanges &&
                  hasAddBtn !== false &&
                  !isDataTable && 
                  !_isFilters ? (
                  <Button type='link' onClick={onAddRow} loading={adding}>
                    <DoAppIcon type='dashAddMenu' />
                    {intl
                      .get('e450cfc8-7f7b-4694-9bb2-85a618bcb226')
                      .d('添加行')}
                  </Button>
                ) : null}

                {btnPermission?.flag &&
                  headers?.length > 0 &&
                  showColumns != 0 &&
                  !useByChanges &&
                  hasAddBtn !== false &&
                  addedable &&
                  isDataTable ? (
                  <Button
                    type='link'
                    onClick={() => selectDataTableRef.current.setVisible(true)}
                  >
                    <DoAppIcon type='dashAddMenu' />
                    {intl
                      .get('dfed63c8-fe9a-4914-a5f3-c25f1f5bb5c4')
                      .d('关联数据')}
                  </Button>
                ) : null}

                <Pagination
                  showTotal
                  showQuickJumper
                  showSizeChanger
                  size={useByChanges ? 'samll' : 'default'}
                  simple={!!useByChanges}
                  pageSizeOptions={['5', '10', '20', '30', '50', '100']}
                  current={currentPage}
                  total={rows?.length}
                  pageSize={pageSize}
                  //页码改变
                  onChange={(currentPage, pageSize) => {
                    setCurrentPage(currentPage);
                    handleChangePageSize(currentPage, pageSize);
                  }}
                  //分页大小改变
                  onShowSizeChange={(currentPage, pageSize) => {
                    setPageSize(pageSize);
                    setCurrentPage(1);
                  }}
                />
              </div>
            ) : null}
          </div>
        </Spin>
      </div>
      <ImportForm
        ref={uploadRef}
        onSubmit={handleImportSubmit}
        isType={isType}
        headers={headers}
        {...props}
      />

      {version === 'v2' && !isBusinessPanel && (
        <div style={{ display: 'none' }}>
          <DosmDpCom
            module='./DataTableRecordSelect'
            placeholder={langUtil.t(
              intl.get('ea5b8187-ccee-471b-a71d-fad924302c89').d('请选择')
            )}
            referenceTable={dataTableName}
            value={{
              value: dataTabelValue(),
              referenceTable: dataTableName,
            }}
            jumpDetail={false}
            style={{ width: '100%', flex: '1 1 0%' }}
            onChange={handleDataChange}
            defaultViewId={listViewId}
            formViewId={formViewId}
            isModuleFederation={true}
            onInit={(setVisible, setSelectedKeys, handleClick4Detail) => {
              selectDataTableRef.current.setVisible = setVisible;
              selectDataTableRef.current.setSelectedKeys = setSelectedKeys;
              selectDataTableRef.current.handleClick4Detail =
                handleClick4Detail;
            }}
          />
        </div>
      )}

      <Drawer
        width={680}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
            }}
          >
            <div>{title}</div>
            {value && (
              <div
                style={{
                  position: 'absolute',
                  right: 30,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <a
                  onClick={() => {
                    selectDataTableRef.current.handleClick4Detail(
                      formViewId,
                      currentViewData?.[referenceDependentField]
                    );
                  }}
                >
                  {langUtil.t(
                    intl
                      .get('657e6d2e-4ecd-4934-84f3-ce690985bb4c')
                      .d('打开记录')
                  )}
                </a>
              </div>
            )}
          </div>
        }
      >
        <div className={styles['record-detail']}>
          <DosmDpCom
            module='./FormViewDetail'
            match={{
              params: {
                viewId: formViewId,
                dataId: currentViewData?.[referenceDependentField] || '',
              },
            }}
            location={window.location}
            history={{}}
            route={{}}
            setDetailTitle={setTitle}
            range={'pc'}
            isView={true}
            isModuleFederation={true}
            onCancel={() => setDrawerVisible(false)}
          />
        </div>
      </Drawer>
      <Drawer
        maskClosable={false}
        width={680}
        visible={tableRowEditVisible}
        onClose={() => setTableRowEditVisible(false)}
        title={renderRowFormTitle()}
        destroyOnClose
      >
        <RowForm
          tableKey={fieldCode}
          columns={columns}
          row={currentRow}
          t={t}
          setVisible={setTableRowEditVisible}
          useByChanges={useByChanges}
          copyRow={copyRow}
          onRowChange={onRowChange}
          onAddRow={onAddRow}
        />
      </Drawer>
    </>
  );
};

export default ITableForm;

const UPLOAD_STATUS = {
  INIT: 0,
  UPLOADING: 1,
  DONE: 2,
  ERROR: 3,
};

const ImportForm = forwardRef(
  ({ onSubmit, isType, headers, ...props }, ref) => {
    const { fieldCode, fieldName, value, t, useByChanges } = props;
    const { orderInfo = {} } = t || {};
    const {
      nodeId,
      processDefId,
      mdlDefCode,
      workOrderId,
      formId,
      formModelId,
    } = orderInfo || {};

    const [visible, setVisible] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [status, setStatus] = useState(UPLOAD_STATUS.INIT); // 上传状态
    const [errorInfo, setErrorFileInfo] = useState({}); //异常文件
    const [percent, setPercent] = useState(0);
    const [file, setFile] = useState(null);
    const [dataList, setDataList] = useState([]); // 导入成功之后返回一个数据集

    // 当前展示的headers
    const showFieldItems = (headers || []).filter(
      (column) =>
        !column?.hide?.length ||
        column?.hide?.indexOf(-1) < 0 ||
        column?.show?.indexOf(-1) > -1 ||
        column?.show?.length > 0 ||
        useByChanges
    );
    // 当前隐藏的headers
    const hiddenFieldItems = (headers || []).filter(
      (column) => !showFieldItems.find((e) => e.id === column.id)
    );
    // 当前只读的headers
    const onlyReadFieldItems = (headers || []).filter(
      (column) =>
        column?.disabled?.indexOf(-1) > -1 || column?.disabled?.length > 0
    );

    useImperativeHandle(
      ref,
      () => ({
        show: () => setVisible(true),
        hide: () => setVisible(false),
        export: (e, cb) => downloadTemplate(e, cb, true),
      }),
      [value, showFieldItems]
    );

    const submit = () => {
      setConfirmLoading(true);
      onSubmit(dataList)
        .then(() => {
          setVisible(false);
          reset();
        })
        .catch((err) => {
          console.error(err);
          setConfirmLoading(false);
        });
    };

    // flag=true 导出数据
    // 因为后端把下载模版和导出数据用了同一个接口，所以这么写
    const downloadTemplate = (e, cb, flag = false) => {
      e.preventDefault();
      e.stopPropagation();
      const importFieldCode = showFieldItems.map((e) => e.id);
      const params = {
        workOrderId,
        mdlFormId: formId,
        nodeId,
        isImport: flag,
        hasData: flag,
        tableCode: fieldCode,
        processDefId: processDefId || mdlDefCode,
        currentData: value || [],
        enableType: isType ? isType : 'other',
        importFieldCode:
          importFieldCode.length > 0 ? importFieldCode : undefined,
      };
      downLoadTableTemplate(params)
        .then((res) => {
          if (res.type === 'application/json') {
            const reader = new FileReader();
            reader.readAsText(res, 'utf-8');
            reader.onload = () => {
              res = JSON.parse(reader.result);
              message.error(
                res.msg ||
                langUtil.t(
                  intl
                    .get('8b214c62-817f-433e-84cd-2636e2fe5633')
                    .d('请求出错了~')
                )
              );
            };
            return;
          }
          downloadFile(
            res,
            flag
              ? `${fieldName ||
              intl.get('0af5ba0e-f890-4479-8125-904f29c3fa36').d('表格')
              }-${moment().format('YYYY-MM-DD')}.xlsx`
              : intl
                .get('30f76319-df6e-4b03-8a64-e8e67446dd3e')
                .d('{slot0}导入模版.xlsx')
                .split('{slot0}')
                .join(
                  intl.get('0af5ba0e-f890-4479-8125-904f29c3fa36').d('表格')
                )
          );
        })
        .catch((err) => {
          message.error(
            (err && err.msg) ||
            langUtil.t(
              intl
                .get('8b214c62-817f-433e-84cd-2636e2fe5633')
                .d('请求出错了~')
            )
          );
        })
        .finally((_) => {
          cb && cb();
        });
    };

    const beforeUpload = (file) => {
      const isExcel = ['xls', 'xlsx']?.includes(
        file.name
          .substring(file.name.lastIndexOf('.') + 1, file.name?.length)
          .toLowerCase()
      );
      if (!isExcel) {
        message.warning(
          intl.get('cdbf9696-bc83-4f48-8353-f0ec1bca3cbf').d('仅支持excel文件')
        );
      }
      const isLt100M = file.size / 1024 / 1024 < 100;
      if (!isLt100M) {
        message.warning(
          intl
            .get('efa1be9f-0f2d-496e-98ba-4625ba7c67bf')
            .d('上传文件内存上限为100MB')
        );
        return;
      }
      setFile(file);
      return isExcel && isLt100M;
    };

    const customRequest = ({ file }) => {
      setStatus(UPLOAD_STATUS.UPLOADING);
      setDataList([]);
      let autoNumberList = [];
      let autoNumberLastRowValue = {};
      let len = value?.length || 0;
      let lastRowValue = value?.[len - 1]?.rowData || {};
      headers?.forEach((c) => {
        if (c?.['x-component'] === EnumType.autoNumber) {
          autoNumberList.push({
            code: c?.key,
            autoNumberInfo: { ...c?.['x-props']?.autoNumberRule },
            renumbering: c?.['x-props']?.renumbering,
          });
        }
      });

      autoNumberList.forEach((item) => {
        autoNumberLastRowValue[item?.code] = lastRowValue[item?.code];
      });
      const importFieldCode = (headers || [])
        .filter(
          (column) =>
            !column?.hide?.length ||
            column?.hide?.indexOf(-1) < 0 ||
            column?.show?.indexOf(-1) > -1 ||
            column?.show?.length > 0 ||
            useByChanges
        )
        .map((e) => e.id);
      const params = {
        file,
        importTableInfoVo: new Blob(
          [
            JSON.stringify({
              workOrderId,
              tableCode: fieldCode,
              nodeId,
              mdlFormId: formId,
              processDefId: processDefId || mdlDefCode,
              isImport: true,
              currentData: value || [],
              enableType: isType ? isType : 'other',
              mdlFormTemplateId: formModelId,
              autoNumberList,
              autoNumberLastRowValue,
              importFieldCode:
                importFieldCode.length > 0 ? importFieldCode : undefined,

              // 隐藏的 code
              hiddenFieldCode: hiddenFieldItems.map((e) => e.id),
              // 只读的 code
              onlyReadFieldCode: onlyReadFieldItems.map((e) => e.id),
              // importFieldCode: importFieldCode.length > 0 ? importFieldCode : undefined,
            }),
          ],

          { type: 'application/json' }
        ),
      };

      importTableData(params, {
        onUploadProgress: (progressEvent) => {
          let percent =
            ((progressEvent.loaded / progressEvent.total) * 100) | 0;
          setPercent(percent);
        },
      })
        .then((res) => {
          if (!res || !res.data) {
            throw new Error('response data is empty');
          }
          setStatus(UPLOAD_STATUS.DONE);
          setVisible(true);
          if (res.data.errorExcelUrl) {
            setStatus(UPLOAD_STATUS.ERROR);
            setErrorFileInfo(res.data || {});
            if (res.data.importData && res.data.rightCount) {
              // 接口返回的数据有问题，rowNum是从1开始编号的
              (res.data.importData || [])?.forEach((row) => {
                row.rowNum = row.rowNum - 1;
              });
              setDataList(res.data.importData || []);
            }
          } else {
            setStatus(UPLOAD_STATUS.DONE);
            // 接口返回的数据有问题，rowNum是从1开始编号的
            (res.data.importData || [])?.forEach((row) => {
              row.rowNum = row.rowNum - 1;
            });
            setDataList(res.data.importData || []);
            message.success(
              langUtil.t(
                intl.get('b09d82e8-9e1c-4ac2-b8b8-efa1b69a8bde').d('导入成功')
              )
            );
          }
        })
        .catch((err) => {
          console.error(err);
          setStatus(UPLOAD_STATUS.INIT);
          message.error(
            (err && err.msg) ||
            intl.get('d50da4dd-90d0-4bd5-81c2-88584d0b6a55').d('上传出错了~')
          );
        })
        .finally((_) => {
          setPercent(0);
        });
    };

    const reset = () => {
      setStatus(UPLOAD_STATUS.INIT);
      setPercent(0);
      setConfirmLoading(false);
      setErrorFileInfo({});
      setFile(null);
      setDataList([]);
    };

    // 下载错误报告
    const downLoadErrorReport = (e) => {
      e.stopPropagation();
      const fileName = `${langUtil.t(
        intl.get('219951e8-1ff6-4ec6-850a-9910191beed5').d('异常报告')
      ) + moment().format('MMDDHHMMSS')
        }.xlsx`;
      downLoad({ id: errorInfo.errorExcelUrl }).then((url) => {
        downloadFileByUrl(url, fileName);
      });
    };

    const downLoadCurrFile = () => {
      downloadFile(file, file?.name);
    };

    const onCancel = () => {
      setVisible(false);
      reset();
    };

    const modalProps = {
      title: `${langUtil.t(
        intl.get('e7e28773-1133-41f7-9e97-01bed6dae4ae').d('导入')
      )}`,
      width: 620,
      onCancel: () => {
        setVisible(false);
      },
      footer: [
        <Button key='back' onClick={onCancel}>
          {intl.get('19d6c313-9540-4042-b642-ebc6396ca0c7').d('取消')}
        </Button>,
        <Button
          key='submit'
          disabled={dataList?.length === 0}
          type='primary'
          loading={confirmLoading}
          onClick={submit}
        >
          {intl.get('4253417c-d699-4eed-8c75-34d2a8b18a68').d('确定')}
        </Button>,
      ],

      visible,
    };

    const uploadProps = {
      showUploadList: false,
      accept: '.xls,.xlsx',
      beforeUpload,
      customRequest,
      style: { display: status === UPLOAD_STATUS.INIT ? 'block' : 'none' },
    };

    return (
      <Modal {...modalProps}>
        <div className='upload-form-container'>
          {
            <Dragger {...uploadProps}>
              <p className='ant-upload-drag-icon'>
                <Icon type='cloud-upload' />
              </p>
              <p className='ant-upload-text'>
                {langUtil.t(
                  intl
                    .get('794bd935-550f-468e-ae33-f739580d4bec')
                    .d(
                      '将文件拖到此处/点击导入，仅支持Excel文件，大小不超过100M'
                    )
                )}
                ，
                <a onClick={downloadTemplate}>
                  {langUtil.t(
                    intl
                      .get('32d6e9b2-3364-4933-9d6b-156c163b4753')
                      .d('下载模版')
                  )}
                </a>
              </p>
            </Dragger>
          }

          {status === UPLOAD_STATUS.UPLOADING && (
            <div className='upload-result-wrapper'>
              <p>
                <Icon
                  type='link'
                  style={{ marginRight: '4px', verticalAlign: 'middle' }}
                />

                {file?.name}
              </p>
              <Progress percent={percent} status='active' />
            </div>
          )}

          {status === UPLOAD_STATUS.DONE && (
            <div className='upload-result-wrapper center'>
              <p>
                <Icon
                  type='link'
                  style={{ marginRight: '4px', verticalAlign: 'middle' }}
                />

                {file?.name}
              </p>
              <div>
                <Upload {...uploadProps}>
                  <Button type='link' className='dark'>
                    {langUtil.t(
                      intl
                        .get('24225a2b-d836-4d2b-b6b4-aa70d8bfd2d8')
                        .d('重新导入')
                    )}
                  </Button>
                </Upload>
                <Button type='link' className='dark' onClick={reset}>
                  {intl.get('55aff22d-5b53-4b3f-87ec-76ab3c4654ce').d('删除')}
                </Button>
              </div>
            </div>
          )}

          {status === UPLOAD_STATUS.ERROR && (
            <div className='upload-result-wrapper center'>
              <p
                onClick={downLoadCurrFile}
                style={{ color: theme.color_red, cursor: 'pointer' }}
              >
                <Icon
                  type='link'
                  style={{ marginRight: '4px', verticalAlign: 'middle' }}
                />

                {file && file.name}
              </p>
              <p>
                {errorInfo.rightCount}
                {langUtil.t(
                  intl.get('b09d82e8-9e1c-4ac2-b8b8-efa1b69a8bde').d('导入成功')
                )}
                ，<font color={theme.color_red}>{errorInfo.errorCount}</font>
                {intl
                  .get('07d1ee40-8304-4c68-b7dd-f3c83843d85f')
                  .d('条失败，可下载错误报告或重新导入')}
              </p>
              <div>
                <Upload {...uploadProps}>
                  <Button type='link' className='dark'>
                    {langUtil.t(
                      intl
                        .get('24225a2b-d836-4d2b-b6b4-aa70d8bfd2d8')
                        .d('重新导入')
                    )}
                  </Button>
                </Upload>
                <Button type='link' className='dark' onClick={reset}>
                  {intl.get('55aff22d-5b53-4b3f-87ec-76ab3c4654ce').d('删除')}
                </Button>
                <Button type='link' onClick={downLoadErrorReport}>
                  {langUtil.t(
                    intl
                      .get('9b5e17b3-821e-45c5-9886-ed9d0f782960')
                      .d('下载错误报告')
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        <style jsx>{`
          .upload-form-container {
            font-size: 16px;
            height: 156px;
            :global(.ant-upload.ant-upload-drag) {
              background: ${theme.background_color_33};
              font-size: 16px;
            }
            :global(.ant-upload.ant-upload-drag p.ant-upload-text) {
              font-size: 16px;
              color: ${theme.color_238};
              margin: 0;
            }
            .upload-result-wrapper {
              height: 100%;
              display: flex;
              justify-content: center;
              flex-direction: column;
              border: 1px dashed ${theme.border_107};
              border-radius: 4px;
              padding: 0 24px;
              &.center {
                align-items: center;
              }
              :global(.ant-btn-link) {
                margin-right: 8px;
              }
              :global(.ant-btn-link.dark) {
                color: ${theme.color_239};
              }
            }
          }
        `}</style>
      </Modal>
    );
  }
);



// 拖拽手柄
const DragHandler = SortableHandle(({ disabled }) => (
  <div className={cls(styles['dynamic-table-col'], { [styles['drag-handler']]: disabled != true, [styles['drag-handler-disabled']]: disabled == true })}>
    <DragIcon />
  </div>
));

const SortableItem = SortableElement(({ children }) => children);

const SortableList = SortableContainer(({ children, ...props }) => {
  return (
    <div
      {...props}
      className={styles['dynamic-table-tbody']}
    >
      {children}
    </div>
  );
});

