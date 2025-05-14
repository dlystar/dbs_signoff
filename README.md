import React from 'react';
import styles from './style/number.less';
import { Input, Icon } from '@chaoswise/ui';
import { isNil } from 'lodash-es'
import cls from 'classnames'


const INumber = (props) => {


    const { value, onChange, onBlur, decimalsMount = 0, unit = '', disabled, placeholder, t } = props;
    const { isBusinessPanel } = t || {};


    // 校验输入是否合法（负号、小数点、小数位数）
    const isValidNumber = (val) => {
        if (decimalsMount === 0) {
            // 只允许整数（可负号）
            return /^-?\d*$/.test(val);
        }
        // 允许小数
        const reg = new RegExp(`^-?\\d*(\\.\\d{0,${decimalsMount}})?$`);
        return reg.test(val);
    };


    // 格式化数字，去除前导零，限制小数位数
    const formatNumber = (val) => {
        if (val === '' || val === '-' || val === '.') return val;
        let [int, dec] = val?.split?.('.') || [];
        int = int.replace(/^(-?)0+(\d)/, '$1$2');
        if (decimalsMount === 0) return int;
        if (dec) dec = dec.slice(0, decimalsMount);
        return dec ? `${int}.${dec}` : int;
    };


    // 加/减操作（用decimal.js处理，保证大数和小数都不会变成科学计数法）
    const handleStep = (type) => {
        let currentStr = value;
        if (!isValidNumber(currentStr) || currentStr === '' || currentStr === '-' || currentStr === '.') {
            currentStr = '0';
        }
        let step = decimalsMount === 0 ? '1' : '0.' + '0'.repeat(decimalsMount - 1) + '1';
        let nextStr;

        // 处理加减法，支持负数
        if (type === 'minus') {
            if (currentStr.startsWith('-')) {
                // 负数减1 = 负数加1
                nextStr = '-' + addStr(currentStr.slice(1), step, decimalsMount);
            } else {
                // 比较当前值和步长
                if (compareStr(currentStr, step) >= 0) {
                    // 当前值大于等于步长，直接减
                    nextStr = subStr(currentStr, step, decimalsMount);
                } else {
                    // 当前值小于步长，结果为负
                    nextStr = '-' + subStr(step, currentStr, decimalsMount);
                }
            }
        } else {
            if (currentStr.startsWith('-')) {
                // 负数加1
                if (compareStr(currentStr.slice(1), step) > 0) {
                    // 绝对值大于步长，结果仍为负
                    nextStr = '-' + subStr(currentStr.slice(1), step, decimalsMount);
                } else {
                    // 绝对值小于等于步长，结果为正
                    nextStr = subStr(step, currentStr.slice(1), decimalsMount);
                }
            } else {
                // 正数加1
                nextStr = addStr(currentStr, step, decimalsMount);
            }
        }


        nextStr = formatNumber(nextStr);
        onChange(nextStr);
        onBlur && onBlur(nextStr);
    };


    const handleChangeNumber = (e) => {
        const val = e.target.value;
        if (isValidNumber(val) || val === '') {
            onChange(val);
            // 这个是干什么的呢@alfred.he
            let timer = setTimeout(() => {
                clearTimeout(timer);
                onBlur && onBlur(formatNumber(val))
            }, 1500)
        }
    };


    const handleBlur = () => {
        const formatted = formatNumber(value);
        if (formatted !== value) {
            onChange(formatted);
        }
        onBlur && onBlur(formatted);
    };


    // 只展示字符串，不做 parseFloat，避免科学计数法
    return (
        <div className={styles['dynamic-number']}>
            {disabled ? (
                <div className={styles['readonly-number']}>
                    {isNil(value) || value === '' ? '--' : value + unit}
                </div>
            ) : (
                <div className={cls(styles['number-input-wrapper'], 'ant-input')}>
                    <Input
                        value={value}
                        disabled={isBusinessPanel}
                        style={{ flex: '1' }}
                        onChange={handleChangeNumber}
                        onBlur={handleBlur}
                        suffix={unit}
                        placeholder={placeholder}
                    />
                    <div className={styles['number-btn-group']}>
                        <div
                            className={styles['number-btn']}
                            onClick={() => handleStep('minus')}
                            tabIndex={-1}
                        >
                            <Icon type="down" />
                        </div>
                        <div
                            className={styles['number-btn']}
                            onClick={() => handleStep('plus')}
                            tabIndex={-1}
                        >
                            <Icon type="up" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default INumber;



// 字符串加法，支持大整数和小数
function addStr(a, b, decimalsMount = 0) {
    let [aInt, aDec = ''] = a.split('.');
    let [bInt, bDec = ''] = b.split('.');
    // 补齐小数位
    const maxDecLen = Math.max(aDec.length, bDec.length, decimalsMount);
    aDec = aDec.padEnd(maxDecLen, '0');
    bDec = bDec.padEnd(maxDecLen, '0');
    // 小数部分相加
    let decSum = '';
    let carry = 0;
    for (let i = maxDecLen - 1; i >= 0; i--) {
        let sum = parseInt(aDec[i] || 0) + parseInt(bDec[i] || 0) + carry;
        decSum = (sum % 10) + decSum;
        carry = Math.floor(sum / 10);
    }
    // 整数部分相加
    aInt = aInt || '0';
    bInt = bInt || '0';
    let resInt = '';
    let aArr = aInt.split('').reverse();
    let bArr = bInt.split('').reverse();
    let len = Math.max(aArr.length, bArr.length);
    for (let i = 0; i < len; i++) {
        let sum = parseInt(aArr[i] || 0) + parseInt(bArr[i] || 0) + carry;
        resInt = (sum % 10) + resInt;
        carry = Math.floor(sum / 10);
    }
    if (carry) resInt = carry + resInt;
    // 拼接结果
    decSum = decSum.replace(/0+$/, ''); // 去除小数末尾0
    if (decimalsMount > 0 && decSum.length > decimalsMount) decSum = decSum.slice(0, decimalsMount);
    return decSum ? `${resInt}.${decSum}` : resInt;
}


// 字符串减法，支持大整数和小数（假设a>=b且都为正数）
function subStr(a, b, decimalsMount = 0) {
    let [aInt, aDec = ''] = a.split('.');
    let [bInt, bDec = ''] = b.split('.');
    // 补齐小数位
    const maxDecLen = Math.max(aDec.length, bDec.length, decimalsMount);
    aDec = aDec.padEnd(maxDecLen, '0');
    bDec = bDec.padEnd(maxDecLen, '0');
    // 小数部分相减
    let decRes = '';
    let borrow = 0;
    for (let i = maxDecLen - 1; i >= 0; i--) {
        let diff = parseInt(aDec[i] || 0) - parseInt(bDec[i] || 0) - borrow;
        if (diff < 0) {
            diff += 10;
            borrow = 1;
        } else {
            borrow = 0;
        }
        decRes = diff + decRes;
    }
    // 整数部分相减
    aInt = aInt || '0';
    bInt = bInt || '0';
    let resInt = '';
    let aArr = aInt.split('').reverse();
    let bArr = bInt.split('').reverse();
    let len = Math.max(aArr.length, bArr.length);
    for (let i = 0; i < len; i++) {
        let diff = parseInt(aArr[i] || 0) - parseInt(bArr[i] || 0) - borrow;
        if (diff < 0) {
            diff += 10;
            borrow = 1;
        } else {
            borrow = 0;
        }
        resInt = diff + resInt;
    }
    resInt = resInt.replace(/^0+/, '') || '0';
    decRes = decRes.replace(/0+$/, ''); // 去除小数末尾0
    if (decimalsMount > 0 && decRes.length > decimalsMount) decRes = decRes.slice(0, decimalsMount);
    return decRes ? `${resInt}.${decRes}` : resInt;
}


// 比较两个字符串数字的大小
function compareStr(a, b) {
    // 去掉前导零
    a = a.replace(/^0+/, '') || '0';
    b = b.replace(/^0+/, '') || '0';

    // 先比较整数部分长度
    let [aInt] = a.split('.');
    let [bInt] = b.split('.');
    if (aInt.length !== bInt.length) {
        return aInt.length - bInt.length;
    }

    // 长度相同，逐位比较
    return a.localeCompare(b);
}
