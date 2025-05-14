import {intl} from '@chaoswise/intl';
import React, {useEffect, useMemo, useState} from 'react';
import {codeMapToLabel, EnumBatchBtn} from './../../constant';
import {Button, Checkbox, Input, message, Select} from '@chaoswise/ui';
import {getDictPageList} from '@/services/commonAPI/dataDictionary.js';
import {theme} from '@/theme';
import {batchApproval} from "@/pages/ListNew/api";
import {EnumNodeTypeKey} from "@/pages/WorkOrderCommon/constants";

const {Option} = Select;
const {TextArea} = Input;

const ApprovalForm = ({recond, rejectConfig, modalControl, type, nodeList, batchApproval}) => {

  const [node, setNode] = useState('');
  const [remark, setRemark] = useState('');
  const [reason, setReason] = useState(undefined);
  const [dicData, setDicData] = useState([]);
  const [approvalConfirm, setApprovalConfirm] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false);


  const cancelHandle = () => {
    setRemark('');
    setDicData([]);
    setReason(undefined);
    setApprovalConfirm(false)
    modalControl.close();
  }

  const showRemark = useMemo(() => {
    if (type === 'APPROVE_REJECT' && rejectConfig.requireDescFlag) return true;
    return false;
  }, [rejectConfig, type]);

  const remarkRequire = useMemo(() => {
    return !!rejectConfig?.require;
  }, [rejectConfig, type])

  const handleSubmit = () => {
    if (type === 'APPROVE_REJECT' && remarkRequire && !remark) {
      return message.error(
        intl.get('a4015733-4270-45a1-9e79-350d50835bce').d('请填写驳回说明')
      );
    }
    // 审批拒绝
    if (type === 'APPROVE_REJECT' && !!rejectConfig.requireReason && !reason) {
      return message.error(
        intl.get('c6eebc3b-a0b4-4249-b2c2-65c09913e8cd')
      );
    }
    setConfirmLoading(true)
    batchApproval(
      {
        nodeId: node,
        rejectTo: EnumNodeTypeKey.FIRST_NODE,
        type,
        remark,
        reason,
        selections: recond ? [recond]: [],
        recordAction: true,
        code: type
      },
      () => {
        cancelHandle()
        setConfirmLoading(false)
      },
      () => {
        setConfirmLoading(false)
      }
    );
  };

  useEffect(() => {
    setNode(nodeList?.[0]?.currentNodeId || '');
  }, [nodeList]);

  useEffect(() => {
    if (rejectConfig.defMsg) {
      setRemark(rejectConfig.defMsg);
    } else {
      setRemark('');
    }
    setReason(undefined);
  }, [rejectConfig]);

  useEffect(() => {
    if (rejectConfig.rejectReasonFlag) {
      let target =
        rejectConfig.reasonDictCode?.split('_');
      getDictPageList({
        dictId: target?.[0],
        level: target?.[1],
        pageNum: 1,
        pageSize: 500,
        withDisable: false,
      })
        .then((res) => {
          if (res.code === 100000) {
            setDicData(res?.data?.records || []);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [rejectConfig]);

  return (
    <div className='ApprovalForm'>
      <div>
        {nodeList?.length > 1 && (
          <div className='formItem'>
            <div className='title'>
              <span style={{color: theme.color_red}}>*</span>
              {`${intl
                .get('e0eae357-30b3-4b9c-b356-cfea3b1a532e', {
                  slot0: codeMapToLabel[[`${type}_single_noun`]],
                })
                .d('请选择{slot0}的节点')}`}
              :
            </div>
            <div>
              <Select
                style={{width: '100%'}}
                value={node}
                onChange={(value) => {
                  setNode(value);
                }}
              >
                {(nodeList || []).map((item) => {
                  return (
                    <Option
                      key={item?.currentNodeId}
                      value={`${item?.currentNodeId}`}
                    >
                      {item?.currentNodeName}
                    </Option>
                  );
                })}
              </Select>
            </div>
          </div>
        )}
        {type === 'APPROVE_REJECT' && !!rejectConfig.rejectReasonFlag && (
          <div className='formItem'>
            <div className='title'>
              {!!rejectConfig.requireReason && (
                <span style={{color: theme.color_red}}>*</span>
              )}
              {`${intl
                .get('6a8758b3-9344-46f4-903e-a644b8275978')
                .d('请选择驳回原因').replace('Bulk Rejection', 'rejection')}:`}
            </div>
            <div>
              <Select
                style={{width: '100%'}}
                onChange={(reason) => {
                  setReason(reason);
                }}
                value={reason}
                placeholder={intl
                  .get('c6eebc3b-a0b4-4249-b2c2-65c09913e8cd')
                  .d('请选择驳回原因')}
              >
                {dicData?.map((node) => (
                  <Select.Option key={node.id} value={node.id}>
                    {node.label}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>
        )}
        {showRemark && (
          <div className='formItem'>
            <div className='title'>
              {remarkRequire  && (
                <span style={{color: theme.color_red}}>*</span>
              )}
              {type === EnumBatchBtn.APPROVE_PASS ? `${intl
                .get('4d967305-be0c-443c-9144-4709a9d8bdef', {
                  slot0: codeMapToLabel[`${type}_single_noun`],
                })
                .d('请填写审批意见')}:` : `${intl
                .get('e5b230d9-efcd-47ac-86f2-a6c49a9c8729', {
                  slot0: codeMapToLabel[`${type}_single_noun`],
                })
                .d('请填写拒绝理由')}:`}
            </div>
            <div>
              <TextArea
                style={{width: '100%'}}
                onChange={(e) => {
                  setRemark(e.target.value?.trimStart());
                }}
                value={remark}
                maxLength={225}
              ></TextArea>
            </div>
          </div>
        )}
        <div style={{paddingBottom: '24px'}}>
          <Checkbox onChange={(e) => {
            setApprovalConfirm(e.target.checked)
          }}>{intl.get('9b154869-e68a-46f8-8790-9e151b71d436')}</Checkbox></div>
      </div>
      <div className='approve-footer'>
        <Button
          style={{marginRight: 8, padding: '0 23px'}}
          onClick={cancelHandle}
        >
          Discard
        </Button>
        <Button
          type='primary'
          style={{padding: '0 23px'}}
          disabled={!approvalConfirm}
          onClick={handleSubmit}
          loading={confirmLoading}
        >
          Confirm
        </Button>
      </div>
      <style jsx>{`
        .ApprovalForm {
          .formItem {
            margin-bottom: 24px;
          }
          .title {
            margin-bottom: 3px;
          }
          :global(.ant-modal-confirm .ant-modal-body) {
            padding: 24px;
          }
          :global(
              .ant-modal-confirm-body
                > .anticon
                + .ant-modal-confirm-title
                + .ant-modal-confirm-content
            ) {
            margin-left: 0px;
          }
          :global(.ant-modal-confirm-body > .anticon) {
            display: none;
          }
          .approve-footer {
            width: calc(100% + 48px);
            height: 52px;
            margin-bottom: -24px;

            margin-left: -24px;
            padding: 11px 24px 12px;
            border-top: 1px solid ${theme.border_184};
            text-align: right;
          }
        }
      `}</style>
    </div>
  );
};

export default ApprovalForm;
