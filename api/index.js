import { helper, request } from "@/utils/T";
import { fetchGet, fetchPost, upload } from '@/utils/T/core/request/request';

const { get } = request;
const { encryptByDES } = helper;
const getWorkOrderIdByParams = (params) => {
    if(Array.isArray(params) && params.length > 0){
        return params[0].workOrderId
    }
    if(params.workOrderId){
        return params.workOrderId
    }
}
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

// insert signoff info -- The backend has done deduplication
export const signoffInsertBatch = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/insertBatch?workOrderId=${getWorkOrderIdByParams(params)}`, { data: params, baseURL: '' })
}
// delete signoff info
export const signoffDeleteBatch = (params, workOrderId) => {
    if (params?.length == 0) return new Promise((resolve) => { resolve() })
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/deleteBatch?workOrderId=${workOrderId}`, { data: params, baseURL: '' })
}
// update signoff info
export const signoffUpdate = (params) => {
    if (!params.id) return new Promise((resolve) => { resolve() })
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/update?workOrderId=${getWorkOrderIdByParams(params)}`, { data: params, baseURL: '' })
}
// send email
export const signoffSendEmail = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/sendEmail?signOffId=${params.signOffId}&workOrderId=${getWorkOrderIdByParams(params)}`, { data: params, baseURL: '' })
}

// update signoff status
export const signoffStatus = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/status?signOffId=${params.signOffId}&status=${params.status}&workOrderId=${getWorkOrderIdByParams(params)}`, { data: params, baseURL: '' })
}

// reject
export const signoffRejected = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/rejected?signOffId=${params.signOffId}&rejectionReason=${params.rejectionReason}&workOrderId=${getWorkOrderIdByParams(params)}`, { data: params, baseURL: '' })
}
// approval
export const signoffApproved = (params) => {
    return fetchPost(`${window.DOSM_CUSTOM_DBS.basename}/dosm/signOff/approved?signOffId=${params.signOffId}&workOrderId=${getWorkOrderIdByParams(params)}`, { data: params, baseURL: '' })
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
}