import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { Form4 as Form, Input, TooltipText} from '@chaoswise/ui'

const CaseId = ({value, onChange, row, disabled, ...props}) => {
    const caseIdWraperRef = useRef(null)
    const textareaRef = useRef(null)
    const [editModeWithStatus, setEditModeWithStatus] = useState(false)
    const handleClick = (e) => {
        if(disabled) return
        setEditModeWithStatus(true)
    }
    const handelChange = (e) => {
        if(editModeWithStatus) setEditModeWithStatus(false)
        onChange(e.target.value.replaceAll('[','').replaceAll(']','')?.trim())
    }
    const handleBlur = (e) => {  
        let trimmedValue = e.target.value?.replaceAll('[','')?.replaceAll(']','')?.trim() || '';
        trimmedValue = [...new Set(trimmedValue
            .replace(/[\r\n]+/g, '')
            .replace(/\s+/, '')
            .split(',')
            .map(item => item.trim())
            .filter(item => item !== '')
            )].join(',');
        onChange(trimmedValue)
        if(editModeWithStatus) setEditModeWithStatus(false)
    }
    useLayoutEffect(() => {
        if(editModeWithStatus && textareaRef.current){
            textareaRef.current.focus()
            const _value = Array.isArray(value) ? value.map(item => item.caseId).join(',') : value            
            textareaRef.current.resizableTextArea.textArea.setSelectionRange(_value.length, _value.length)
        }
    },[editModeWithStatus, textareaRef.current])
    if(Array.isArray(value) && !editModeWithStatus){
        return <div className='caseId_wraper ant-input' ref={caseIdWraperRef} onClick={handleClick}>
            {
                value.map((item, index) => {
                    return <div
                        className={`caseId_item caseId_item_${item.status}`} 
                        key={item.caseId+index+item.status}
                    >
                        <TooltipText width={200}>{`[${item.caseId}]: ${item.showStatus}`}</TooltipText>
                    </div>
                })
            }
            <style>{`
                .caseId_wraper{
                    min-height: 92px;
                    height: auto;
                    .caseId_item{
                        padding: 0 10px;
                        height: 23px;
                        border-radius: 15px;
                        margin-top: 5px;
                        line-height: 23px;
                        display: inline-block;
                    }
                    .caseId_item_FAILD{
                        background: #fbcfd1;
                    }
                    .caseId_item_VALID{
                        background: #abe8c8;
                    }
                }
            `}</style>
        </div>
    }
    return <Input.TextArea 
        ref={textareaRef}
        style={{width: 268}}
        rows="4" 
        placeholder='Please Enter the Case IDs and using "," to separate them. E.g. CaseID1,CaseID2,CaseID3'
        onChange={handelChange}
        disabled={disabled}
        value={Array.isArray(value) ? value.map(item => item.caseId).join(',') : value}
        onBlur={handleBlur}
    >
        
    </Input.TextArea>
}

export default CaseId
