import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CWSelect, Spin, Empty, Tooltip, Tag, Button, message, Popconfirm } from '@chaoswise/ui'
import useSelectionsLoadV2 from '@/hooks/useSelectionsLoadV2'
import styles from './style/select.less';
import ISelect from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/FormEngine/FormRender/components/ISelect';
import { checkType } from '@/utils/T'
import cls from 'classnames'
import { getUserListByIdsForMember } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/api'
import DoTextOverflowAutoTooltip from '@/components/DoTextOverflowAutoTooltip'
import axios from 'axios';
import { permission } from '@/services/auth';
import { formily } from '@chaoswise/ui/formily';
const { FormPath, useFormEffects, LifeCycleTypes } = formily;


const currentUserInfo = permission.getUserInfo() || {};


const Option = CWSelect.Option


/**
 * 下拉框获得焦点的时候请求数据字典接口
 * 组件挂载之后通过选中的值精确查询数据用作回显
 * 滚动触底加载下一页数据，从返回的数据中过滤掉已选中的数据
 * @returns
 */
function ISelectV2({ ...props }) {
    const { enumList, loading, onFocus, onScroll, onSearch, keyWord, hasMore } = useSelectionsLoadV2(props)
    const { directoryValue, value, placeholder, onChange, onBlur, disabled, t, fieldCode, tableKey, rowNum, enumUseColor, contentExtension } = props || {};
    const { backend_api, btn_name, checked } = contentExtension || {}
    const { isBusinessPanel, getPopupContainer, formLayout, actions: formActions, defaultValue, baseActions } = t || {}; // 表单设计页面为true
    const { nodeItem, bizKey, currentNodeId, initialValues = {}, dataStatus, workOrderId, createdBy, firstNode, formData } = t?.orderInfo || {}
    const { setBaseValue } = baseActions || {};

    const crStatus = formData?.crStatus_value


    const selectRef = useRef(null);


    const [sending, setSending] = useState(false)
    const [showHint, setShowHint] = useState(false)
    const [sendable, setSendable] = useState(formData?.SNOCsignoff_sendable ?? true)

    useEffect(() => {
        if (setBaseValue) {
            setBaseValue('SNOCsignoff_sendable', sendable)
        }
    }, [sendable])

    useFormEffects(($, _) => {
        if (fieldCode === 'SNOCsignoff' && ['New', 'Reopen', 'Open'].includes(crStatus)) {
            $(LifeCycleTypes.ON_FIELD_INPUT_CHANGE, '*(TheProductionDashboardLinks, NewApplicationServices)').subscribe((formState) => {
                if (showHint === false) {
                    setShowHint(true)
                    setSendable(true)
                }
            });
            $(LifeCycleTypes.ON_FIELD_INPUT_CHANGE, 'TheProductionDashboardLinks').subscribe((fieldState) => {
                if (fieldState.value) {
                    formActions.clearErrors("*(TheProductionDashboardLinks)")
                }
            });
        }
    });


    useEffect(() => {
        if (fieldCode === 'SNOCsignoff' && ['New', 'Reopen', 'Open'].includes(crStatus)) {
            formActions.setFieldState('SNOCsignoff', (fieldState) => {
                const hintContent = showHint ? "Please click ‘Send Notification’ again" : ''
                FormPath.setIn(fieldState, 'props.x-props.changedFieldHint', { hintContent, hintType: 3 })
            })
        }
    }, [showHint, fieldCode, crStatus])



    const _value = useMemo(() => {
        if (typeof value === 'boolean') return String(value); // 表格配置项选配置项 布尔类型属性回显错误 因为配置项的值是boolean类型，enumLisr的值是字符串 所以需要转换成string类型 如果此处代码不合适，可以删除 并让后端返回正确的值类型
        if (value) {
            if (typeof value === 'string') return value;
            if (Array.isArray(value)) return value[0]?.id;
        } else return value;
    }, [value])
    // 表单设计页面还是用原来的组件吧
    if (isBusinessPanel) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ISelect {...props} />
                {
                    (checked && btn_name) && (
                        <Button type='primary'>
                            {btn_name}
                        </Button>
                    )
                }
            </div>
        )
    }
    const handleChange = (val) => {
        // defaultValue[field_Label] 用于我们的表单初始化的时候回显下拉选项
        // 当用户手动改变了value之后，我们不再依赖该值
        if (defaultValue) {
            defaultValue[fieldCode + '_value'] = undefined
        }
        onChange(val);
        onBlur && onBlur(val);
        setShowHint(!!val)
        setSendable(!!val)
    }


    const getDisplayLabelOfReadOnly = () => {
        if (dataStatus == 20) {
            // 结束节点只能用 initialValues[`${fieldCode}_value` 这个，
            // 我们要回显颜色，就看看enumList里有没有选项的颜色，有就加上，没就用回原来的
            if (tableKey) {
                const rowData = initialValues[tableKey]?.find(row => row.rowNum == rowNum)?.rowData || {}
                const selectedItem = enumList?.find(v => v.label === rowData[`${fieldCode}_value`])
                if (selectedItem) {
                    return renderLabel(selectedItem, false)
                }
                if (rowData[`${fieldCode}_value`]) return rowData[`${fieldCode}_value`]
            } else {
                const selectedItem = enumList?.find(v => v.label === initialValues[`${fieldCode}_value`])
                if (selectedItem) {
                    return renderLabel(selectedItem, false)
                }
                if (initialValues[`${fieldCode}_value`]) return initialValues[`${fieldCode}_value`]
            }
        }
        const _value = checkType.isBoolean(value) ? `${value}` : value;
        if (!_value) return '--'
        return renderLabel(enumList.find(item => item.value == _value || item.id == _value) || {}, false)
        // return enumList.find(item => item.value == _value || item.id == _value)?.label || value || '--'
    }
    const renderLabel = (item, showTooltip = true) => {
        const tagStyle = {
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            verticalAlign: 'middle'
        }


        if (showTooltip && !disabled) {
            return (
                <DoTextOverflowAutoTooltip title={item?.label}>
                    {
                        (enumUseColor && item?.color) ?
                            <Tag color={item?.color} className='custom-color-tag' style={tagStyle}>
                                {item?.label}
                            </Tag>
                            :
                            item?.label
                    }
                </DoTextOverflowAutoTooltip>


            )
        }
        return (
            (enumUseColor && item.color) ?
                <Tag color={item?.color} className='custom-color-tag'>
                    {item?.label}
                </Tag>
                :
                item?.label
        )
    }


    const dropdownRender = menu => {
        return (
            <div className={styles['select-dropdown-wrapper']}>
                {loading ? (
                    <div style={{ padding: '12px', textAlign: 'center' }}>
                        <Spin size="small" />
                    </div>
                ) : enumList?.length === 0 ? (
                    <Empty />
                ) : (
                    enumList.map(item => {
                        const itemStyle = {
                            padding: '8px 12px',
                            cursor: 'pointer',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            minHeight: '32px',
                            lineHeight: '1.5',
                            fontWeight: 400,


                        };


                        const handleClick = () => {
                            handleChange(item.value || item.id);
                            selectRef.current?.blur();
                        };


                        return (
                            <div
                                key={item.value || item.id}
                                style={itemStyle}
                                onClick={handleClick}
                                className={cls(
                                    styles['select-dropdown-item'],
                                    { [styles.selected]: _value === (item.value || item.id) }
                                )}
                            >
                                {(enumUseColor && item.color) ? (
                                    <Tag
                                        color={item.color}
                                        style={{
                                            width: '100%',
                                            margin: 0,
                                            whiteSpace: 'pre-wrap',
                                            height: 'auto',
                                            lineHeight: '1.5'
                                        }}
                                    >
                                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {item.label}
                                        </div>
                                    </Tag>
                                ) : (
                                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {item.label}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                {(directoryValue && hasMore) && (
                    <div style={{ padding: '8px 12px', textAlign: 'center', color: '#999' }}>
                        {loading ? 'loading...' : 'to load more...'}
                    </div>
                )}
            </div>
        );
    };


    const onExtentionBtnClick = async () => {
        if (!backend_api) return;
        if (sending) return;
        try {
            const dashboardUrl = await formActions.getFieldValue('TheProductionDashboardLinks')
            // Validate dashboard URL
            // Check if URL starts with http and contains required characters
            const urlRegex = /^http(s)?:\/\/[a-zA-Z0-9\-_,.\/]+$/;
            if (dashboardUrl) {
                if (!urlRegex.test(dashboardUrl)) {
                    formActions.setFieldState('TheProductionDashboardLinks', (fieldState) => {
                        fieldState.editable = true
                        fieldState.errors = ['Please input URL with http, alphanumeric with dash, underscore, comma and no space']
                    })
                }
            }


            setSending(true)
            const uRes = await getUserListByIdsForMember(createdBy)
            const user = uRes.data?.[0] || {};
            const { values: formValues } = await formActions.getFormState()
            const params = {
                "accountId": currentUserInfo?.accountId,
                "createdBy": createdBy,
                "topAccountId": currentUserInfo?.topAccountId,
                "workOrderId": workOrderId,
                "nodeId": currentNodeId,
                "userId": currentUserInfo?.userId,
                "formDataJson": formValues,
                "notify": {
                    "channelType": "EMAIL",
                    "notifyScene": "CR_NEW_PRJ_SERVICE_MONITORING_SNOC"
                },
                "publicFields": {
                    "createdBy": createdBy,
                    "createdByEmail": user.email,
                    "currentNode": nodeItem?.nodeName,
                    "bizKey": bizKey,
                    "workOrderId": workOrderId,
                    "createdByName": currentUserInfo.name,
                    "createdByAlias": currentUserInfo.userAlias,
                    "createdByFullName": `${currentUserInfo.name}(${currentUserInfo.userAlias})`
                }
            }
            const res = await axios.post(backend_api, params, {
                baseURL: ''
            })
            let info = {}
            if (res.status == 200) {
                info = res.data || {}
            }
            if (Object.keys(info)?.length) {
                if (info.data == true) {
                    message.success('Sent successfully')
                } else {
                    info.message && message.error(info.message)
                }
            }
            setShowHint(false)
            setSendable(false)
        } catch (err) {
            console.error(err)
        } finally {
            setSending(false)
        }
    }


    return (
        <div className={cls(styles['dynamic-select'], { [styles['has-extension']]: checked && btn_name })}>
            {
                disabled
                    ?
                    <div className={styles['readonly-select']}>
                        {getDisplayLabelOfReadOnly()}
                    </div>
                    :
                    <CWSelect
                        ref={selectRef}
                        placeholder={placeholder}
                        loading={loading}
                        onPopupScroll={onScroll}
                        onFocus={onFocus}
                        showSearch
                        value={_value || undefined}
                        style={{ width: (checked && btn_name && (!firstNode || isBusinessPanel)) ? 'calc(100% - 172px)' : '100%' }}
                        notFoundContent={loading ? <Spin size="small" /> : <Empty />}
                        onSearch={(directoryValue && hasMore) ? onSearch : null}
                        filterOption={(directoryValue && hasMore) ? false : undefined}
                        optionFilterProp='label'
                        onChange={val => handleChange(val === undefined ? null : val)}
                        onDropdownVisibleChange={open => {
                            if (!open) {
                                (directoryValue && keyWord) && onSearch()
                            } else {
                                // 🔥点箭头后，下拉框展开，但是不触发onFocus。 临时修复，组件库修复后删除
                                selectRef?.current?.focus();
                            }
                        }}
                        // dropdownRender={dropdownRender}
                        dropdownMatchSelectWidth={true}
                        dropdownClassName={`${styles['dynamic-select-dropdown']} fs-${formLayout?.fontSize}`}
                        allowClear
                        optionLabelProp='displayLabel'
                        getPopupContainer={getPopupContainer || (() => document.body)}
                        virtual={false}
                    >
                        {
                            enumList.map(item => (
                                <Option
                                    key={item.value || item.id}
                                    value={item.value || item.id}
                                    label={item.label}
                                    className={cls(styles['custom-select-option'], {
                                        'custom-select-color-tag-option': enumUseColor,
                                    })}
                                    displayLabel={renderLabel(item, true)}
                                >
                                    {renderLabel(item, false)}
                                </Option>
                            ))
                        }
                    </CWSelect>
            }
            {
                (checked && btn_name && (!firstNode || isBusinessPanel)) && (
                    <Button
                        loading={sending}
                        type='primary'
                        onClick={onExtentionBtnClick}
                        disabled={!['New', 'Reopen', 'Open'].includes(crStatus) || !_value || !sendable}
                    >
                        {btn_name}
                    </Button>
                )
            }
        </div>
    )
}


export default ISelectV2
