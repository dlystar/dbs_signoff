import { intl } from '@chaoswise/intl';
import { useEffect, useState, useRef, useContext } from 'react';
import { formily } from '@chaoswise/ui/formily';
import { EnumSatisfyTypeValue } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/AdvancedSetting/constants/dynamicForm';
import { EnumSelection } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/constants';
import { useDebounceFn, useLatest, useAsyncEffect } from 'ahooks';
import {
  getExternalData,
  getdictFormDouc,
} from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/api';
import {
  getDictPageList,
  getSelectApplicationDictValue,
  getDictListByIds,
} from '@/services/commonAPI/dataDictionary';
import { userInfoKind } from '@/constants/common/formType';
import { isNil, uniqBy } from 'lodash-es';
import Prompt from '@/utils/prompt';
import { StoreCtx } from '@/store';
import { formatOptions, getFinalOptions } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/FormEngine/FormRender/components/INewConfigTab/component/ModelContent/ValueComponent/hooks/useOptions'
import { eventManager } from '@/utils/T/core/helper';
import { useDebounceEffect } from 'ahooks'
import { formatCustomOptions } from '@/hooks/useSelectionsLoad'

export const EnumApplicationImpacted = [
  'applicationImpacte',
  'otherApplicationImpacted'
]
const EnumApplicationImpactedType = {
  'applicationImpacte': 'application',
  'otherApplicationImpacted': 'otherApplication'
}



const { FormPath } = formily;
const needFilterOptionType = [
  EnumSatisfyTypeValue.showOptions,
  EnumSatisfyTypeValue.hideOptions,
  'showPrePendOptions',
];

