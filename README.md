import React, { useEffect, useMemo, useState, useRef } from 'react';
import { convertToPrimaryArray } from '@/utils/T/core/helper';
import styles from './style/member.less';
import { formily } from '@chaoswise/ui/formily';
import { useAsyncEffect } from 'ahooks';
import { encryptByDES } from '@/utils/T/core/helper';
import { Select } from '@chaoswise/ui';
import { postJSON } from '@/utils/T/core/request';

const { FormPath } = formily;
const { Option } = Select;
const APP_CODE = {
    role: "App Owner",
    depField: "applicationImpacte",
    type: "APP_CODE",
}

// 模拟数据 - 第一页
const mockFullData = {
    "pageSize": 50,
    "currentPageNo": 1,
    "totalCount": 33,
    "totalPageCount": 2,
    "userList": [
        {
            "id": "192",
            "name": "Approver1",
            "userAlias": "Appr1",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/Approver1",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "250",
            "name": "Approver2",
            "userAlias": "Appr2",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/Approver2",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "244",
            "name": "Approver3",
            "userAlias": "Appr3",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/Approver3",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "178",
            "name": "Jon Lee",
            "userAlias": "jonl1",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/Jon Lee",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "177",
            "name": "ksana01",
            "userAlias": "ksana01",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/ksana01",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "176",
            "name": "dbsappuser01",
            "userAlias": "dbsappuser01",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/dbsappuser01",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "175",
            "name": "dbsappuser02",
            "userAlias": "dbsappuser02",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/dbsappuser02",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "174",
            "name": "dbsuser01",
            "userAlias": "dbsuser01",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/dbsuser01",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "173",
            "name": "dbsuser02",
            "userAlias": "dbsuser02",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/dbsuser02",
            "docpSubscribe": true,
            "roleName": "App Manager"
        },
        {
            "id": "172",
            "name": "User1",
            "userAlias": "user1",
            "departmentId": 1,
            "status": 1,
            "department": "DBS",
            "departmentDetail": "DBS/User1",
            "docpSubscribe": true,
            "roleName": "App Manager"
        }
    ]
};

// 模拟数据 - 第二页
const mockPage2Data = [
    {
        "id": "171",
        "name": "User2",
        "userAlias": "user2",
        "departmentId": 1,
        "status": 1,
        "department": "DBS",
        "departmentDetail": "DBS/User2",
        "docpSubscribe": true,
        "roleName": "App Manager"
    },
    {
        "id": "170",
        "name": "User3",
        "userAlias": "user3",
        "departmentId": 1,
        "status": 1,
        "department": "DBS",
        "departmentDetail": "DBS/User3",
        "docpSubscribe": true,
        "roleName": "App Manager"
    },
    {
        "id": "169",
        "name": "User4",
        "userAlias": "user4",
        "departmentId": 1,
        "status": 1,
        "department": "DBS",
        "departmentDetail": "DBS/User4",
        "docpSubscribe": true,
        "roleName": "App Manager"
    },
    {
        "id": "168",
        "name": "User5",
        "userAlias": "user5",
        "departmentId": 1,
        "status": 1,
        "department": "DBS",
        "departmentDetail": "DBS/User5",
        "docpSubscribe": true,
        "roleName": "App Manager"
    },
    {
        "id": "167",
        "name": "User6",
        "userAlias": "user6",
        "departmentId": 1,
        "status": 1,
        "department": "DBS",
        "departmentDetail": "DBS/User6",
        "docpSubscribe": true,
        "roleName": "App Manager"
    }
];

