import React, { useState, useEffect } from "react";
import { UploadOutlined, CloudUploadOutlined, EyeOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Upload, Popover, Modal, TooltipText, Tooltip, Spin } from '@chaoswise/ui';
import { uploadFileList, reviewFile, downloadFile, bulkDownloadFile } from '../../api'
import getFileTypeImg from '../../assets/getFileTypeImg'
import DoEmpty from '@/components/DoEmpty'
// eslint-disable-next-line import/no-anonymous-default-export
export default ({ value = [], onChange, row, disabled, ...props }) => {
    const { form, onValuesChange } = row
    const [fileList, setFileList] = useState(value)
    const [imageList, setImageList] = useState([]);
    const [currentFileList, setCurrentFileList] = useState([])
    const [listMark, setListMark] = useState({ fileList, imageList });
    const [uploading, setUploading] = useState(false)
    const [percent, setPercent] = useState(0);
    const [visible, setVisible] = useState(false)
    const [viewVisible, setViewVisible] = useState(false)
    const [currentViewFile, setCurrentViewFile] = useState({})
    const [failList, setFailList] = useState([])
    const { enumAcceptType } = window.DOSM_CONFIG
    const _accept = enumAcceptType.split(',').map(i => i.replace('.', ''))
    const maxFileSize = window.DOSM_CONFIG.uploadFileMaxSize || 15;
    const handleChange = (val) => {
        onChange(val)
        onValuesChange(row.name, 'artifact', val)
    }
    const convertFileSize = (limit) => {
        let size = '';
        if (limit < 1024) {
            //小于1KB，则转化成B
            size = limit.toFixed(2) + 'B';
        } else if (limit < 1024 * 1024) {
            //小于1MB，则转化成KB
            size = (limit / 1024).toFixed(2) + 'KB';
        } else if (limit < 1024 * 1024 * 1024) {
            //小于1GB，则转化成MB
            size = (limit / (1024 * 1024)).toFixed(2) + 'MB';
        } else {
            //其他转化成GB
            size = (limit / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
        }

        let sizeStr = size + ''; //转成字符串
        let index = sizeStr.indexOf('.'); //获取小数点处的索引
        let dou = sizeStr.substr(index + 1, 2); //获取小数点后两位的值
        if (dou == '00') {
            //判断后两位是否为00，如果是则删除00
            return sizeStr.substring(0, index) + sizeStr.substr(index + 3, 2);
        }
        return size;
    };
    const beforeUpload = (file, fileLists) => {
        let typeList = [];
        fileLists?.map((item) => {
            let { type, size } = item;
            typeList?.push(type);
        });

        const checkSizeIsNull = (list) => {
            let sizeList = [];
            list?.map((item) => {
                let { type, size } = item;
                sizeList?.push(size);
            });

            return sizeList?.filter((item) => {
                return item === 0;
            })?.length;
        };

        // const checkSizeIsBig = (list) => {
        //     return list?.filter((item) => {
        //         return item?.size > uploadFileSize * 1048576;
        //     })?.length;
        // };

        const checkTotalSize = (list) => {
            let existingFilesSize = 0;
            if (value && value.length > 0) {
                // 计算已上传文件的大小
                value.forEach(item => {
                    // 如果文件已经有字节大小属性(fileSize)
                    if (item.fileSize && !isNaN(parseInt(item.fileSize))) {
                        existingFilesSize += parseInt(item.fileSize);
                    } 
                    // 如果文件有格式化的大小字符串(size)，需要解析
                    else if (item.size && typeof item.size === 'string') {
                        const sizeStr = item.size.toLowerCase();
                        let multiplier = 1;
                        
                        if (sizeStr.includes('kb')) {
                            multiplier = 1024;
                        } else if (sizeStr.includes('mb')) {
                            multiplier = 1024 * 1024;
                        } else if (sizeStr.includes('gb')) {
                            multiplier = 1024 * 1024 * 1024;
                        }
                        
                        const numericSize = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
                        if (!isNaN(numericSize)) {
                            existingFilesSize += numericSize * multiplier;
                        }
                    }
                    // 如果无法获取大小，估计为1MB
                    else {
                        existingFilesSize += 1024 * 1024; // 默认1MB
                    }
                });
            }
            
            let newFilesSize = 0;
            list?.forEach(item => {
                newFilesSize += item.size || 0;
            });
            
            const totalSize = existingFilesSize + newFilesSize;
            
            return totalSize > maxFileSize * 1048576;
        };

        let uploadList = [...fileLists];

        if (checkSizeIsNull(uploadList)) {
            uploadList?.forEach((item, index) => {
                if (item?.size == 0) {
                    delete uploadList[index];
                }
            });

            let arr = [];
            uploadList?.forEach((item) => {
                if (item) {
                    arr?.push(item);
                }
            });
            uploadList = arr;

            window.prompt.error('You are not allowed to upload an empty file');

            if (!uploadList?.length) {
                return false;
            }
        }

        // if (checkSizeIsBig(uploadList)) {
        //     uploadList?.forEach((item, index) => {
        //         if (item?.size > uploadFileMaxSize * 1048576) {
        //             //限制大小
        //             delete uploadList[index];
        //         }
        //     });

        //     let arr = [];
        //     uploadList?.forEach((item) => {
        //         if (item) {
        //             arr?.push(item);
        //         }
        //     });
        //     uploadList = arr;
        //     window.prompt.error(`Max size: ${uploadFileMaxSize}MB`);
        //     if (!uploadList?.length) {
        //         return false;
        //     }
        // }

        if (checkTotalSize(uploadList)) {
            window.prompt.error(`The total file size cannot exceed ${maxFileSize}MB`);
            return false;
        }

        const checkSuffix = (list) => {
            return list?.filter((file) => {
                const suffix = file.name
                    .substring(file.name.lastIndexOf('.') + 1, file.name.length)
                    .toLowerCase();
                return !_accept.includes(suffix);
            })?.length;
        };
        if (checkSuffix(uploadList)) {
            uploadList?.forEach((file, index) => {
                const suffix = file.name
                    .substring(file.name.lastIndexOf('.') + 1, file.name.length)
                    .toLowerCase();
                if (!_accept.includes(suffix)) {
                    delete uploadList[index];
                }
            });
            let arr = [];
            uploadList?.forEach((item) => {
                if (item) {
                    arr?.push(item);
                }
            });
            uploadList = arr;
            window.prompt.error('File in this format is not supported.');
            if (!uploadList?.length) {
                return false;
            }
        }

        let _imgList = [];
        let _fileList = [];
        uploadList?.forEach((item) => {
            if (item.type?.startsWith('image')) {
                _imgList?.push({
                    ...item,
                    fileName: item.name,
                    type: 'img',
                });
            }
            // 无论什么类型的文件都将放进fileList中
            _fileList?.push({
                ...item,
                name: item.name,
                size: convertFileSize(item.size),
                load: true,
                type: item.type?.startsWith('image') ? 'img' : null,
            });
        });
        // setListMark({
        //     fileList,
        //     imageList,
        // });
        setFileList([...(fileList || []), ...(_fileList || [])]);
        setImageList([...(imageList || []), ...(_imgList || [])])
        setCurrentFileList(uploadList);
    };
    const cb = (event) => {
        setPercent(parseInt(((event.loaded / event.total) * 100).toFixed(0)));
    };
    const customRequest = ({ file, onProgress, onSuccess, onError, ...rest }) => {
        setUploading(true);
        uploadFileList({
            files: currentFileList
        }, cb).then(
            (res) => {
                const { data } = res;
                const { failFile, fileVoList } = data;
                const fileListNew = fileVoList.map(item => {
                    return {
                        id: item.id,
                        load: true,
                        name: item.fileName,
                        size: item.fileSize,
                        thype: null,
                        uid: item.id,
                        uploadUserName: item.uploadUserName,
                        url: item.url
                    }
                })
                for (let j = 0; j < failFile?.length; j++) {
                    window.prompt.error(failFile[j].error);
                    continue;
                }
                handleChange([...(value || []), ...(fileListNew || [])])
                setFailList(failList.concat(failFile.map(item => ({
                    name: item.fileName,
                    error: item.error
                })) || []))
                if(failFile?.length < currentFileList.length){
                    setVisible(false)
                }
                setUploading(false);
            },
            (err) => {
                window.prompt.error(
                    err?.msg ||
                    'Upload timeout caused by poor network or large file.'
                );
                setFileList(listMark.fileList.map(item => ({
                    name: item.fileName,
                    error: item.error
                })) || []);
                setImageList(listMark.imageList || []);
                setUploading(false);
            }
        );
    }
    const viewFile = (file) => {
        let type = file?.name?.substr(file?.name.lastIndexOf('.'));
        let _file = { ...file }
        if (type === '.pdf') {
            _file.url = `${window.DOSM_CONFIG?.apiDomain}/api/v2/file/review?id=${file.id}`
        }
        if (window.DOSM_CONFIG.enumAcceptPicture.includes(type)) {
            _file.url = `${window.DOSM_CONFIG?.apiDomain}/api/v2/file/review?id=${file.id}`
            _file.type = 'img'
        }
        setViewVisible(true)
        setCurrentViewFile(_file)
        setVisible(false)
    }
    const download = (file) => {
        downloadFile(file.id, file.name)
    }
    const bulkDownload = () => {
        const ids = value.map(i => i.id)
        bulkDownloadFile(ids, 'Artefact', 'zip')
    }
    const deleteFile = (file, listType) => {
        const _value = JSON.parse(JSON.stringify(value))
        _value.splice(_value.findIndex(i => i.id === file.id), 1)
        handleChange(_value)
    }
    const renderFileItem = (fileItem, listType) => {
        const fileType = fileItem.name.split('.')[fileItem.name.split('.').length - 1]
        return <div className="file_item" style={{ display: 'flex', alignItems: 'center', paddingLeft: 10 }} key={fileItem.id}>
            <div className="file_name" style={{ width: 500 }}>
                <span style={{ marginRight: 10 }}>{getFileTypeImg(fileType.toLowerCase())}</span>
                <TooltipText ellipsisPosition="center" width={430}><a onClick={() => viewFile(fileItem)}>{fileItem.name}</a></TooltipText>
            </div>
            <div className="file_oprate" style={{ width: 100, marginLeft: 20 }}>
                {/* <Button style={{border: 'none', background: 'transparent'}} onClick={() => viewFile(fileItem)}><EyeOutlined /></Button> */}
                <Button style={{ border: 'none', background: 'transparent', padding: 5 }} onClick={() => download(fileItem)}><DownloadOutlined /></Button>
                {!disabled && <Button style={{ border: 'none', background: 'transparent', padding: 5 }} onClick={() => deleteFile(fileItem, listType)}><DeleteOutlined /></Button>}
            </div>
        </div>
    }
    const renderFailItem = (fileItem, index) => {
        const fileType = fileItem.name.split('.')[fileItem.name.split('.').length - 1]
        return <div className="file_item" style={{ display: 'flex', alignItems: 'center', paddingLeft: 10 }} key={fileItem.name + index}>
            <div className="file_name" style={{ width: 500 }}>
                <span style={{ marginRight: 10 }}>{getFileTypeImg(fileType.toLowerCase())}</span>
                <TooltipText ellipsisPosition="center" trigger="click" width={430}>
                    <Tooltip title={fileItem.error}><span style={{color: 'red'}}>{fileItem.name}</span></Tooltip>
                </TooltipText>
            </div>
            <div className="file_oprate" style={{ width: 100, marginLeft: 20 }}>
                {<Button style={{ border: 'none', background: 'transparent', padding: 5 }} onClick={() => {
                    const _value = JSON.parse(JSON.stringify(failList))
                    _value.splice(index, 1)
                    setFailList(_value)
                }}><DeleteOutlined /></Button>}
            </div>
        </div>
    }
    const renderFileOuter = (fileItem) => {
        const fileType = fileItem.name.split('.')[fileItem.name.split('.').length - 1]
        return <Tooltip title={fileItem.name}>{getFileTypeImg(fileType.toLowerCase())}</Tooltip>
    }
    const hasFile = () => {
        return value?.length > 0
    }
    const getContainer = () => {
        const { inIframe } = window.DOSM_CUSTOM_DBS.signoff
        if (inIframe) {
            return window.parent?.document?.body
        } else {
            return document.body
        }
    }
    return <div>
        <Popover visible={visible} onVisibleChange={(vis) => setVisible(vis)} trigger="click" title={null} placement="top" getPopupContainer={getContainer} content={
            <div className="upload_modal" style={{ marginTop: 20, width: 600 }}>
                <style>{`.upload_modal .file_item:hover{background: #e5f6ff;}`}</style>
                <Spin spinning={uploading}>
                    {
                        !disabled && <Upload.Dragger
                            listType='text'
                            fileList={value || []}
                            beforeUpload={(file, fileList) => beforeUpload(file, fileList)}
                            customRequest={customRequest}
                            // accept={newfileTypeArray?.join(',')}
                            multiple={true}
                            showUploadList={false}
                        >
                            <div style={{ padding: '20px 0px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CloudUploadOutlined style={{ fontSize: 20, marginRight: 20, color: '#1980ff' }} />Click or drag the file to this area
                            </div>
                            <div style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
                                File format:&nbsp;
                                <TooltipText width={300} getPopupContainer={(node) => node.parentNode}>{_accept.join('/')}</TooltipText>
                                &nbsp;&nbsp;&nbsp;
                                <br/>
                                Multiple files can be uploaded for each signoff, but the total file size cannot exceed 15MB.
                            </div>
                        </Upload.Dragger>
                    }
                </Spin>
                <div style={{ textAlign: 'right', margin: '5px 0px' }}>
                    {
                        (value?.length > 0) &&
                        <Button onClick={bulkDownload} type="link" style={{ border: 'none' }}><DownloadOutlined />Bulk Download</Button>
                    }
                </div>
                <div className="files">
                    {value && value?.map?.(item => renderFileItem(item, 'fileList'))}
                    {failList.map((item, index) => renderFailItem(item, index))}
                </div>
                <div>
                    {disabled && !value?.length && <DoEmpty />}
                </div>
            </div>
        }>
            <Button disabled={disabled && !hasFile()} style={{ background: '#f0f1f4', border: 'none' }} onClick={() => {
                if (disabled && !hasFile()) return
                setVisible(true)
            }}>
                {<UploadOutlined style={{ marginRight: 5 }} />}
                {
                    hasFile() ?
                        <div className="files" style={{ maxWidth: 200 }}>
                            {value?.map(item => renderFileOuter(item))}
                        </div>
                        : 'Upload'
                }
            </Button>
        </Popover>
        <Modal
            visible={viewVisible}
            title={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{currentViewFile.name}</div>
                <Button style={{ marginRight: 50 }} onClick={() => download(currentViewFile)}><DownloadOutlined />Download</Button>
            </div>}
            width="98%"
            style={{ top: 20 }}
            footer={null}
            maskClosable
            onCancel={() => setViewVisible(false)}
            getContainer={getContainer}
            zIndex={9999}
            bodyStyle={{
                minHeight: 300
            }}
        >
            {
                currentViewFile?.type == 'img' ?
                    <img src={currentViewFile?.url} /> :
                    <iframe style={{ width: '100%', height: 600 }} src={currentViewFile?.url ? currentViewFile?.url : reviewFile(currentViewFile.id)}></iframe>
            }
        </Modal>
    </div>
}
