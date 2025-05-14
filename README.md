import React, { useContext, useRef, useState } from 'react';
import { observer } from '@chaoswise/cw-mobx';
import { Button, message, Modal, Input, Icon } from '@chaoswise/ui';
import { helper, getUrlParams } from '@/utils/T';
import { EnumOrderListType } from '@/pages/ListNew/constant';
import { langUtil } from '@/lang';
import { intl } from '@chaoswise/intl';

import prompt from '@/utils/prompt';

import { checkTableRequired } from '../../../../common/tableUtils';
import { changeHistory, eventManager } from '@/utils/T/core/helper';
import { listRouteExchange } from '@/utils/T/core/routerPrefix';
import { formatFormValues, getShowFieldList } from '@/pages/Reception/common/fieldUtils';
import { StoreCtx } from '@/store';
import { queryAssistedTaskExists } from '../../api';

const needExitCube = getUrlParams('needExitCube') === 'true';

const Submit = ({
  orderType,
  detailFooterStore,
  orderInfo,
  history,
  formRef,
  btnInfo,
  nodeItem,
  taskId,
  submitType,
  disabled,
  btnType,
  btnName,
  isType: enableType,
  cache,
  isCreatePage,
  customBtns,
  requestOptions
}) => {
  const inputRef = useRef();
  const {
    submitOrder,
    submitCreateOrder,
    loadings,
    changeLoading,
    verifyValue,
    fetchRCAList
  } = detailFooterStore;
  const {
    id,
    formData,
    mdlDefKey,
    bizKey,
    processInstanceId,
    mdlDefCode,
    formId,
    isTest,
    serviceIds,
    schema,
    revision,
    currentNodeId,
    preNum,
    dataStatus,
  } = orderInfo;
  const { doucStore } = useContext(StoreCtx);

  const isFirstRequest = useRef(false);
  const [errorData, setErrorData] = useState({
    visible: false
  });
  const [inputValue, setInputValue] = useState('')
  const [showWarning, setShowWarning] = useState(false);
  const [reloadRequest, setReloadRequest] = useState(false);
  const { clearAll } = doucStore || {};
  const submitButtonInfo = customBtns?.filter(item => item?.extString === 'COMMIT')?.[0] || {};

  const getValue = (options) => {
    const getForm = formRef?.current?.util?.actions;
    const baseActions = formRef?.current?.util?.baseActions;
    const submitSuccess = (data) => {
      const { values } = data;
      const { getBaseValue } = baseActions;

      let _values = {
        ...formData,
        ...helper.filterObjByUndefined(values),
        ...getBaseValue(),
      };
      formatFormValues(schema, _values);

      if(isFirstRequest.current) {
        _values['notNeedAiml'] = true;
      }

      if(inputValue) {
        _values['JustificationwhtCategory'] = inputValue
        _values['notNeedAiml'] = true;
        _values = { ..._values, ...errorData?.formData }
      }
      const params_edit = {
        taskId: taskId,
        nodeId: nodeItem.nodeId,
        nodeName: nodeItem.nodeName,
        workOrderId: id,
        workOrderSource: 1,
        bizKey: bizKey,
        authorized: orderType === EnumOrderListType.myAuthorized && true,
        mdlDefCode,
        formId,
        isCheckFlag: false, // 不校验只读/必填
      };
      const params = {
        data: {
          isTest,
          workOrderNo: id,
          bizDesc: values.ticketDesc ? values.ticketDesc : '',
          dataStatus: 0,
          formData: JSON.stringify(_values),
          showCode: getShowFieldList(schema, getForm) || [],
          mdlDefKey: mdlDefKey,
          revision: revision || 0,
          serviceIds,
          sourceId: 'WEB_FORM',
          title: values.title
            ? values.title
            : intl.get('7673a214-94cf-44bd-a822-a7763f0341e5').d('未填写标题'),
          urgentLevel: values.urgentLevel || 1,
          mdlDefCode,
          processInstanceId,
          orderType: orderInfo?.orderType,
          enableType: enableType ? enableType : 'other',
          nodeName: nodeItem.nodeName,
          serviceItemId: orderInfo?.serviceItemId
        },
      };
      options && options({ ...params_edit, ...params });
    };
    getForm
      .submit()
      .then((data) => {
        helper.eventManager.emitOnce('save-link-table');
        submitSuccess(data);
      })
      .catch((error) => {
        const cmdbError = intl
          .get('8b858827-c868-4498-adeb-79ce397a4a51')
          .d('属性已被删除；');
        console.log(error, '--error');
        const _errors = error?.filter((item) => {
          return !(
            item.messages?.length == 1 &&
            item.messages[0].indexOf(cmdbError) > -1
          );
        });
        let isAllowSubmit = dataStatus == -10 || _errors?.length == 0; // -10-草稿
        if (dataStatus == -10 && window?.DOSM_CONFIG?.dbs?.validate?.processKey?.includes(preNum)) {
          isAllowSubmit = _errors?.length == 0
        }
        let errorMsg = ''
        _errors?.forEach(item => {
          if(item.status ==  "rejected"){
            errorMsg = item.reason?.[0]?.name == "testingSignoff" ?  item.reason?.[0]?.messages : ''
          }
        })
        if (isAllowSubmit) {
          getForm.getFieldState().then((data) => {
            submitSuccess(data);
          });
        } else {
          _errors.forEach(item => {
            console.log(item.path, 'item')
          })
          let hasError = document.querySelector(`[data-field-path="${_errors?.[0]?.path}"]`) ||document.querySelector('.has-error');
          console.log(_errors?.[0]?.path, 'item')
          console.log(document.querySelector(`[data-field-path="${_errors?.[0]?.path}"]`), 'item')
          console.log(hasError, 'hasError')
          setTimeout(() => {
            if (hasError) {
              hasError.scrollIntoView({ behavior: 'smooth' });
            }
          }, 0);
          changeLoading('queryAssign', false);
          prompt.error(
            intl.get('02118f29-2a90-4d66-93bb-14d7285be6c6').d('请完善表单信息')
          );
        }
        if(errorMsg){
          prompt.error(errorMsg);
        }
      });
  };

  const handleSubmit = (resolve) => {
    const successCallBack = () => {
      if(!bizKey){
        eventManager.emit('on-order-create-success', id);
      }
      // 西藏移动，需要跳转其他页面，
      if (getUrlParams('flushPortalUrl')) {
        window.location.href = `${getUrlParams(
          'flushPortalUrl'
        )}?itemId=${getUrlParams(
          'itemId'
        )}&appId=${`uni_598_ywjk`}&uniqueId=${getUrlParams('uniqueId')}`;
        return;
      }

      //单独详情页重新加载页面
      const {
        isSingleOrderDetail = false,
        delEdit,
        getOrderCount,
      } = formRef?.current || {};
      // close this main ticket than open this RCA ticket
      const isCloseRCA = isCRClose();
      if (isCloseRCA && bizKey) {
        const baseActions = formRef?.current?.util?.baseActions;
        const { getBaseValue } = baseActions;
        const { CloseStatus_value } = getBaseValue();
        if(['Closed Backoutfail', 'Closed Issues'].includes(CloseStatus_value)){
          // 查询工单编号： 
          // 原 RCA-CR202503149900014 
          // 新 RCA202503149900014
          const bizKeyPrefix = bizKey.startsWith('CR') ? `RCA${bizKey.replace('CR', '')}` : `RCA${bizKey}`;
          fetchRCAList({ 
            bizKey: bizKeyPrefix,
          }, (rcaData) => {
            if (rcaData && rcaData.length) {
              const rcaId = rcaData[0].id;
              let url = `/orderDetails?showType=handle&id=${rcaId}`;
              history && history.push(url);
            }
          });
          return;
        }
      }


      if (delEdit && getOrderCount) {
        setTimeout(() => {
          getOrderCount();
          delEdit();
        }, 500)
        return;
      }
      if (needExitCube && window.DOSM_CONFIG?.cubeJumpUrl) {
        window.open(window.DOSM_CONFIG?.cubeJumpUrl, '_self');
      } else if (isSingleOrderDetail) {
        return window.location.reload();
      } else if (!window.location.href?.includes('list')) {
        if (dataStatus == -10) {
          const urlParams = new URLSearchParams(window.location.href.split('?')[1]);
          const showType = urlParams.get('showType') || '';
          const id = urlParams.get('id') || '';
          return history.replace(`/orderDetails?showType=${showType}&id=${id}&isType=myTask&type=MY_TODO`)
        }
        if (requestOptions) {
          return requestOptions()
        }
        return window.location.reload();
      } else {
        changeHistory(window.location.pathname, history);
      }
    };

    const dbsAiRequestError = (data) => {
      if(data?.aiReqError) {
        isFirstRequest.current = true;
        message.error(data?.aiReqErrorMsg)
      } else {
        isFirstRequest.current = false;
      }
      if(data?.needDialog) {
        setErrorData({
          ...data,
          visible: true
        });
        setInputValue('');
      }
    }

    getValue((params) => {
      const { getBaseValue } = formRef?.current?.util?.baseActions;
      const { CloseStatus_value } = getBaseValue();
      
      // 显示确认弹窗的通用函数
      const showConfirmModal = (content, onConfirm) => {
        Modal.confirm({
          title: 'Declaration',
          content,
          okText: 'Confirm',
          cancelText: 'Discard',
          onOk() {
            setReloadRequest(true);
            onConfirm();
          },
        });
      };

      // 创建提交函数
      const createSubmitHandler = () => {
        // 根据submitType选择不同的提交API
        const submitAction = submitType ? submitCreateOrder : submitOrder;
        
        // 创建提交处理函数
        return () => {
          const submitParams = {
            ...params
          };
          
          // 根据submitType选择不同的参数和回调
          if (submitType) {
            submitAction(submitParams, successCallBack, resolve);
          } else {
            submitAction(submitParams, successCallBack, dbsAiRequestError, resolve);
          }
        };
      };

      // 处理提交逻辑
      const submitHandler = createSubmitHandler();

      // 判断提交条件并执行相应操作
      if (isCRClose() && CloseStatus_value === 'Closed Cancel') {
        // CR关闭取消的确认提示
        showConfirmModal(
          'Do you want to Closed Cancel this CR ?',
          submitHandler
        );
      } else if(submitButtonInfo?.extMap1?.needPopup && !reloadRequest) {
        // 有自定义弹窗提示的情况
        showConfirmModal(
          submitButtonInfo?.extMap1?.popupPrompt || '',
          submitHandler
        );
      } else {
        // 无需确认直接提交
        submitHandler();
      }
    });
  };

  const CanCelBtn = () => {
    return (
      <>
        {enableType ? (
          <Button
            disabled={disabled}
            style={{ height: 28 }}
            onClick={() => {
              const { isSingleOrderDetail = false } = formRef?.current || {};
              if (isSingleOrderDetail) {
                return window.location.reload();
              } else if (!window.location.href?.includes('list')) {
                changeHistory('/serviceDirectory', history);
              } else {
                changeHistory(window.location.pathname, history);
              }
            }}
          >
            {intl.get('19d6c313-9540-4042-b642-ebc6396ca0c7').d('取消')}
          </Button>
        ) : null}
      </>
    );
  };

  const handleClick = () => {
    if (orderType != EnumOrderListType.myDraft) {
      getValue((params) => {
        verifyValue(
          params,
          (data) => {
            if (data) {
              Modal.confirm({
                title: langUtil.t(
                  intl
                    .get('950a160b-46aa-4591-b24b-06f5d5ba291c')
                    .d('当前工单已刷新')
                ),
                content: langUtil.t(
                  intl
                    .get('16dd044f-af99-420e-aa61-52914ce28811')
                    .d(
                      '点击"刷新"按钮刷新当前工单详情页，点击"覆盖"按钮将覆盖其他人编辑的内容'
                    )
                ),
                cancelText: langUtil.t(
                  intl.get('1d0f3c0c-188f-4f83-bff0-2792dffcdc2d').d('刷新')
                ),
                okText: langUtil.t(
                  intl.get('a144f61d-7f90-41f0-a47c-fbc0b9d6be62').d('覆盖')
                ),
                onOk() {
                  return new Promise((resolve, reject) =>
                    handleSubmit(resolve)
                  );
                },
                onCancel: () => {
                  clearAll && clearAll();
                  formRef.current?.refreshStore?.();
                  eventManager.emit('on-clear-request-cache');
                },
              });
            } else {
              handleSubmit()
            }
          },
          'submit'
        );
      });
    } else {
      handleSubmit()
    }
  };

  const startSubmit = () => {
    checkTableRequired(formRef?.current?.util?.actions, true, () =>
      handleClick()
    );
  };

  const checkAssistedTaskBeforeSubmit = async () => {
    let result = await queryAssistedTaskExists({
      processInstanceId,
      nodeId: currentNodeId,
    });
    if (result.code !== 100000) {
      startSubmit();
      return;
    }
    if (result?.data) {
      Modal.confirm({
        title: intl
          .get('a3a34281-1b67-49b8-a39d-f70a61e7fbc2')
          .d('有尚未处理的协办任务，是否确认提交工单？'),
        onOk: () => {
          startSubmit();
        },
      });
    } else {
      startSubmit();
    }
  };

  const isCRClose = () => {
    const { close, prenum } = window.DOSM_CONFIG?.dbs?.cr || {};
    return close?.node?.id === nodeItem?.nodeId && prenum === preNum
  }

  const SubmitBtn = ({ loadings }) => {
    let displayBtnName = btnName;
    // 判断是否需要修改按钮名称
    const closeRCABtnName = window.DOSM_CONFIG?.dbs?.cr?.['close-submit']?.btn?.name;
    if (closeRCABtnName && isCRClose()) {
      displayBtnName = closeRCABtnName;
    }

    return (
      <>
        <Button
          type={btnType}
          disabled={disabled}
          onClick={checkAssistedTaskBeforeSubmit}
          style={{ marginLeft: '10px' }}
          loading={loadings.queryAssign || loadings.submit}
        >
          { dataStatus == -10 ? 'Create' : displayBtnName}
        </Button>
      </>
    );
  };

  const handleDbsModalSubmit = () => {
    if(!inputValue) {
      // message.info('Please provide justification why Change Category 3 (Low Risk) is selected when Al Model recommends High Risk.')
      setShowWarning(true);
      return;
    }
    checkAssistedTaskBeforeSubmit();
  }

  const isLeft = window.DOSM_CONFIG.orderBtnBy === 'left'; // 是否居左对齐
  return (
    <div className='footer-submit btn-joyride-commit'>
      {isLeft ? (
        <>
          <SubmitBtn loadings={loadings}/>
          {(isCreatePage || enableType === 'myDraft') && (
            <>
              {/* <SaveDraftBtn /> */}
              <CanCelBtn />
            </>
          )}
        </>
      ) : (
        <>
          {(isCreatePage || enableType === 'myDraft') && (
            <>
              <CanCelBtn />
              {/* <SaveDraftBtn /> */}
            </>
          )}

          <SubmitBtn loadings={loadings}/>
        </>
      )}

      {/* <SubmitModal modalVisible={modalVisible} loading={loadings.submit} setModalVisible={setModalVisible} formValue={formValue} assignInfo={assignInfo} doSubmit={doSubmit} /> */}

      <Modal
        title={<><Icon type="warning" theme="filled" /> Alert</>}
        visible={errorData?.visible}
        destroyOnClose
        okText={'Proceed to Submit'}
        cancelText={'Amend Change Category'}
        onCancel={() => {
          setErrorData({ visible: false })
          setShowWarning(false);
          setInputValue('')
        }}
        onOk={handleDbsModalSubmit}
      >
        <div style={{ marginBottom: 16, lineHeight: '18px', }}>The Change Risk (Change Category) for this <strong>{errorData?.workOrderNo}</strong> has been self-assessed as "Low", however, the AI Model has assessed it to be "High" with a Risk Score of(<strong>{Number.parseFloat(errorData?.convertData?.score).toFixed(2)}</strong>). The top 5 contributing factors to this Risk Score are:</div>
        <div style={{ marginBottom: 16 }}>{errorData?.convertData?.explainability_object?.map((i, index) => <div style={{ marginBottom: 4, paddingLeft: 30, lineHeight: '18px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '0' }}>{`${index + 1}.`}</span>
          {i.key}[<strong>{i.value}</strong>]
        </div>)}</div>
        <div style={{ marginBottom: 8, lineHeight: '18px', fontWeight: 500 }}>{`Please provide justification why Change Category 3 (Low Risk) is selected when AI Model recommends High Risk or click on "Amend Change Category":`}</div>
        <Input.TextArea
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            setShowWarning(false)
          }}
          placeholder="Justification why Change Category 3 (Low Risk) is selected when Al Model recommends High Risk"
          maxLength={5800}
        />
        {showWarning &&
        <div style={{ marginBottom: 16, lineHeight: '21px', color: '#FF4724'}}>Please fill in the field 'Justification why Change Category is Low Risk'</div>
        }
      </Modal>

      {/*language=SCSS*/}
      <style jsx>{`
        .footer-submit {
        }
      `}</style>
    </div>
  );
};

export default observer(Submit);