// 模拟接口响应数据
const mockUserResponse = (params) => {
    // 根据请求的页码返回不同的数据
    let responseData = { ...mockFullData };
    if (params.currentPageNo > 1) {
        responseData.userList = mockPage2Data;
        responseData.currentPageNo = params.currentPageNo;
    }

    // 根据不同类型的查询条件进行过滤
    if (params.type === 'USER_ID' && params.userIds && params.userIds.length > 0) {
        // 按用户ID过滤
        const userIdList = params.userIds.map(id => String(id));
        responseData.userList = responseData.userList.filter(user =>
            userIdList.includes(String(user.id))
        );
        responseData.totalPageCount = 1;
    } else if (params.req && params.req.userName) {
        // 按用户名称搜索过滤
        const searchValue = params.req.userName ? decodeURIComponent(params.req.userName) : '';
        responseData.userList = responseData.userList.filter(user =>
            user.name.toLowerCase().includes(searchValue.toLowerCase()) ||
            user.userAlias.toLowerCase().includes(searchValue.toLowerCase())
        );
        // 搜索结果只有一页
        responseData.totalPageCount = 1;
    }

    // 返回Promise以模拟异步调用
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ data: responseData });
        }, 300);
    });
};

// 是否使用模拟数据（开发环境下设置为true）
const USE_MOCK_DATA = false;