function useSelectionsLoadV2(props) {
  const {
    directoryValue,
    cmdbDirectoryValue,
    level,
    value,
    dataSource = [],
    apiStr,
    fieldCode: _fieldCode,
    filterObj,
    additionOptions,
    t,
    utils,
    isMultiple: _isMultiple,
    kind,
    changeOptions,
    tableKey,
    dataType,
    dpItem,
    rowNum,
    onChange,
    // 有些字段是属于某个字段的从属字段，通过扩展而来，比用成员/成员组信息展示等，我们以此加以区分
    // 1-成员 3-成员组 2-组织机构
    extendType,
  } = props;

  const { dataTableFieldInfo, sourceDataTableType, fieldCode: __fieldCode } = dpItem || {};
  const { setBaseValue, getBaseValue } = t?.baseActions || {};
  const { dicDetailValue } = t?.orderInfo || {};
  const { handleValueToLabel } = utils || {};
  const { actions, getDictPageListWithCache, getDictByIdWithCache, defaultValue } = t || {};
  const { setFieldState } = actions || {};
  const fieldCode = _fieldCode || __fieldCode;

  const [fetching, setFetching] = useState(false);
  const [enumList, setEnumList] = useState(
    !directoryValue ? EnumApplicationImpacted?.includes(fieldCode) ? [] : formatCustomOptions(dataSource || []) : []
  );
  const [pagination, setPagination] = useState({ current: 0, pageSize: 100 });
  const [keyWord, setKeyWord] = useState();
  const [hasMore, setHasMore] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState([]);

  const lastFetchIdRef = useRef(0);
  const latestEnumListRef = useLatest(enumList || []);
  const initedRef = useRef(false)



  const { run: onSearch } = useDebounceFn((k) => handleSearch(k), {
    wait: 500,
  });
  const dictDataKey = dataType === EnumSelection.custom ? 'value' : 'id';

  const fetchOptions = EnumApplicationImpacted?.includes(fieldCode) ? getSelectApplicationDictValue : getDictPageList;

  // 是否多选模式
  const isMultiple = _isMultiple || sourceDataTableType === 'multiple_choice';
  // 依赖字段
  const dependentField =
    dataTableFieldInfo?.dataTableChoice?.[0]?.dependentField;

  // 组件挂载完后处理值的回显
  // 字段联动-设置字段值
  useAsyncEffect(async () => {
    // 不是绑定的数据字典那对于回显自然就不用再做处理了
    if (directoryValue) {
      // 处理值的回显
      if (value) {
        const undefinedIds = [],
          _enumList = [];
        // 从当前的选项和缓存中去查找已经选中的选项
        // 如果当前选中的值存在于当前已有的选项中，那啥也不用做
        // 如果是从缓存中找到的，那我们就暂存起来，最终我们要把这些选项和已有的选项拼起来
        const handleSelectedOption = (value, index) => {
          // 当前的值如果在选项中存在那什么也不用做
          if (latestEnumListRef.current.some((item) => item.id == value)) {
            // 啥也不用干
          } else if (
            dicDetailValue &&
            dicDetailValue[value] &&
            dicDetailValue[value].status != 0
          ) {
            // dicDetailValue 这个是工单详情页，后端在工单详情接口返回来的，用于回显
            _enumList.push(dicDetailValue[value]);
          } else if (getDictByIdWithCache && getDictByIdWithCache(value)) {
            // getDictByIdWithCache 这个是分页加载的时候我们自己缓存起来的数据
            _enumList.push(getDictByIdWithCache(value));
          } else {
            if (!isNil(index)) {
              if (defaultValue?.[fieldCode]?.[index] == value && defaultValue[`${fieldCode}_value`]?.[index]) {
                _enumList.push({ id: value, label: value && defaultValue[`${fieldCode}_value`]?.[index] });
              } else {
                // 这都没找到？那就只能把这个id先存起来，之后我们调用接口去查询
                undefinedIds.push(value);
              }
            } else {
              if (defaultValue?.[fieldCode] == value && defaultValue[`${fieldCode}_value`]) {
                _enumList.push({ id: value, label: defaultValue[`${fieldCode}_value`]})
              } else {
                // 这都没找到？那就只能把这个id先存起来，之后我们调用接口去查询
                undefinedIds.push(value);
              }
            }
          }
        };
        if (Array.isArray(value)) {
          // 从已有的选项和初始化数据字典中去查找选中的值
          value.forEach((v, index) => {
            handleSelectedOption(v, index);
          });
        } else {
          handleSelectedOption(value);
        }
        // 选项都已经找到了，不用再调接口查询了
        if (!undefinedIds.length) {
          _enumList.length &&
            setEnumList(
              filterOptions(latestEnumListRef.current.concat(_enumList)).sort(
                (a, b) => a.priority - b.priority
              )
            );
        } else {
          // 最终都还没找到那就只能调用接口去查
          const res = await getDictListByIds(undefinedIds);
          // 最后再把我们从缓存中找的选项和接口里面返回的选项拼在一起
          setEnumList(
            filterOptions(
              uniqBy(
                latestEnumListRef.current
                  .concat(_enumList)
                  .concat((res.data || []).filter((item) => item.status != 0)),
                'id'
              )
            ).sort((a, b) => a.priority - b.priority)
          );
        }
      }
    } else {
      // 没有绑定数据字典的字段我们对回显也要作出处理，
      // 有_value则用，没有拉倒
      if (_isMultiple) {
        if (Array.isArray(value) && Array.isArray(defaultValue?.[`${fieldCode}_value`]) && defaultValue?.[`${fieldCode}_value`]?.length === value.length) {
          const array = []
          value.forEach((v, i) => {
            if (!latestEnumListRef.current.some((item) => item.id == v)) {
              array.push({ id: v, label: defaultValue[`${fieldCode}_value`][i]})
            }
          })
          setEnumList((preArray) => {
            return uniqBy((preArray || []).concat(array), 'id')
          })
        }
      } else {
        if (value && defaultValue?.[`${fieldCode}_value`]) {
          if (!latestEnumListRef.current.some((item) => item.id == value)) {
            setEnumList((preArray) => {
              return uniqBy((preArray || []).concat([{ id: value, label: defaultValue[`${fieldCode}_value`]}]), 'id')
            })
          }
        }
      }
    }
    // 当一切尘埃落定之后，我们要把所有选中的选项单独拿出来，后面会用到
    setTimeout(() => {
      const _selectedOptions = [];
      if (Array.isArray(value)) {
        value.forEach((v) => {
          const selectedOption = latestEnumListRef.current.find(
            (op) => op[dictDataKey] == v
          );
          selectedOption && _selectedOptions.push(selectedOption);
        });
      } else {
        const selectedOption = latestEnumListRef.current.find(
          (op) => op[dictDataKey] == value
        );
        selectedOption && _selectedOptions.push(selectedOption);
      }
      setSelectedOptions(_selectedOptions);
    }, 0);
  }, [value]);

  useEffect(() => {
    if (!tableKey) {
      fieldCode &&
        setBaseValue &&
        setBaseValue(fieldCode + '_value', handleValueToLabel(value, enumList));
    }
  }, [value, enumList]);
  const { globalStore } = useContext(StoreCtx);

  // 对接口类型的数据源做处理，只有数据源是来自我们自己的数据字典才需要做分页处理
  useEffect(() => {
    // 绑定了外部api作为数据源，那就直接请求绑定的数据源好了
    if (kind && directoryValue && ![userInfoKind.userOrigin, userInfoKind.vip].includes(kind)) {
      getdictFormDouc(kind, extendType)
        .then((res) => {
          const { data } = res;
          if (!data) return;
          const { enumList = [] } = data || {};
          const dictList = enumList.map((v) => {
            return {
              ...v,
              id: v.value,
            };
          });
          setEnumList(dictList);
        })
        .catch((err) => {
          Prompt.error(
            err.msg ||
              langUtil.t(
                intl
                  .get('89ebe240-bf6d-41f7-bfd8-9d90079561ff')
                  .d('表单数据异常，请检查用户中心数据或修改表单')
              )
          );
          console.log(err, 'douc错误');
        });
    } else if (apiStr) {
      const params = { body: { url: apiStr } };
      getExternalData &&
        getExternalData(params).then((res) => {
          setEnumList(res?.data || []);
        });
    } else if (
      cmdbDirectoryValue &&
      globalStore?.cmdbStore?.getCmdbDataSource
    ) {
      globalStore.cmdbStore.getCmdbDataSource(cmdbDirectoryValue, (data) => {
        setEnumList(data?.enumList || []);
      });
    }else if(props.dpItem){
      const _enumList = (props.enumList || []);
      setEnumList(_enumList);
    }
  }, []);

  // 选项改变了的时候要把选项存到localStorage里面，其他地方有用
  // 还要看当前选中的值是否在选项中
  useEffect(() => {
    const formLocalStorageMap =
      JSON.parse(localStorage.getItem('formLocalStorageMap')) || {};
    if (fieldCode !== 'urgentLevel') {
      if (!tableKey) {
        formLocalStorageMap[fieldCode] = [...enumList];
      } else {
        formLocalStorageMap[fieldCode] = uniqBy(
          enumList.concat(formLocalStorageMap[fieldCode] || []),
          dictDataKey
        );
      }
    }
    localStorage.setItem(
      'formLocalStorageMap',
      JSON.stringify(formLocalStorageMap)
    );
  }, [enumList]);

  // 字段联动-追加字段值
  useEffect(() => {
    if (
      !Array.isArray(additionOptions) ||
      additionOptions?.length === 0 ||
      !isMultiple
    )
      return;
    // 设置字段值
    const _value = Array.from(new Set([...(value || []), ...additionOptions])); // 合并去重
    setFieldState &&
      setFieldState(fieldCode, (state) => {
        state.value = _value;
      });
    // 这里再重置一下additionOptions这个属性
    // 不然下一次设置additionOptions属性的值和上一次值相同useEffect里面监听不到
    // 场景：追加一个值，然后把这个值删了，然后再次触发使追加这个值，不会生效
    setFieldState &&
      setFieldState(fieldCode, (state) => {
        FormPath.setIn(state, 'props.x-props.additionOptions', null);
      });
  }, [additionOptions]);

  // 字段联动-隐藏/显示选项
  useEffect(() => {
    setTimeout(async () => {
      let _enumList = latestEnumListRef.current || [];
      if (dataType === EnumSelection.custom) {
        _enumList = dataSource || []
      }
      if (filterObj) {
        if (
          !filterObj.type ||
          !needFilterOptionType?.includes(filterObj.type)
        ) {
          return;
        }
        // 展示所有的选项
        // 前置字段显示选项的结果返回了空的情况
        // 字段联动和前置字段均使用filterObj属性来设置需要展示的选项
        // 但是字段联动返回什么用什么，返回空的那就是没有选项
        // 而前置字段在某些情况下返回空却意味着要展示所有的选项
        if (filterObj.showAll) {
          setPagination({ current: 0, pageSize: pagination.pageSize });
          setHasMore(true);
          setFetching(false);
          return;
        }
        let filterList = [...(filterObj.values || [])];
        // 隐藏选项-从所有的选项中过滤掉需要隐藏的
        if (filterObj.type === EnumSatisfyTypeValue.hideOptions) {
          // 从已有的选项中过滤掉需要隐藏的选项
          filterList = _enumList.filter(
            (item) => !filterList.includes(item[dictDataKey])
          );
          setEnumList(filterList);
          resetValueByEnumList(filterList);
          return;
        }
        if (
          filterObj.type === EnumSatisfyTypeValue.showOptions ||
          filterObj.type == 'showPrePendOptions'
        ) {
          // 先从已有的选项中查找，已有的选项中没有的就调用接口查询
          let ids = [],
            options = [];
          filterList.forEach((v) => {
            // 不存在于当前选项中再去查找
            const op = _enumList.find((item) => item[dictDataKey] == v);
            if (!op) {
              if (getDictByIdWithCache && getDictByIdWithCache(v)) {
                options.push(getDictByIdWithCache(v));
              } else {
                ids.push(v);
              }
            } else {
              options.push(op);
            }
          });
          if (ids.length) {
            const res = await getDictListByIds(ids);
            options = options.concat(
              (res.data || []).filter((item) => item.status != 0)
            );
          }
          filterList = options;
        }
        setHasMore(false);
        setEnumList(filterOptions(filterList));
        resetValueByEnumList(filterList);
      }
    }, 0);
  }, [filterObj]);

  // 字段联动-改变下拉框选项
  useEffect(() => {
    if (!changeOptions) return;
    setEnumList(formatCustomOptions(changeOptions));
    resetValueByEnumList(formatCustomOptions(changeOptions));
    setHasMore(false);
  }, [changeOptions]);

  // 配置项模型表单中的选项联动由前端控制
  // ———————————————————— start ————————————————————
  useDebounceEffect(
    () => {
      setTimeout(() => {
        const choiceList = formatOptions(dataTableFieldInfo);
        const op = choiceList?.find((item) => item.value == value);
        eventManager.emit(`on-change-${tableKey}-${rowNum}-${fieldCode}`, {
          pValue: op?.choiceId,
        });
      }, 0);
    },
    [value],
    { wait: 200 }
  );
  useEffect(() => {
    const callback = ({ pValue }) => {
      const parentOptions = dataTableFieldInfo?.dataTableChoice?.find((item) => item.parentChoiceId === pValue) || {};
      const _options = getFinalOptions(parentOptions?.choiceList, dataTableFieldInfo, pValue);
      setEnumList(_options)
      if (!initedRef.current) {
        initedRef.current = true;
        return;
      }
      if (value) {
        if (Array.isArray(value)) {
          if (!value.every(v => _options.some(op => op.value === v))) {
            onChange && onChange(null)
          }
        } else {
          if (!_options.some(op => op.value === value)) {
            onChange && onChange(null)
          }
        }
      }
    };
    eventManager.on(`on-change-${tableKey}-${rowNum}-${tableKey}-${dependentField}`, callback);
    return () => {
      eventManager.off(`on-change-${tableKey}-${rowNum}-${tableKey}-${dependentField}`, callback);
    };
  }, [value, dependentField]);
  // 配置项模型表单中的选项联动由前端控制
  // ———————————————————— end ————————————————————

  // 字段联动-隐藏选项
  // 滚动加载/搜索等设置数据源的操作都要把隐藏的选项过滤掉
  const filterOptions = (enumList) => {
    if (
      !filterObj ||
      !filterObj.type ||
      filterObj.type != EnumSatisfyTypeValue.hideOptions
    )
      return enumList;
    if (!filterObj.values || !filterObj.values.length) return enumList;
    return (enumList || []).filter(
      (item) => !filterObj.values.includes(item[dictDataKey])
    );
  };

  // 根据当前的选项决定是不是要重新设置值
  const resetValueByEnumList = (enumList) => {
    if (Array.isArray(value)) {
      if (!value.length) return;
      let _value = value.slice();
      _value.forEach((v, index) => {
        if (!enumList.some((item) => item[dictDataKey] == v)) {
          _value[index] = null;
        }
      });
      _value = _value.filter(Boolean);
      if (_value.length !== value.length) {
        setFieldState &&
          setFieldState(fieldCode, (state) => {
            state.value = _value;
          });
      }
    } else {
      if (!value) return;
      // 值不在当前选项中存在，重置值
      if (!enumList.some((item) => item[dictDataKey] == value)) {
        setFieldState &&
          setFieldState(fieldCode, (state) => {
            state.value = undefined;
          });
      }
    }
  };

  const getPageList = async (params) => {
    const _params = {
      dictId: directoryValue,
      level,
      search: keyWord,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      withDisable: false,
      ...params,
    };
    if(EnumApplicationImpacted?.includes(fieldCode)){
      if(fieldCode === 'applicationImpacte'){
        const baseValues = getBaseValue()
        if(!baseValues) {
          return Promise.resolve({ data: {} });
        }
        let lob =  baseValues.lob_value;
        let countryOfOrigin = baseValues.countryOfOrigin_value;
        if(!lob || !countryOfOrigin){
          return Promise.resolve({ data: {} });
        }
        _params.lob = lob;
        _params.countryOfOrigin = countryOfOrigin;
      }
      _params.type = EnumApplicationImpactedType[fieldCode];
    }

    return new Promise((resolve, reject) => {
      let requestFunc = fetchOptions;
      if (getDictPageListWithCache && !EnumApplicationImpacted?.includes(fieldCode)) {
        requestFunc = getDictPageListWithCache;
      }
      requestFunc(_params)
        .then((res) => {
          if (res.data) {
            // 数据字典的总数还要减去字段联动隐藏的选项
            if (
              filterObj &&
              filterObj.type === EnumSatisfyTypeValue.hideOptions
            ) {
              res.data.total = res.data.total - (filterObj.values?.length || 0);
            }
            // 先过滤掉已经存在于当前选项中的选项
            res.data.records = res.data.records?.filter(
              (item) =>
                !latestEnumListRef.current.some((_item) => _item.id == item.id)
            );
            // 没有搜索关键字就要把选中的选项过滤掉
            // 因为选中的选项在值回显的时候已经拼在开头了
            if (!_params.search) {
              res.data.records = res.data.records?.filter(
                (item) => !selectedOptions.some((_item) => _item.id == item.id)
              );
            }
          }
          resolve(res);
        })
        .catch(reject);
    });
  };

  const getNextPage = (pageNum) => {
    // 不是绑定的数据字典那就用不着分页
    // impacted字段，不配置数据字典，但是要从远程获取数据
    if ((!directoryValue && !EnumApplicationImpacted?.includes(fieldCode)) || !hasMore) return;
    if (fetching) return;
    setFetching(true);
    getPageList({ pageNum })
      .then((res) => {
        // 滚动到底下，加载下一页数据，返回的结果均已存在则再去请求下一页
        if (
          pageNum > 1 &&
          (!res.data || !res.data.records || !res.data.records.length)
        ) {
          const hasMore = enumList.length >= res.data.total;
          setHasMore(!hasMore);
          hasMore && getNextPage(pageNum + 1);
        } else {
          const _enumList = enumList.concat(res.data?.records || []);
          setEnumList(
            filterOptions(_enumList).sort((a, b) => a.priority - b.priority)
          );
          if (_enumList.length >= res.data?.total) {
            setHasMore(false);
          }
        }
        setPagination({ ...pagination, current: pageNum });
      })
      .finally((_) => {
        setFetching(false);
      });
  };

  const onScroll = (e) => {
    if (fetching || !hasMore) return;
    if (
      e.target.scrollTop + e.target.offsetHeight >=
      e.target.scrollHeight - 5
    ) {
      getNextPage(pagination.current + 1);
    }
  };

  const onFocus = () => {
    if (fetching) return;
    if (pagination.current == 0) {
      getNextPage(1);
    }
  };

  const handleSearch = (keyWord) => {
    // 数据源是绑定了数据字典并且还有更多选项那我们再去调接口
    if (directoryValue || EnumApplicationImpacted?.includes(fieldCode)) {
      lastFetchIdRef.current += 1;
      const fetchId = lastFetchIdRef.current;
      setFetching(true);
      setHasMore(true);
      setEnumList([]);
      setPagination({ ...pagination, current: 1 });
      setKeyWord(keyWord);
      getPageList({ search: keyWord, pageNum: 1 })
        .then((res) => {
          if (fetchId !== lastFetchIdRef.current) return;
          if (keyWord) {
            // 有查询关键字，那搜索出来的选项自然就是全部
            setEnumList(filterOptions(res.data?.records || []));
            setHasMore(res.data?.total > res.data?.records?.length);
          } else {
            // 没有查询关键字，那就是查询所有选项，那就要把选中的选项拼上
            let options = selectedOptions.concat(res.data?.records || [])
            setEnumList(
              filterOptions(options).sort((a, b) => a.priority - b.priority)
            );
            setHasMore(res.data?.total > options?.length);
          }
        })
        .finally((_) => {
          setFetching(false);
        });
    }
  };

  return {
    enumList,
    loading: fetching,
    onFocus,
    onScroll,
    onSearch,
    keyWord,
    hasMore,
  };
}

export default useSelectionsLoadV2;
