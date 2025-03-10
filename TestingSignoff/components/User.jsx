import { useState, useEffect, useMemo, useRef } from 'react'
import { CWSelect, Form4 as Form } from '@chaoswise/ui'
import { getUsersByGroupId } from '../../api'
import { debounce } from '@/utils/T/core/helper';
import { getGroupUserListByNameApi } from '@/services/douc'
// eslint-disable-next-line import/no-anonymous-default-export
export default ({ value, onChange, row, disabled, multiple, ...props }) => {
    const [loading, setLoading] = useState(false)
    const hasMoreRef = useRef(true)
    const [currentPageNo, setCurrentPageNo] = useState(0)
    const [searchValue, setSearchValue] = useState(null)
    const [searchList, setSearchList] = useState([])
    const PAGE_SIZE = 50
    const { form, onValuesChange } = row
    const key = props.id.split('_').splice(1)
    key.splice(2, 1, 'signOffUserGroup')
    const signOffUserGroup = Form.useWatch(key, form)
    const [list, setList] = useState([])
    const selectRef = useRef(null)
    const getUsers = (groupId, currentPage) => {
        if (!hasMoreRef.current || loading) return
        setLoading(true)
        getUsersByGroupId({
            groupId: groupId,
            currentPageNo: currentPage || currentPageNo,
            pageSize: PAGE_SIZE
        }).then(res => {
            if (res.data.totalCount < PAGE_SIZE) {
                hasMoreRef.current = false
            } else {
                hasMoreRef.current = true
                setCurrentPageNo(res.data.currentPageNo + 1)
            }
            const newList = res.data.userList.map(item => {
                return {
                    label: `${item.name}(${item.userAlias})`,
                    value: `${item.id}`
                }
            })
            setList(list.concat(newList))
            setLoading(false)
        }).catch(err => {
            setLoading(false)
        })
    }
    useEffect(() => {
        console.log('signOffUserGroup', props.id, signOffUserGroup);
        
        if (signOffUserGroup?.[0]?.groupId) {
            hasMoreRef.current = true
            getUsers(signOffUserGroup?.[0]?.groupId, 1)
        } else {
            setList([])
        }
    }, [signOffUserGroup])
    useEffect(() => {
        const searchList = JSON.parse(JSON.stringify(list))
        if (value?.[0]?.userId && !searchList.find(item => item.value == value?.[0]?.userId)) {
            searchList.push({
                label: value?.[0]?.userName,
                value: value?.[0]?.userId
            })
            setList(searchList)
        }
    }, [value])
    const getPopupContainer = (e) => {
        const { inIframe } = window.DOSM_CUSTOM_DBS.signoff
        if (inIframe) {
            return window.parent?.document?.body
        } else {
            return document.body
        }
    }
    const onScroll = (e) => {
        if (e.target.scrollTop + e.target.offsetHeight >= e.target.scrollHeight - 5 && !searchValue) {
            getUsers(signOffUserGroup?.[0]?.groupId)
        }
    }
    const onSearch = debounce((value) => {
        if (!value) {
            setSearchValue(value)
            return
        }
        setLoading(true)
        getGroupUserListByNameApi({
            currentPageNo: 1,
            pageSize: 50,
            nameOrAlias: value,
            groupIds: signOffUserGroup?.[0]?.groupId,
            securityFlag: false
        }).then(res => {
            setLoading(false)
            setSearchList(res.data.list.map(item => {
                return {
                    label: `${item.name}(${item.userAlias})`,
                    value: `${item.userId}`
                }
            }))
            setSearchValue(value)
        }).catch(err => {
            setLoading(false)
        })
    }, 300)

    return <div ref={selectRef}>
        <CWSelect
            value={multiple ? value?.map(i => i.userId) : value?.[0]?.userId}
            style={{ width: '168px' }}
            virtual={true}
            onChange={(val, option) => {
                console.log(val, option);
                let _val = []
                if (Array.isArray(val)) {
                    _val = val.map(item => {
                        return {
                            userName: option.find(i => i.key == item).label,
                            userId: item,
                            groupName: null,
                            groupId: null
                        }
                    })
                } else {
                    _val = [
                        {
                            userName: option.props.label,
                            userId: val,
                            groupName: null,
                            groupId: null
                        }
                    ]
                }
                onChange(_val)
                onValuesChange(row.name, 'signOffUser', _val)
            }}
            getPopupContainer={getPopupContainer}
            dropdownClassName={props.id}
            disabled={disabled}
            placeholder="Please select"
            mode={multiple ? 'multiple' : undefined}
            showCheckbox={multiple ? true : false}
            onPopupScroll={onScroll}
            loading={loading}
            showSearch
            onSearch={onSearch}
            filterOption={false}
        >
            {
                searchValue ?
                    searchList.map(item => <CWSelect.Option value={item.value} key={item.value} label={item.label}>{item.label}</CWSelect.Option>)
                    :
                    list.map(item => <CWSelect.Option value={item.value} key={item.value} label={item.label}>{item.label}</CWSelect.Option>)
            }
        </CWSelect>
    </div>
}