const CustomScheduledApproverMember = ({
    isMultiple,
    onChange = () => { },
    onBlur,
    value,
    additionOptions,
    placeholder,
    t,
    fieldCode = '',
    disabled,
    tableKey,
    isShowWorkOrderCount,
    changeOptions,
}) => {
    const { isBusinessPanel, baseActions, actions, getPopupContainer } = t || {};
   
    const { setFieldState } = actions || {};
    const { setBaseValue, getBaseValue } = baseActions || {};
    const [searchOptions, setSearchOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ currentPageNo: 1, totalPageCount: 0 });
    const [hasMore, setHasMore] = useState(true);
    const [searchText, setSearchText] = useState('');
    const searchRequestRef = useRef(0);
    const dropdownRef = useRef(null);
    const appCodeSearchedRef = useRef(false);
    const currentSearchTypeRef = useRef('APP_CODE');
    const firstLoadRef = useRef(true);
    const focusTimeRef = useRef(null);  // 用于记录最后一次聚焦时间
    const debounceTimerRef = useRef(null); // 用于存储防抖定时器
    const formatUserName = (userName) => {
        return userName ? userName.replace(/\(/g, ' (') : '';
    }
   
    // 在此处理值转换，确保value是正确格式
    const normalizedValue = useMemo(() => {
        if (!value) return undefined;
        if (Array.isArray(value)) {
            // 处理为单选择的值，并确保安全获取
            return value.length > 0 ? value[0] : undefined;
        }
        return value;
    }, [value]);

    const handleChange = (val) => {
        // Select组件的值处理逻辑
        let newValue;
        if (!val) {
            newValue = [];
        } else {
            // 查找选中的完整对象
            const selectedOption = searchOptions.find(option => option?.userId === val);
            if (selectedOption) {
                // 格式化userName为"name(alias)"格式
                const formattedUserName = selectedOption.userAlias
                    ? `${selectedOption.userName || ''}(${selectedOption.userAlias})`
                    : (selectedOption.userName || val);
               
                newValue = [{
                    groupId: null,
                    groupName: null,
                    userId: selectedOption.userId || val,
                    userName: formattedUserName
                }];
            } else {
                newValue = [{
                    groupId: null,
                    groupName: null,
                    userId: val,
                    userName: val // 简单显示
                }];
            }
        }

        if (!tableKey) {
            setBaseValue && setBaseValue(fieldCode + '_search', handleSearch(newValue));
        }
       
        onChange(newValue);
        onBlur && onBlur(newValue);
       
        // 选择完数据后，重置为APP Code搜索结果
        // 使用setTimeout确保数据更新后再触发搜索，避免选择值被覆盖
        setTimeout(() => {
            if (!disabled && !isBusinessPanel && !loading) {
                handleSelectSearchWithDebounce('');
            }
        }, 0);
    }

    const handleSearch = (val) => {
        if (Array.isArray(val)) {
            return (val || [])?.map((item) => {
                return item?.userId || '';
            }).filter(Boolean);
        }
        return [];
    }

    // 获取applicationImpacte字段的值及其相关依赖
    const getApplicationImpacte = () => {
        if (!getBaseValue) return [];
       
        try {
            // 获取整个表单的数据
            const baseValues = getBaseValue();
            if (!baseValues) return [];

            // 获取applicationImpacte的值（这是个数组）
            // use MultiSelect to mock the applicationImpacte
            const applicationImpacte = baseValues[`${APP_CODE.depField}_value`] || baseValues.MultiSelect_value || [];
           
            // 返回applicationImpacte作为appCodeList，确保是数组
            return Array.isArray(applicationImpacte) ? applicationImpacte : [];
        } catch (error) {
            console.error('Error getting applicationImpacte:', error);
            return [];
        }
    };

    // 创建请求参数
    const createRequestParams = (pageNo = 1, searchValue = '') => {
        return {
            currentPageNo: pageNo,
            pageSize: 50,
            req: {
                userName: searchValue ? encryptByDES(searchValue == '' ? 'MygBgOKdEOsgzJa' : searchValue) : '',
                status: null,
                securityFlag: false,
                isShowWorkOrderCount: isShowWorkOrderCount || false
            },
            type: !searchValue ? 'APP_CODE' : '',
            appCodeList: !searchValue ? getApplicationImpacte() : []
        };
    };

    // API 请求包装函数，添加错误处理
    const safeApiRequest = (apiPromise) => {
        return apiPromise
            .then(response => response)
            .catch(error => {
                console.error('API request error:', error);
                return { data: null };
            });
    };

    // 处理Select搜索 - 使用防抖包装函数
    const handleSelectSearchWithDebounce = (value) => {
        // 如果是空字符串（APP_CODE搜索），不需要防抖
        if (!value) {
            handleSelectSearch(value);
            return;
        }
       
        // 清除之前的定时器
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
       
        // 先更新搜索文本，让用户看到输入内容反馈
        setSearchText(value);
       
        // 设置loading状态，提供用户反馈
        if (value) {
            setLoading(true);
        }
       
        // 设置300ms的防抖
        debounceTimerRef.current = setTimeout(() => {
            handleSelectSearch(value);
        }, 300);
    };

    // 原始搜索处理函数
    const handleSelectSearch = (value) => {
        if (disabled || isBusinessPanel) return; // 禁用状态不进行搜索
       
        // 确保value是字符串
        const searchValue = value || '';
        setSearchText(searchValue);
       
        // 增加搜索请求的标识，防止旧的请求覆盖新的结果
        searchRequestRef.current += 1;
        const currentRequest = searchRequestRef.current;
       
        // 判断是否需要进行搜索
        const searchType = !searchValue ? APP_CODE.type : 'USER_SEARCH';
       
        // 在onFocus触发的搜索中，已经重置了appCodeSearchedRef.current为false
        // 这里不需要再做额外判断，让每次onFocus都能正确触发APP_CODE搜索
       
        // 如果是用户输入搜索，更新搜索类型
        if (searchType !== APP_CODE.type) {
            // 如果是用户输入的搜索，重置APP_CODE搜索状态，并设置当前搜索类型
            appCodeSearchedRef.current = false;
            currentSearchTypeRef.current = searchType;
        } else {
            // 更新当前搜索类型为APP_CODE
            currentSearchTypeRef.current = searchType;
        }
       
        // 每次搜索前先清空选项，避免出现重复数据
        setSearchOptions([]);
       
        // 创建请求参数以便检查
        const requestParams = createRequestParams(1, searchValue);
       
        // 如果是APP_CODE类型且appCodeList为空，不请求后端接口
        if (!searchValue && requestParams.type === APP_CODE.type && (!requestParams.appCodeList || requestParams.appCodeList.length === 0)) {
            return;
        }
       
        // 重置分页状态
        setPagination({ currentPageNo: 1, totalPageCount: 0 });
        setHasMore(true);
        setLoading(true);
       
        // 在发起请求时缓存当前的搜索类型，用于后续处理返回结果
        const requestSearchType = searchType;
       
        // 根据USE_MOCK_DATA决定使用模拟数据还是真实API
        const apiRequest = USE_MOCK_DATA
            ? mockUserResponse(requestParams)
            : safeApiRequest(postJSON('/api/v2/user/getUserInfoByDbsCondition', requestParams));
       
        // 调用API
        apiRequest
            .then(response => {
                // 如果已经有更新的请求，则忽略当前结果
                if (currentRequest !== searchRequestRef.current) return;
               
                // 检查当前搜索类型是否已经改变，如果改变了，且返回的是APP_CODE结果，则忽略
                // 这是为了防止用户输入搜索后，APP_CODE结果覆盖用户搜索结果
                if (requestSearchType === APP_CODE.type && currentSearchTypeRef.current !== APP_CODE.type) {
                    return;
                }
               
                const { data } = response || {};
                if (data && Array.isArray(data.userList)) {
                    // 转换返回数据格式
                    const options = data.userList.map(user => {
                        if (!user) return null;
                       
                        // 基础用户对象
                        const userObj = {
                            groupId: null,
                            groupName: null,
                            userId: String(user.id || ''),
                            userName: user.name || '',
                            userAlias: user.userAlias || '',
                            departmentId: String(user.departmentId || ''),
                            department: user.department || '',
                            departmentDetail: user.departmentDetail || '',
                            status: user.status || 0,
                            docpSubscribe: user.docpSubscribe || false
                        };
                       
                        // 仅在type为APP_CODE且appCodeList有值时添加role字段
                        if (requestParams.type === APP_CODE.type && requestParams.appCodeList && requestParams.appCodeList.length > 0) {
                            userObj.role = user.roleName || APP_CODE.role;
                        }
                       
                        return userObj;
                    }).filter(Boolean);
                   
                    // 添加去重逻辑，确保没有重复的userId
                    const uniqueOptions = [];
                    const userIdSet = new Set();
                   
                    options.forEach(option => {
                        if (!userIdSet.has(option.userId)) {
                            userIdSet.add(option.userId);
                            uniqueOptions.push(option);
                        }
                    });
                   
                    setSearchOptions(uniqueOptions);
                    setPagination({
                        currentPageNo: data.currentPageNo || 1,
                        totalPageCount: data.totalPageCount || 0
                    });
                    setHasMore((data.currentPageNo || 0) < (data.totalPageCount || 0));
                   
                    // 如果是APP_CODE搜索，标记为已搜索过
                    if (requestSearchType === APP_CODE.type) {
                        appCodeSearchedRef.current = true;
                    }
                } else {
                    setSearchOptions([]);
                    setHasMore(false);
                }
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                setSearchOptions([]);
                setHasMore(false);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // 加载更多数据
    const loadMoreData = () => {
        if (!hasMore || loading || disabled || isBusinessPanel) return;
       
        const nextPage = pagination.currentPageNo + 1;
        if (nextPage > pagination.totalPageCount) {
            setHasMore(false);
            return;
        }
       
        setLoading(true);
       
        const requestParams = createRequestParams(nextPage, searchText || '');
       
        // 根据USE_MOCK_DATA决定使用模拟数据还是真实API
        const apiRequest = USE_MOCK_DATA
            ? mockUserResponse(requestParams)
            : safeApiRequest(postJSON('/api/v2/user/getUserInfoByDbsCondition', requestParams));
       
        apiRequest
            .then(response => {
                const { data } = response || {};
                if (data && Array.isArray(data.userList) && data.userList.length > 0) {
                    // 转换返回数据格式
                    const newOptions = data.userList.map(user => {
                        if (!user) return null;
                       
                        // 基础用户对象
                        const userObj = {
                            groupId: null,
                            groupName: null,
                            userId: String(user.id || ''),
                            userName: user.name || '',
                            userAlias: user.userAlias || '',
                            departmentId: String(user.departmentId || ''),
                            department: user.department || '',
                            departmentDetail: user.departmentDetail || '',
                            status: user.status || 0,
                            docpSubscribe: user.docpSubscribe || false
                        };
                       
                        // 仅在type为APP_CODE且appCodeList有值时添加role字段
                        if (requestParams.type === APP_CODE.type && requestParams.appCodeList && requestParams.appCodeList.length > 0) {
                            userObj.role = user.roleName || APP_CODE.role;
                        }
                       
                        return userObj;
                    }).filter(Boolean);
                   
                    // 追加新数据到现有数据中
                    setSearchOptions(prevOptions => {
                        // 确保之前的选项是数组
                        const safeOptions = Array.isArray(prevOptions) ? prevOptions : [];
                       
                        // 合并现有选项和新选项
                        const combinedOptions = [...safeOptions, ...newOptions];
                       
                        // 进行去重处理
                        const uniqueOptions = [];
                        const userIdSet = new Set();
                       
                        combinedOptions.forEach(option => {
                            if (!userIdSet.has(option.userId)) {
                                userIdSet.add(option.userId);
                                uniqueOptions.push(option);
                            }
                        });
                       
                        return uniqueOptions;
                    });
                    setPagination({
                        currentPageNo: data.currentPageNo || nextPage,
                        totalPageCount: data.totalPageCount || 0
                    });
                    setHasMore((data.currentPageNo || 0) < (data.totalPageCount || 0));
                } else {
                    setHasMore(false);
                }
            })
            .catch(error => {
                console.error('Error loading more users:', error);
                setHasMore(false);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // 处理下拉列表滚动
    const handlePopupScroll = (e) => {
        // 当滚动到接近底部时加载更多数据
        if (e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 50) {
            loadMoreData();
        }
    };

    // 初始加载默认选项和回显逻辑
    useEffect(() => {
        if (firstLoadRef.current && !disabled && !isBusinessPanel && !searchOptions.length && !loading) {
            // 不再自动调用初始搜索，等待用户点击下拉框时再加载
            firstLoadRef.current = false; // 标记已经加载过，避免重复加载
        } else if ((disabled || isBusinessPanel) && normalizedValue && !searchOptions.length) {
            // 只读状态，设置当前选中值为选项，确保能够显示
            const userId = normalizedValue?.userId || '';
            const userName = normalizedValue?.userName || userId;
           
            if (userId) {
                // 清空现有选项，只保留当前值
                setSearchOptions([{
                    groupId: null,
                    groupName: null,
                    userId,
                    userName,
                    userAlias: userId
                }]);
            }
        }
    }, [disabled, isBusinessPanel, normalizedValue?.userId, normalizedValue?.userName, searchOptions.length, loading]);

    // 处理默认值回显，采用多种方式尝试获取用户信息
    useEffect(() => {
        try {
            // 首先检查t.defaultValue[fieldCode]是否是包含完整用户对象的数组
            if (t?.defaultValue && Array.isArray(t.defaultValue[fieldCode]) && t.defaultValue[fieldCode].length > 0) {
                const defaultValueObj = t.defaultValue[fieldCode][0];
                // 验证是否是完整的用户对象
                if (defaultValueObj && defaultValueObj.userId && defaultValueObj.userName) {
                    // 检查当前搜索选项中是否已经包含了这个用户
                    if (!searchOptions.some(opt => opt?.userId === defaultValueObj.userId)) {
                        // 确保defaultValueObj包含必要的字段
                        const safeObj = {
                            groupId: null,
                            groupName: null,
                            userId: defaultValueObj.userId,
                            userName: defaultValueObj.userName,
                            ...defaultValueObj
                        };
                        // 添加而不是替换用户信息
                        setSearchOptions(prev => [safeObj, ...(Array.isArray(prev) ? prev : [])]);
                    }
                   
                    // 更新表单值（可选）
                    if (actions && fieldCode && (!value || !value.length)) {
                        actions.setFieldValue(fieldCode, [defaultValueObj]);
                    }
                   
                    return; // 已处理完成，不需要继续
                }
            }
        } catch (error) {
            console.error('Error handling default value echo:', error);
        }

        // 如果有值但只有ID没有用户名，需要加载完整用户信息
        if (normalizedValue && normalizedValue.userId && (!normalizedValue.userName || normalizedValue.userName === normalizedValue.userId)) {
            try {
                // 如果当前选项中已经有这个用户，不需要再次处理
                if (searchOptions.some(opt => opt?.userId === normalizedValue.userId)) {
                    return;
                }
               
                // 移除sessionStorage相关处理，直接使用简单的ID显示方案
                const basicUser = {
                    groupId: null,
                    groupName: null,
                    userId: normalizedValue.userId,
                    userName: normalizedValue.userName || normalizedValue.userId,
                    userAlias: normalizedValue.userId,
                    role: APP_CODE.role
                };
               
                // 添加用户信息
                setSearchOptions(prev => {
                    const safeOptions = Array.isArray(prev) ? prev : [];
                    return [basicUser, ...safeOptions];
                });
               
                // 最后尝试通过API加载
                setLoading(true);
               
                // 创建请求参数 - 使用空字符串搜索加载所有用户
                const requestParams = createRequestParams(1, '');
               
                // 使用通用接口加载用户列表
                const apiRequest = USE_MOCK_DATA
                    ? mockUserResponse(requestParams)
                    : safeApiRequest(postJSON('/api/v2/user/getUserInfoByDbsCondition', requestParams));
                   
                apiRequest
                    .then(response => {
                        const { data } = response || {};
                        if (data && Array.isArray(data.userList) && data.userList.length > 0) {
                            // 在返回的用户列表中查找匹配的用户
                            const matchedUser = data.userList.find(user => String(user.id || '') === normalizedValue.userId);
                           
                            if (matchedUser) {
                                // 找到匹配的用户，更新当前值的显示
                                const updatedUser = {
                                    groupId: null,
                                    groupName: null,
                                    userId: String(matchedUser.id || ''),
                                    userName: matchedUser.name || normalizedValue.userId,
                                    userAlias: matchedUser.userAlias || '',
                                    departmentId: String(matchedUser.departmentId || ''),
                                    department: matchedUser.department || '',
                                    departmentDetail: matchedUser.departmentDetail || '',
                                    status: matchedUser.status || 1,
                                    docpSubscribe: matchedUser.docpSubscribe || false,
                                    role: requestParams.type ? APP_CODE.role : ''
                                };
                               
                                // 检查是否已存在该用户，如果不存在则添加
                                setSearchOptions(prev => {
                                    const safeOptions = Array.isArray(prev) ? prev : [];
                                    if (safeOptions.some(opt => opt?.userId === updatedUser.userId)) {
                                        return safeOptions.map(opt => opt?.userId === updatedUser.userId ? updatedUser : opt);
                                    } else {
                                        return [updatedUser, ...safeOptions];
                                    }
                                });
                               
                                // 更新表单值
                                if (actions && fieldCode) {
                                    actions.setFieldValue(fieldCode, [updatedUser]);
                                }
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching users for default value:', error);
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            } catch (error) {
                console.error('Error in user info loading process:', error);
                setLoading(false);
            }
        }
    }, [normalizedValue]);

    // 在表单值发生变化时重置APP_CODE搜索标志
    useEffect(() => {
        // 当表单值变化时，重置APP_CODE搜索状态
        // 这样确保依赖应用列表变化后能够重新加载APP_CODE结果
        appCodeSearchedRef.current = false;
    }, [getApplicationImpacte().length]);

    useEffect(() => {
        if (!tableKey) {
            setBaseValue && setBaseValue(fieldCode + '_search', handleSearch(value));
        }
    }, [value]);

    // changeOptions 重置字段值
    useAsyncEffect(async () => {
        if (!changeOptions || !actions) return;
        const _value = await actions.getFieldValue(fieldCode);
        if (!_value || !_value.length) return;
        const ids = changeOptions.map(ch => ch.userId);
        actions.setFieldValue(fieldCode, _value.filter(v => ids.includes(v.userId)));
    }, [changeOptions]);

    // 监听字段联动【追加选项】，更新选值
    useEffect(() => {
        if (!Array.isArray(additionOptions) || additionOptions?.length === 0 || !isMultiple) return;
        let newMembers = [...(Array.isArray(value) ? value : [])];
        const userIds = convertToPrimaryArray(newMembers, 'userId');
        additionOptions?.forEach(m => {
            if (userIds?.indexOf(m?.userId + '') == -1) newMembers = [...newMembers, m];
        });
        setFieldState && setFieldState(fieldCode, state => {
            state.value = newMembers;
        });
        // 这里再重置一下additionOptions这个属性
        // 不然下一次设置additionOptions属性的值和上一次值相同useEffect里面监听不到
        // 场景：追加一个值，然后把这个值删了，然后再次触发使追加这个值，不会生效
        setFieldState && setFieldState(fieldCode, (state) => {
            FormPath.setIn(state, 'props.x-props.additionOptions', null);
        });
    }, [additionOptions]);

    // 确定placeholder文本
    const finalPlaceholder = placeholder || "Input 1 BankID To Search More";

    // 在所有情况下都使用Select组件
    return (
        <div className={`${disabled || isBusinessPanel ? styles['dynamic-member-disabled'] : styles['dynamic-member']} ${!value?.length && (disabled || isBusinessPanel) ? styles['empty'] : ''}`}>
            {disabled || isBusinessPanel ? (
                <span className={styles['no-val']}>{normalizedValue?.userName ? formatUserName(normalizedValue.userName) : '--'}</span>
            ) : (
                <Select
                    ref={dropdownRef}
                    placeholder={finalPlaceholder}
                    style={{ width: '100%' }}
                    showSearch
                    allowClear
                    value={normalizedValue?.userId}
                    loading={loading}
                    filterOption={false}
                    onSearch={handleSelectSearchWithDebounce}
                    onChange={handleChange}
                    onFocus={() => {
                        if (disabled || isBusinessPanel || loading) return;
                       
                        // 记录聚焦时间
                        focusTimeRef.current = Date.now();
                       
                        // 无条件重置APP_CODE搜索标志，确保每次点击都会重新请求
                        appCodeSearchedRef.current = false;
                       
                        // 清除之前的搜索选项，准备加载新的APP_CODE数据
                        setSearchOptions([]);
                       
                        // 重置搜索文本，确保每次都使用APP_CODE类型搜索
                        setSearchText('');
                       
                        // 使用requestAnimationFrame确保界面更新后再加载数据
                        requestAnimationFrame(() => {
                            // 每次打开下拉框都重新搜索一次APP_CODE数据
                            handleSelectSearch('');
                        });
                    }}
                    onPopupScroll={handlePopupScroll}
                    getPopupContainer={getPopupContainer || (() => document.body)}
                    disabled={disabled || isBusinessPanel}
                    optionLabelProp="label"
                >
                    {searchOptions.map(option => (
                        <Option
                            key={option.userId}
                            value={option.userId}
                            label={`${formatUserName(option.userName)} ${option.userAlias ? ` (${option.userAlias})` : ''}`}
                        >
                            <div className={styles.optionItem}>
                                <span className={styles.userName}>{option.userName} ({option.userAlias || option.userId})</span>
                                {option.role && <span className={styles.userRole}>{option.role}</span>}
                            </div>
                        </Option>
                    ))}
                </Select>
            )}
        </div>
    );
};

export default CustomScheduledApproverMember;
