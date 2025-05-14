import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@chaoswise/ui';
import styles from './style/textArea.less';
import { helper } from '@/utils/T';

const TextArea = Input.TextArea;

const ITextArea = ({ value, onChange:_onChange=()=>{}, onBlur, placeholder, defaultValue, fieldWidth, t, disabled,isTableItem,...rest }) => {
    const { isBusinessPanel } = t || {}; // 表单设计页面为true
    const { fieldCode } = rest || {}; // 获取字段属性编码
    const val = isBusinessPanel ? defaultValue : value; // 保留原有逻辑
    // 使用useRef存储防抖函数，避免每次渲染都创建新的防抖函数
    const debouncedOnChangeRef = useRef(
      helper.debounce((value) => {
        _onChange(value);
      }, 500)
    );
    // 本地状态，用于控制输入框的显示值
    const [localValue, setLocalValue] = useState(val || '');
    // 当外部value或defaultValue变化且与本地值不同时更新本地值
    useEffect(() => {
        const newVal = isBusinessPanel ? defaultValue : value;
        if (newVal !== undefined && newVal !== localValue) {
            setLocalValue(newVal || '');
        }
    }, [value, defaultValue, isBusinessPanel]);

    const handleBlur = (value) => {
        // 确保value是字符串类型
        const stringValue = value ? String(value) : '';
        const trimmedValue = stringValue.trim();
        // 如果字段的属性编码为DroneTicket时，格式化：按逗号分割，去除空值和重复值，重新组合
        const formattedValue = ['DroneTicket', 'CyberArk_Object'].includes(fieldCode) ? [...new Set(trimmedValue
            .replace(/[\r\n]+/g, '')
            .replace(/\s+/g, '')
            .split(',')
            .map(item => item.trim())
            .filter(item => item !== '')
            )].join(',') : trimmedValue;

        setLocalValue(formattedValue);
        onBlur && onBlur(formattedValue);
        _onChange && _onChange(formattedValue);
    }

    const handleChange = (value) => {
        // 立即更新本地状态，保持输入流畅
        setLocalValue(value);
        // 延迟触发onChange事件
        debouncedOnChangeRef.current(value);
    }

    return (
        <div className={styles['dynamic-textArea']}>
            {disabled?
            <div className={styles['readonly-textArea']}>
                { val ? <TextArea value={val} disabled autoSize={true}/> : <span className={styles['readonly-no-val']}>--</span> }
            </div>
            :<TextArea
                placeholder={placeholder}
                value={localValue}
                onBlur={e => handleBlur(e.target.value)}
                onChange={e => handleChange(e.target.value)}
                disabled={isBusinessPanel}
                autoSize={{ minRows: 3 }}
            />}
    </div>
    )

}

export default ITextArea;
