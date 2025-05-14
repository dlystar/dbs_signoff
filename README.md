import React from 'react';
import InputNumber  from '@chaoswise/ui/lib/Antd/InputNumber';
import styles from './style/number.less';

const INumber = (props) => {

    const { value, onChange: _onChange, onBlur, defaultValue, decimalsMount = 0, unit = '', disabled, placeholder, t } = props;
    const { isBusinessPanel } = t || {}; // 表单设计页面为true
    const formatNumber = (val) => {
      // 超大数字，不做处理
      if(String(val)?.includes('e+')) {
        return val
      }
      let result = decimalsMount == 0 ? Number.parseInt(val) + '' : Number.parseFloat(val).toFixed(decimalsMount) + '';
      return result;
    }

    const val = isBusinessPanel ? defaultValue : (value ? formatNumber(value) : value);
    const step = getStep(decimalsMount);

    const handleChangeNumber = (value) => {
      if (value || value === 0) {
          _onChange(formatNumber(value));
          let timer = setTimeout(() => {
            clearTimeout(timer);
            onBlur && onBlur(formatNumber(value))
          }, 1500)  
      } else {
          _onChange(null);
          onBlur && onBlur(null)
      }
    }
  /* 限制数字输入框只能输入整数 */
  const limitNumber = (value) => {
    return value == '' ? '' : (!isNaN(Number(value)) ? value + unit : value.replace?.(/[^\-?\d.]/g, '') + unit)
  }

  return <div className={styles['dynamic-number']}>
      {disabled ? (val === null || val === undefined) ? <div className={styles['readonly-number']}>--</div> : <div className={styles['readonly-number']}>{val}{unit || ''}</div>
        : <InputNumber
            value={val}
            defaultValue={value != null ? value : defaultValue}
            disabled={isBusinessPanel}
            style={{ width: '100%' }}
            onChange={handleChangeNumber}
            placeholder={placeholder}
            formatter={limitNumber}
            parser={value => value.replace(unit, '')}
            precision={Number(decimalsMount)}
            step={step}
        />}
    </div>
}

/**
 * 获取每次改变步数
 * @param {*} decimalsMount 小数数位
 */
const getStep = (decimalsMount) => {
    let step = '1';
    let left = '0';
    let right = '';
    for (let len = 1; len < decimalsMount; len++) {
        right += '0';
    }
    return decimalsMount ? left + '.' + right + step : step
}



export default INumber;
