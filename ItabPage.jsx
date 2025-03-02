import { intl } from '@chaoswise/intl';
import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, Badge, Button, message } from '@chaoswise/ui';
import DndGenerator from '../../DndGenerator';
import { eventManager, downloadFile } from '@/utils/T/core/helper';
import { isEmpty } from 'lodash-es';
import { useLatest, useSessionStorageState, useUpdate } from 'ahooks';
import { batchExportFormTable } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/api';
import moment from 'moment';
const { DnDDropBox } = DndGenerator;

const { TabPane } = Tabs;

// 很奇怪，不知道为什么tab的activeKey都带个.$?
const getActiveKey = (activeKey) => {
  if (!activeKey) return activeKey;
  return `.$${activeKey}`;
};

const getFieldKey = (activeKey) => {
  return activeKey?.replace(/\.\$/, '');
};

export default function ITabPage({
  children,
  schema,
  t,
  isBusinessPanel = true,
  orderContainerID,
  ...props
}) {
  const { actions: formActions, orderInfo } = t || {};
  const { workOrderId, nodeId, formId, processDefId, mdlDefCode, isType } =
    orderInfo || {};

  // TODO: 标签页下包含配置项模型字段
  // 工单详情页配置项模型字段的onChange会改变schema,导致组件重新渲染，我们在组件
  // 内部维护的状态就会丢失，暂时先存在sessionStorage里面
  const [activeKey, setActiveKey] = useSessionStorageState(
    'use-local-storage-state-tab-active',
    {
      defaultValue: '',
      serializer: (v) => {
        const _v = JSON.parse(
          sessionStorage.getItem('use-local-storage-state-tab-active') || '{}'
        );
        _v[schema.key] = v;
        return JSON.stringify(_v);
      },
      deserializer: (v) => {
        return JSON.parse(v)?.[schema.key];
      },
    }
  );
  const [visible, setVisible] = useSessionStorageState(
    'use-local-storage-state-tab-visible',
    {
      defaultValue: {},
      serializer: (v) => {
        const _v = JSON.parse(
          sessionStorage.getItem('use-local-storage-state-tab-visible') || '{}'
        );
        _v[schema.key] = v;
        return JSON.stringify(_v);
      },
      deserializer: (v) => {
        return JSON.parse(v)?.[schema.key] || {};
      },
    }
  );
  const [exportBtnLoading, setExportBtnLoading] = useState(false);
  const [childState, setChildState] = useState({});
  const [errors, setErrors] = useState({});

  const latestActiveRef = useLatest(getFieldKey(activeKey));
  const latestVisibleRef = useLatest(visible);

  const sortedChildren = useMemo(() => {
    return Object.values(schema.properties || {}).sort(
      (a, b) => a['x-index'] - b['x-index']
    );
  }, [schema]);

  useEffect(() => {
    if (sortedChildren?.length > 0) {
      if (isBusinessPanel) {
        setActiveKey(`.$${sortedChildren[0].dropId}`)
        return
      }
      const key = sortedChildren.find(item => item.hidden === true || item.display !== false)?.key
      if (key) {
        setActiveKey(`.$${key}`)
        const obj = {}
        sortedChildren.forEach(item => {
          obj[item.key] = !!item.display
        })
        setVisible(obj)
      }
    }
  }, [])

  const childrenTable = useMemo(() => {
    if (!children || !children.length || isBusinessPanel) return null;
    const array = [];
    for (let i = 0;i < children.length;i++) {
      const child = children[i];
      Object.values(child?.props?.schema?.properties || {}).forEach((prop) => {
        if (prop?.['x-component'] === 'table_form') {
          formActions &&
            formActions.getFieldState(prop.key, (state) => {
              if (
                state &&
                state.display !== false &&
                childState[prop.key] !== false
              ) {
                array.push(prop);
              }
            });
        }
      });
    }
    return array;
  }, [children, childState]);

  const ids = useMemo(() => {
    if (!schema || !activeKey) return [];
    const ret = Object.values(schema.properties || {})
      ?.filter((item) => item.key !== activeKey?.slice(2))
      ?.map((item) => `BASIC_${item.key}_${orderContainerID}`);
    ret.push(`BASIC_${activeKey?.slice(2) || ''}_${orderContainerID}`);
    return ret;
  }, [schema, activeKey, orderContainerID]);

  useEffect(() => {
    eventManager.on('on-field-state-changed', ({ key, display }) => {
      setChildState((state) => ({
        ...state,
        [key]: display,
      }));
    });
    return () => {
      eventManager.off('on-field-state-changed');
    };
  }, []);

  // 设置默认的activeKey
  useEffect(() => {
    if (isBusinessPanel) {
      if (
        !latestActiveRef.current ||
        !sortedChildren.find((item) => item.dropId === latestActiveRef.current)
      ) {
        setActiveKey(getActiveKey(sortedChildren[0]?.dropId));
      }
      return;
    }
    // 当前选中的标签页被隐藏起来了
    if (latestVisibleRef.current[latestActiveRef.current] === false) {
      setActiveKey(
        getActiveKey(
          sortedChildren.filter(
            (item) =>
              !isEmpty(item.properties) &&
              latestVisibleRef.current[item.key] !== false
          )[0]?.key
        )
      );
      return;
    }
    if (!latestActiveRef.current) {
      const data = getActiveKey(
        sortedChildren.filter(
          (item) =>
            !isEmpty(item.properties) &&
            latestVisibleRef.current[item.key] !== false
        )[0]?.key
      );
      if (data) {
        setActiveKey(data);
      }
    }
  }, [visible]);

  // 工单详情页校验提示
  useEffect(() => {
    const callback = (fieldState) => {
      if (fieldState.errors && fieldState.errors.length) {
        const _errors = {};
        fieldState.errors.forEach((err) => {
          const [tabKey, paneKey, fieldKey] = err.path.split('.');
          if (tabKey && paneKey && fieldKey && tabKey === schema.key) {
            if (!_errors[paneKey]) {
              _errors[paneKey] = 0;
            }
            _errors[paneKey] += 1;
          }
        });
        setErrors(_errors);
        return;
      }
      if (Object.keys(errors || {}).length != 0) {
        setErrors({});
      }
    };
    eventManager.on('on-form-validate-end', callback);
    return () => {
      eventManager.off('on-form-validate-end', callback);
    };
  }, [errors]);

  useEffect(() => {
    eventManager.on(
      `on-AnchorDirectory-click-tabPane-${schema.key}`,
      (state) => {
        setActiveKey(state?.activeKey);
      }
    );
    return () => {
      eventManager.off(`on-AnchorDirectory-click-tabPane-${schema.key}`);
    };
  }, []);

  // 表单设计页面校验提示
  useEffect(() => {
    const onFormErrorCallback = (data) => {
      if (data && data.length) {
        const allErrors = data
          .map((error) => JSON.parse(error.msg || '[]'))
          .flat(2);
        const errors = {};
        Object.values(schema.properties || {}).forEach((sc) => {
          // 当前选中的选项就不用展示错误数提示了
          if (activeKey === getActiveKey(sc.dropId)) return;
          const chidlsKeys = Object.values(sc.properties || {}).map(
            (item) => item.key
          );
          errors[sc.dropId] = allErrors.filter((item) =>
            chidlsKeys.includes(item.fieldCode)
          ).length;
        });
        setErrors(errors);
      }
    };
    eventManager.on('on-form-error', onFormErrorCallback);
    return () => {
      eventManager.off('on-form-error', onFormErrorCallback);
    };
  }, [schema, activeKey]);

  useEffect(() => {
    const callback = (field, display) => {
      if (field.parentId === schema.key) {
        setVisible({
          ...(latestVisibleRef.current || {}),
          [field.key]: display,
        });
      }
      eventManager.emit('on-group-state-changed', { key: field.key, display });
    };
    eventManager.on(`on-tab-visible-${schema.key}`, callback);
    return () => {
      eventManager.off(`on-tab-visible-${schema.key}`, callback);
    };
  }, [activeKey]);

  const handleChange = (activeKey) => {
    setActiveKey(activeKey);
    if (isBusinessPanel) {
      // 表单设置的错误信息除了我写的组件更新校验信息外，其它组件都不更新校验信息啊
      // 那就只能切换过来的时候就把提示数字去掉了
      errors[getFieldKey(activeKey)] = 0;
      setErrors({ ...errors });
    }
  };

  const tabDisplay = useMemo(() => {
    if (isBusinessPanel) return 'block';
    if (
      children?.length ===
      Object.values(visible || {}).filter((v) => v === false).length
    ) {
      return 'none';
    }
    return 'block';
  }, [visible, children?.length]);

  const onExport = async (e) => {
    e.stopPropagation();
    setExportBtnLoading(true);
    try {
      const { values: formValues } = await formActions.getFormState();
      const params = [];
      let currentTabChildrenTable = childrenTable.filter(item => {
        return activeKey.includes(item.parentId)
      })
      currentTabChildrenTable.forEach((child) => {
        params.push({
          workOrderId,
          mdlFormId: formId,
          nodeId,
          isImport: false,
          hasData: true,
          tableCode: child.key,
          tableName: child.title || child.key,
          processDefId: processDefId || mdlDefCode,
          currentData: formValues[child.key] || [],
          enableType: isType ? isType : 'other',
          importFieldCode: child['x-props']?.columns?.map((col) => col.key),
        });
      });
      let res = await batchExportFormTable(params);
      if (res.type === 'application/json') {
        const reader = new FileReader();
        reader.readAsText(res, 'utf-8');
        reader.onload = () => {
          res = JSON.parse(reader.result);
          message.error(
            res.msg ||
            intl.get('8b214c62-817f-433e-84cd-2636e2fe5633').d('请求出错了~')
          );
        };
        return;
      }

      // 导出文件名：implementation_plan_export_yyyymmddhhmm
      let fileName = `implementation_plan_export_${moment().format('YYYYMMDDHHmm')}`;
      downloadFile(res, fileName);
    } catch (e) {
      console.error(e);
    } finally {
      setExportBtnLoading(false);
    }
  };

  return (
    <>
      {/* tab下的tabpanel如果直接设置了id,初始化的时候没激活的tabpanel处于display=none的状态
        此时这个锚点链接就会自动停留在这个tabpanel上，因此我们不能直接给tabpanel设置id
        为了使得点击锚点链接能定位到具体位置，所以我们在这里渲染出所有id对应的元素 */}
      {tabDisplay === 'block' && <RenderTabIds list={ids} />}
      <Tabs
        activeKey={activeKey}
        style={{
          width: '100%',
          marginBottom: '16px',
          display: tabDisplay,
          background: '#fff',
          paddingLeft: 20,
        }}
        onChange={handleChange}
        // type="card"
        className={schema.key}
        id={`BASIC_${schema?.key}_${orderContainerID}`}
        tabBarExtraContent={
          childrenTable?.filter(item => activeKey.includes(item.parentId))?.length > 0 && (
            <Button
              size='small'
              style={{ marginRight: 12 }}
              loading={exportBtnLoading}
              onClick={onExport}
            >
              {intl.get('72d79e31-d6c8-4852-a43c-85a3ad2a45f0').d('导出')}
            </Button>
          )
        }
      >
        {React.Children.map(children, (child) =>
          (isEmpty(child.props.schema.properties) || visible[child.props.schema.key] === false) && !isBusinessPanel ?
            <div style={{ display: 'none' }}>{child}</div>
            : (
              <TabPane
                key={child.key}
                tab={
                  <div className={child.props.schema.path.replace(/\./g, '_')}>
                    {child.props.schema.title}
                    <Badge
                      count={
                        activeKey === getActiveKey(child.key)
                          ? 0
                          : errors[child.key]}
                      offset={[14, isBusinessPanel ? -4 : 0]}
                      overflowCount={9}
                    />
                  </div>
                }
                forceRender
              >
                {child}
              </TabPane>
            )
        )}
      </Tabs>
    </>
  );
}

const CustomTabPane = ({
  children,
  schema,
  isBusinessPanel = true,
  t,
  orderContainerID,
  ...props
}) => {
  const { formLayout } = t || {};

  return !isBusinessPanel ? (
    <div
      className='tab-content-wrapper'
      style={{
        display: 'flex',
        justifyContent:
          formLayout?.layout === 'table' ? 'start' : 'space-between',
        flexWrap: 'wrap',
        padding: '0 20px 20px 0',
      }}
    >
      {children}
    </div>
  ) : (
    <DnDDropBox parentId={schema?.dropId}>{children}</DnDDropBox>
  );
};

export { CustomTabPane as TabPane };

const RenderTabIds = ({ list, style }) => {
  return (
    <div className='custom-tab-top' style={style}>
      {list.map((item) => {
        return (
          <div
            key={item}
            style={{ width: '100%', height: '1px' }}
            id={item}
          ></div>
        );
      })}
      <style jxs>{`
            .custom-tab-top{
                width:100%;
                // margin-top:calc(16px - ${list?.length || 0}px);
            }
        `}</style>
    </div>
  );
};
