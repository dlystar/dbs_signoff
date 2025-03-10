import { helper, request } from "@/utils/T";
import { fetchGet, fetchPost, upload } from '@/utils/T/core/request/request';

const { get } = request;
const { encryptByDES } = helper;

// 缓存对象和防抖计时器
// const signOffCache = {};
// let signOffCacheTimer = null;

// export const getSignOffListByWorkOrderId = (params) => {
//     // 创建缓存键（基于请求参数）
//     const cacheKey = JSON.stringify(params);

//     // 检查缓存是否存在且有效
//     if (signOffCache[cacheKey]) {
//         return Promise.resolve(signOffCache[cacheKey]);
//     }

//     // 如果有定时器在运行，清除它
//     if (signOffCacheTimer) {
//         clearTimeout(signOffCacheTimer);
//     }

//     // 创建实际的API请求并缓存结果
//     const request = fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/getSignOffListByWorkOrderId?signOffGroup=${params.signOffGroup}&workOrderId=${params.workOrderId}`, { baseURL: '' })
//         .then(response => {
//             // 缓存响应
//             signOffCache[cacheKey] = response;

//             // 设置定时器在500ms后清除缓存，确保缓存的新鲜度
//             signOffCacheTimer = setTimeout(() => {
//                 delete signOffCache[cacheKey];
//                 signOffCacheTimer = null;
//             }, 500);

//             return response;
//         });

//     // 立即将promise存入缓存，以便后续请求可以获取相同的promise
//     signOffCache[cacheKey] = request;

//     return request;
// }
// upload file
export const uploadFileList = (params, cb) => {
    return upload(`/api/v2/file/uploadList`, params, cb, { timeout: 50 * 1000 });
};
// review file
export const reviewFile = (id) => {
    return `${location.origin}/docp/gateway/dosm/api/v2/online/preview/filePreviewById?fileId=${id}`
};
// download file
export const downloadFile = (id, fileName) => {
    let config = window.DOSM_CONFIG || {};
    const url = (config?.apiDomain || '') + (config?.imgDomain || '') + `/api/v2/file/download?id=${id}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.querySelector('body').appendChild(a);
    a.click();
    document.querySelector('body').removeChild(a);

};
// bulk download
export const bulkDownloadFile = (idList, fileName, fileType) => {
    let config = window.DOSM_CONFIG || {};
    const url = (config?.apiDomain || '') + (config?.imgDomain || '') + `/api/v2/file/bulkDownload?idList=${idList.join(',')}&fileName=${fileName}&fileType=${fileType}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.querySelector('body').appendChild(a);
    a.click();
    document.querySelector('body').removeChild(a);
}

// query groups with groupid
export const getUserGroupInfoByIds = (params) => {
    return fetchGet(`/api/v2/userGroup/getUserGroupInfoByIds?groupIds=${encryptByDES(params.groupId.toString())}`)
}

// query users with groupid
export const getUsersByGroupId = (params) => {
    params.groupId = encryptByDES(params.groupId.toString());
    return get(`/api/v2/user/getUsersByGroupId`, params)
}

// insert signoff info
export const signoffInsertBatch = (params, check = true) => {
    let workOrderId = params?.[0]?.workOrderId
    let signOffGroup = params?.[0]?.signOffGroup
    return new Promise((resolve, reject) => {
        if (check) {
            getSignOffListByWorkOrderId({ workOrderId, signOffGroup }).then(res => {
                if (res && res?.data && res?.data?.length > 0) {
                    const existTypes = res.data.map(item => JSON.parse(item.signOffType)).flat()
                    let newParams = params.filter(item => {
                        let type = JSON.parse(item.signOffType)[0]
                        return !existTypes.includes(type)
                    })
                    if (newParams.length == 0) {
                        return resolve()
                    }
                    fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/insertBatch`, { data: newParams, baseURL: '' }).then(res => {
                        resolve(res)
                    }).catch(err => {
                        reject(err)
                    })
                } else {
                    if (params.length == 0) {
                        return resolve()
                    }
                    fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/insertBatch`, { data: params, baseURL: '' }).then(res => {
                        resolve(res)
                    }).catch(err => {
                        reject(err)
                    })
                }
            })
        } else {
            fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/insertBatch`, { data: params, baseURL: '' }).then(res => {
                resolve(res)
            }).catch(err => {
                reject(err)
            })
        }
    })
}
// delete signoff info
export const signoffDeleteBatch = (params) => {
    if (params?.length == 0) return new Promise((resolve) => { resolve() })
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/deleteBatch`, { data: params, baseURL: '' })
}
// update signoff info
export const signoffUpdate = (params) => {
    if (!params.id) return new Promise((resolve) => { resolve() })
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/update`, { data: params, baseURL: '' })
}
// send email
export const signoffSendEmail = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/sendEmail?signOffId=${params.signOffId}`, { data: params, baseURL: '' })
}

// update signoff status
export const signoffStatus = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/status?signOffId=${params.signOffId}&status=${params.status}`, { data: params, baseURL: '' })
}

// reject
export const signoffRejected = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/rejected?signOffId=${params.signOffId}&rejectionReason=${params.rejectionReason}`, { data: params, baseURL: '' })
}
// approval
export const signoffApproved = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/approved?signOffId=${params.signOffId}`, { data: params, baseURL: '' })
}
// query signoff info by id
export const getSignOffById = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/getSignOffById`, { data: params, baseURL: '' })
}
// query signoff list with workOrderId
export const getSignOffListByWorkOrderId = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/getSignOffListByWorkOrderId?signOffGroup=${params.signOffGroup}&workOrderId=${params.workOrderId}`,{ baseURL: ''})
}
// submit IDR CASE ID
export const submitIDRCseId = (params) => {
    return new Promise((resolve, reject) => {
        window.fetch(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/idrCaseIdValid?caseId=${params.caseId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(res => {
            res.json().then(res => {
                resolve(res.data)
            })
        })
    })
    // return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/idrCaseIdValid?caseId=${params.caseId}`,{data: params, baseURL: ''})
}

// batch update signoff
export const signoffBatchUpdate = (params) => {
    let workOrderId = params.find(i => !!i.workOrderId).workOrderId
    let signOffGroup = params[0].signOffGroup
    return new Promise((resolve, reject) => {
        getSignOffListByWorkOrderId({ workOrderId, signOffGroup }).then(res => {
            if (res && res?.data && res?.data?.length > 0) {
                let deleteRows = []
                let updateRows = []
                let insertRows = []
                deleteRows = res.data.filter(item => !params.map(i => i.id).includes(item.id))
                insertRows = params.filter(item => !res.data.map(i => i.id).includes(item.id))
                updateRows = res.data.filter(item => params.map(i => i.id).includes(item.id))
                let promises = []
                if (deleteRows.length > 0) {
                    promises.push(signoffDeleteBatch(deleteRows))
                }
                if (insertRows.length > 0) {
                    promises.push(fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/insertBatch`, { data: insertRows, baseURL: '' }))
                }
                if (updateRows.length > 0) {
                    updateRows.map(item => {
                        promises.push(signoffUpdate(item))
                    })
                }
                promises.all().then(res => {
                    resolve(res)
                }).catch(err => {
                    reject(err)
                })
            } else {
                fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/insertBatch`, { data: params, baseURL: '' }).then(res => {
                    resolve(res)
                }).catch(err => {
                    reject(err)
                })
            }
        })
    })
}