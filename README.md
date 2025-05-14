// 导入必要的依赖
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DatePicker, Icon } from '@chaoswise/ui';
import moment from 'moment';
import {
  EnumDateFormatType,
  EnumDateFormatRule,
  EnumDateFormatRuleSimple
} from '../../../constants';
import styles from './style/date.less';
import { checkType } from '@/utils/T';
import { EnumDateRange } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/constants';
import { obtainCurrentLanguageState } from '@/utils/T/core/helper';
import { queryRangePieces } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/api/formSet.js';
import { getDateRangePieces, validateDateRange } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/api'


// 生成一个数字范围数组，用于生成时间范围
const _range = (start, end) => {
  if (
    [undefined, null, ''].includes(start) ||
    [undefined, null, ''].includes(end)
  )
    return [];
  const timeRange = [];
  for (let i = start; i <= end - 1; i++) {
    timeRange.push(i);
  }
  return timeRange;
};


// 日期范围选择器组件
const IDate = ({
  value: _value, // 当前值
  onChange: _onChange = () => { }, // 值变化回调
  dateFormat, // 日期格式
  disabled, // 是否禁用
  placeholder, // 占位符
  onBlur, // 失去焦点回调
  suffixIcon, // 后缀图标
  isTableItem, // 是否在表格中
  t, // 表单上下文
  dateRange, // 日期范围限制
  fieldCode, // 字段编码
  serviceTimeIds, // 服务时间ID
  timeSelectRangeType = "ONLY_RANGE", // 时间选择范围类型
  rangeType = 'CUSTOM', // 范围类型
  extendSetting, // 扩展设置
}) => {
  // 当值为0且为数字类型时，重置为null
  useEffect(() => {
    if (value === 0 && checkType.isNumber(value)) {
      _onChange(null);
      onBlur(null);
    }
  }, [value]);


  const [open, setOpen] = useState(false); // 控制日期选择器弹出框的显示状态
  const mostValuesRef = useRef({ min: undefined, max: undefined }); // 存储最小和最大值的引用
  const [serviceTimeRange, setServiceTimeRange] = useState(null); // 服务时间范围
  const useExtend = rangeType === 'EXTEND' && (extendSetting && Array.isArray(extendSetting) && extendSetting.length > 0) // 是否使用扩展
  let _timeSelectRangeType = timeSelectRangeType
  if (useExtend) _timeSelectRangeType = 'ONLY_RANGE_OUT'
  const modelRef = useRef('start') // 当前选择的日期部分（开始/结束）
  const [rangeValue, setRangeValue] = useState(value) // 当前选择的日期范围值


  // 获取服务时间范围
  useEffect(() => {
    if (isBusinessPanel) return
    if (rangeType === 'SERVICETIME') {
      if (
        _timeSelectRangeType &&
        _timeSelectRangeType !== 'ANY' &&
        serviceTimeIds &&
        serviceTimeIds?.length
      ) {
        queryRangePieces(serviceTimeIds).then(res => {
          if (res.code === 100000) {
            setServiceTimeRange(res.data);
          }
        });
      }
    }
  }, [_timeSelectRangeType, serviceTimeIds, rangeType]);


  // 处理日期值转换
  const handelVal = (val) => {
    const _dateString = val
      ? [
        EnumDateFormatType.yearMonthDayHoursMinutes,
        EnumDateFormatType.all
      ].includes(dateFormat) &&
        dateFormat === EnumDateFormatType.yearMonthDayHoursMinutes
        ? val.format('YYYY-MM-DD HH:mm')
        : val.format('YYYY-MM-DD HH:mm:ss')
      : val;
    const _val = moment(_dateString).valueOf();
    const timeStamp = val
      ? dateFormat === EnumDateFormatType.yearMonthDay
        ? val.startOf('day').valueOf()
        : _val
      : null;
    return timeStamp
  }


  // 处理日期范围变化
  const handleChange = val => {
    const [start, end] = val || [null, null]
    let value = { startDate: handelVal(start), endDate: handelVal(end) }
    let _val = [start, end]
    if (value.startDate > value.endDate) {
      value = { startDate: handelVal(end), endDate: handelVal(start) }
      _val = [end, start]
    }
    setRangeValue(_val)
    _onChange(value);
    onBlur && onBlur(value);
    // 如果使用扩展，验证日期范围
    if (useExtend) {
      if (val) {
        t.actions.getFormState(state => {
          const formData = { ...(state.values || {}), ...(t.baseActions.getBaseValue() || {}) }
          validateDateRange({
            formId: t.orderInfo.formId,
            formData,
            fieldCode,
            extendClassId: extendSetting[0].id,
          }).then(res => {
            if (!res.data) return
            if (res.data.correct === true) {
              // 验证成功，显示成功提示
              t.actions.setFieldState(fieldCode, state => {
                state.errors = []
                const successHint = {
                  hintType: 'custom',
                  hintContent: `<span style="color: #72c240;"}>${res.data.message}</span>`
                }
                if (state.props['x-props'].fieldHint && Array.isArray(state.props['x-props'].fieldHint)) {
                  const hint4Index = state.props['x-props'].fieldHint.findIndex(i => i.hintType === 'custom')
                  if (hint4Index > -1) {
                    state.props['x-props'].fieldHint[hint4Index] = successHint
                  } else {
                    state.props['x-props'].fieldHint.push(successHint)
                  }
                }
              })
            } else {
              // 验证失败，显示错误信息
              t.actions.setFieldState(fieldCode, state => {
                state.errors = [res.data.message]
                if (state.props['x-props'].fieldHint && Array.isArray(state.props['x-props'].fieldHint)) {
                  const hint4Index = state.props['x-props'].fieldHint.findIndex(i => i.hintType === 'custom')
                  if (hint4Index > -1) {
                    state.props['x-props'].fieldHint.splice(hint4Index, 1)
                  }
                }
              })
            }
          })
        })
      } else {
        // 清除自定义提示
        t.actions.setFieldState(fieldCode, state => {
          if (state.props['x-props'].fieldHint && Array.isArray(state.props['x-props'].fieldHint)) {
            const hint4Index = state.props['x-props'].fieldHint.findIndex(i => i.hintType === 'custom')
            if (hint4Index > -1) {
              state.props['x-props'].fieldHint.splice(hint4Index, 1)
            }
          }
        })
      }
    }
  };


  const { isBusinessPanel, getPopupContainer, formLayout } = t || {};
  const _suffixIcon = suffixIcon || <Icon type="calendar" />;
  // 设置日期格式
  let _dateFormat =
    EnumDateFormatType.yearMonthDay === dateFormat
      ? EnumDateFormatRule.yearMonthDay
      : EnumDateFormatType.yearMonthDayHoursMinutes === dateFormat
        ? EnumDateFormatRule.yearMonthDayHoursMinutes
        : EnumDateFormatRule.all;


  let _formState;
  t?.actions?.getFormState()?.then(res => {
    _formState = res;
  });


  // 禁用日期处理函数
  const disabledDate = useCallback(
    current => {
      // !custom logic
      if (fieldCode === 'ChangeSchedule_StartEndTime') {
        // 检查是否在禁用时间段内
        const currentStartOfDay = current.clone().startOf('day').valueOf();
        const currentEndOfDay = current.clone().endOf('day').valueOf();


        // 检查当前日期是否全天禁用
        const isFullDayDisabled = serviceTimeRange?.some(piece => {
          // 如果是完全禁用的日期（begin === end）
          if (piece.begin === piece.end) {
            const pieceDay = moment(piece.begin).startOf('day').valueOf();
            return currentStartOfDay === pieceDay;
          }


          // 如果是区间类型的限制
          const pieceBeginMoment = moment(piece.begin);
          const pieceEndMoment = moment(piece.end);


          // 检查是否整天都在禁用区间内
          // 情况1: 当begin是当天00:00:00，end是当天23:59:00或23:59:59时，整天禁用
          if (pieceBeginMoment.isSame(current, 'day') && pieceEndMoment.isSame(current, 'day')) {
            const isBeginStartOfDay = pieceBeginMoment.hours() === 0 &&
              pieceBeginMoment.minutes() === 0 &&
              pieceBeginMoment.seconds() === 0;


            const isEndEndOfDay = (pieceEndMoment.hours() === 23 &&
              pieceEndMoment.minutes() === 59 &&
              (pieceEndMoment.seconds() === 0 || pieceEndMoment.seconds() === 59));


            if (isBeginStartOfDay && isEndEndOfDay) {
              return true;
            }
          }


          // 情况2: 当前日期在begin和end之间的整天（不是begin所在天也不是end所在天）
          if (pieceBeginMoment.isBefore(current, 'day') && pieceEndMoment.isAfter(current, 'day')) {
            return true;
          }


          // 如果当前日期在begin之前，且begin不是0，则不禁用
          if (currentEndOfDay < pieceBeginMoment.valueOf() && piece.begin !== 0) {
            return false;
          }


          // 如果begin是0，则禁用end之前的所有日期，但要特别处理end所在的日期
          if (piece.begin === 0) {
            // 如果当前日期早于end所在的日期，整天禁用
            if (current.isBefore(pieceEndMoment, 'day')) {
              return true;
            }


            // 如果是end所在的日期，需要检查是否还有可用时间
            if (current.isSame(pieceEndMoment, 'day')) {
              // 如果end时间接近一天结束，例如23:58以后，才禁用整天
              // 这里我们认为23:58以前的时间都不可用时，禁用整天
              const remainingTime = 24 * 60 - (pieceEndMoment.hours() * 60 + pieceEndMoment.minutes());
              return remainingTime <= 1; // 如果可用时间少于等于1分钟，禁用整天
            }


            return false;
          }


          // 如果是begin所在的天，检查剩余可用时间
          if (pieceBeginMoment.isSame(current, 'day')) {
            // 如果是23:59之后可用，基本上相当于全天禁用
            return pieceBeginMoment.hour() >= 23 && pieceBeginMoment.minute() >= 59;
          }


          // 如果是end所在的天，检查之前可用时间
          if (pieceEndMoment.isSame(current, 'day')) {
            // 如果是00:01之前可用，基本上相当于全天禁用
            return pieceEndMoment.hour() === 0 && pieceEndMoment.minute() <= 1;
          }


          return false;
        });


        if (isFullDayDisabled) {
          return true;
        }


        // 今天之前的日期都不能选
        if (current < moment().startOf('day')) {
          return true;
        }


        // 如果是选择开始时间
        if (modelRef.current === 'start') {
          // 如果已经选择了结束时间，开始时间不能早于结束时间7天前
          if (rangeValue?.[1]) {
            const endDate = moment(rangeValue[1]);
            if (current < endDate.clone().subtract(6, 'days').startOf('day')) {
              return true;
            }
          }
        }
        // 如果是选择结束时间
        if (modelRef.current === 'end') {
          // 如果已经选择了开始时间，结束时间不能超过开始时间7天后
          if (rangeValue?.[0]) {
            const startDate = moment(rangeValue[0]);
            if (current > startDate.clone().add(6, 'days').endOf('day')) {
              return true;
            }
          }
        }
        return false;
      }


      console.log(current, rangeType, serviceTimeRange, _timeSelectRangeType, "current")
      if (_timeSelectRangeType === 'ANY') return false;
      if (rangeType === 'CUSTOM') {
        if (dateRange) {
          const { dateMaxLimit, dateMinLimit } = dateRange;
          const _dateRange = [];
          // 处理最小日期限制
          if (dateMinLimit) {
            const { addon, key, days, id } = dateMinLimit;
            if (addon === 'before') {
              if (key === 'today_before') {
                const _startDate = moment().subtract(days, 'day');
                _dateRange[0] = _startDate.startOf('day');
              }
            } else if (!addon && key === 'today') {
              const _startDate = moment();
              _dateRange[0] = _startDate.startOf('day');
            } else if (addon === 'after') {
              if (key === 'today_after') {
                const _startDate = moment().add(days, 'day');
                _dateRange[0] = _startDate.startOf('day');
              }
            } else if (addon === EnumDateRange.thisWeek) {
              if (key === EnumDateRange.thisWeek) {
                if (obtainCurrentLanguageState() === 'en') {
                  _dateRange[0] = moment()
                    .startOf('week')
                    .add(1, 'day');
                } else {
                  _dateRange[
                    _timeSelectRangeType === 'ONLY_RANGE' ? 0 : 1
                  ] = moment().startOf('week');
                }
              }
            } else if (addon === EnumDateRange.thisMonth) {
              if (key === EnumDateRange.thisMonth) {
                _dateRange[0] = moment().startOf('month');
              }
            } else if (addon === EnumDateRange.thisYear) {
              if (key === EnumDateRange.thisYear) {
                _dateRange[0] = moment().startOf('year');
              }
            } else {
              if (!addon) {
                // 自定义时间
                if (key === 'defined' && dateMinLimit?.defined) {
                  _dateRange[0] = moment(mostValuesRef.current.min).startOf('day');
                } else {
                  let _startDate = mostValuesRef.current.min;
                  if (_startDate) {
                    _dateRange[0] = moment(_startDate).startOf('day');
                  }
                }
              }
            }
          }
          // 处理最大日期限制
          if (dateMaxLimit) {
            const { addon, key, days, id } = dateMaxLimit;
            if (addon === 'before') {
              if (key === 'today_before') {
                const _endDate = moment().subtract(days, 'day');
                _dateRange[1] = _endDate.endOf('day');
              }
            } else if (!addon && key === 'today') {
              const _endDate = moment();
              _dateRange[1] = _endDate.endOf('day');
            } else if (addon === 'after') {
              if (key === 'today_after') {
                const _endDate = moment().add(days, 'day');
                _dateRange[1] = _endDate.endOf('day');
              }
            } else if (addon === EnumDateRange.thisWeek) {
              if (key === EnumDateRange.thisWeek) {
                if (obtainCurrentLanguageState() === 'en') {
                  _dateRange[1] = moment()
                    .endOf('week')
                    .add(1, 'day');
                } else {
                  _dateRange[1] = moment().endOf('week');
                }
              }
            } else if (addon === EnumDateRange.thisMonth) {
              if (key === EnumDateRange.thisMonth) {
                _dateRange[1] = moment().endOf('month');
              }
            } else if (addon === EnumDateRange.thisYear) {
              if (key === EnumDateRange.thisYear) {
                _dateRange[1] = moment().endOf('year');
              }
            } else {
              if (!addon) {
                // 自定义时间
                if (key === EnumDateRange.defined && dateMaxLimit?.defined) {
                  _dateRange[1] = moment(mostValuesRef.current.max).endOf('day');
                } else {
                  let _endDate = mostValuesRef.current.max;
                  if (_endDate) {
                    _dateRange[1] = moment(_endDate).endOf('day');
                  }
                }
              }
            }
          }
          // 根据日期范围判断是否禁用
          if (_dateRange[0] && !_dateRange[1]) {
            return current < _dateRange[0];
          } else if (_dateRange[1] && !_dateRange[0]) {
            return current > _dateRange[1];
          } else if (_dateRange[0] && _dateRange[1]) {
            return !(current >= _dateRange[0] && current <= _dateRange[1])
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        if (serviceTimeRange && serviceTimeRange?.length) {
          const _dateRanges = serviceTimeRange.map(i => ({
            begin: moment(i.begin),
            end: moment(i.end)
          }));
          if (_timeSelectRangeType === 'ONLY_RANGE') {
            return !_dateRanges.some(
              i =>
                i.begin.startOf('day') <= current &&
                i.end.endOf('day') >= current
            );
          } else {
            let result = calcServiceTime(serviceTimeRange, current);
            if (result) {
              return result.disabledHours().length === 24;
            }
            return false;
          }
        } else {
          return false;
        }
      }
    },
    [rangeType, serviceTimeRange, _timeSelectRangeType, rangeValue, modelRef.current]
  );


  // 检查两个日期时间是否相同
  const isValidSameDateTime = (current, target, type = 'date') => {
    const _format = type === 'date' ? 'YYYY-MM-DD' : 'HH:mm:ss';
    const currentDate = current.format(_format);
    const targetDate = target.format(_format);
    if (['hours', 'minutes', 'seconds'].includes(type)) {
      const _currentTimeArr = currentDate.split(':');
      const _targetimeArr = targetDate.split(':');
      switch (type) {
        case 'hours':
          return _currentTimeArr[0] === _targetimeArr[0];
        case 'minutes':
          return _currentTimeArr[1] === _targetimeArr[1];
        case 'seconds':
          return _currentTimeArr[2] === _targetimeArr[2];
      }
    } else {
      return currentDate === targetDate;
    }
  };


  // 计算服务时间
  const calcServiceTime = (serviceTimeRangeTemp, date) => {
    const totalHours = _range(0, 24);
    const totalMinutes = _range(0, 60);
    const totalSeconds = _range(0, 60);
    const tempDate = moment(date);
    const _dateRanges = serviceTimeRangeTemp.map(i => ({
      begin: moment(i.begin),
      end: moment(i.end)
    }));
    // 过滤出同一天的时间范围
    const sameDateRanges = _dateRanges
      .filter(i => {
        const isValid =
          moment(i.begin).startOf('day') <= moment(tempDate).startOf('day') &&
          moment(i.end).endOf('day') >= moment(tempDate).endOf('day');
        return isValid;
      })
      .map(i => {
        let beginTmp = moment(i.begin);
        let endTmp = moment(i.end);
        if (moment(i.end).endOf('day') > moment(tempDate).endOf('day')) {
          endTmp = moment(tempDate).endOf('day');
        }


        if (moment(i.begin).startOf('day') < moment(tempDate).startOf('day')) {
          beginTmp = moment(tempDate).startOf('day');
        }


        return {
          begin: beginTmp,
          end: endTmp
        };
      });
    if (sameDateRanges && sameDateRanges.length !== 0) {
      let hours = [];
      // 计算可用的小时范围
      if (_timeSelectRangeType === 'ONLY_RANGE_OUT') {
        for (let index = 0; index < sameDateRanges.length; index++) {
          const sameDateRangeItem = sameDateRanges[index];
          if (index === 0 && sameDateRangeItem.begin.hours() !== 0) {
            hours = hours.concat(
              _range(
                moment(sameDateRangeItem.begin)
                  .startOf('day')
                  .hours(),
                moment(sameDateRangeItem.begin)
                  .subtract(1, 'seconds')
                  .hours() + 1
              )
            );
          }
          if (index != sameDateRanges.length - 1) {
            hours = hours.concat(
              _range(
                moment(sameDateRangeItem.end).add(1, 'seconds').hours(),
                moment(sameDateRanges[index + 1].begin)
                  .subtract(1, 'seconds')
                  .hours() + 1
              )
            );
          } else if (
            sameDateRangeItem.end.format('HH:mm:ss') != '23:59:59'
          ) {
            hours = hours.concat(
              _range(
                moment(sameDateRangeItem.end).hours(),
                moment(sameDateRangeItem.end)
                  .endOf('day')
                  .hours() + 1
              )
            );
          }
        }
      } else {
        for (let index = 0; index < sameDateRanges.length; index++) {
          const sameDateRangeItem = sameDateRanges[index];
          hours = hours.concat(
            _range(
              moment(sameDateRangeItem.begin)
                .hours(),
              moment(sameDateRangeItem.end)
                .hours() + 1
            )
          );
        }
      }
      return {
        // 返回禁用的小时
        disabledHours: () => {
          return totalHours.filter(i => !hours.includes(i));
        },
        // 返回禁用的分钟
        disabledMinutes: selectedHour => {
          if (selectedHour === -1) {
            return [];
          }
          let sameHourRanges = sameDateRanges
            .filter(i => {
              return (
                moment(i.begin).startOf('hour') <=
                moment(tempDate).hours(selectedHour).startOf('hour') &&
                moment(i.end).endOf('hour') >= moment(tempDate).hours(selectedHour).endOf('hour')
              );
            })
            .map(i => {
              let beginTmp = moment(i.begin);
              let endTmp = moment(i.end);
              if (moment(i.end).endOf('hour') > moment(tempDate).hours(selectedHour).endOf('hour')) {
                endTmp = moment(tempDate).hours(selectedHour).endOf('hour');
              }


              if (moment(i.begin).startOf('hour') < moment(tempDate).hours(selectedHour).startOf('hour')) {
                beginTmp = moment(tempDate).hours(selectedHour).startOf('hour');
              }
              return {
                begin: beginTmp,
                end: endTmp
              };
            });
          if (sameHourRanges && sameHourRanges.length !== 0) {
            if (
              sameHourRanges[0].begin.hours() !== selectedHour
            ) {
              sameHourRanges[0].begin = moment(tempDate).hours(selectedHour).startOf('hour');
            }
            if (
              sameHourRanges[sameHourRanges.length - 1].end.hours() !== selectedHour
            ) {
              sameHourRanges[sameHourRanges.length - 1].end = moment(
                tempDate
              ).hours(selectedHour).endOf('hour');
            }


            let minutes = [];
            if (_timeSelectRangeType === 'ONLY_RANGE_OUT') {
              for (let index = 0; index < sameHourRanges.length; index++) {
                const sameHourRangeItem = sameHourRanges[index];
                if (index === 0 && sameHourRangeItem.begin.minutes() !== 0) {
                  minutes = minutes.concat(
                    _range(
                      moment(sameHourRangeItem.begin)
                        .startOf('hour')
                        .minutes(),
                      moment(sameHourRangeItem.begin)
                        .subtract(1, 'seconds')
                        .minutes() + 1
                    )
                  );
                }
                if (index != sameHourRanges.length - 1) {
                  minutes = minutes.concat(
                    _range(
                      moment(sameHourRangeItem.end).add(1, 'seconds').minutes(),
                      moment(sameHourRanges[index + 1].begin)
                        .subtract(1, 'seconds')
                        .minutes() + 1
                    )
                  );
                } else if (
                  sameHourRangeItem.end.seconds() !== 59
                ) {
                  minutes = minutes.concat(
                    _range(
                      moment(sameHourRangeItem.end).minutes(),
                      moment(sameHourRangeItem.end)
                        .endOf('hour')
                        .minutes() + 1
                    )
                  );


                }
              }


            } else {
              for (let index = 0; index < sameHourRanges.length; index++) {
                const sameHourRangeItem = sameHourRanges[index];
                minutes = minutes.concat(
                  _range(
                    moment(sameHourRangeItem.begin)
                      .minutes(),
                    moment(sameHourRangeItem.end)
                      .minutes() + 1
                  )
                );
              }
            }
            return totalMinutes.filter(i => !minutes.includes(i));
          }
          return [];
        },
        // 返回禁用的秒数
        disabledSeconds: (selectedHour, selectedMinute) => {
          if (selectedHour == -1 || selectedMinute == -1) {
            return [];
          }
          let sameHourRanges = sameDateRanges
            .filter(i => {
              return (
                moment(i.begin).startOf('hour') <=
                moment(tempDate).hours(selectedHour).startOf('hour') &&
                moment(i.end).endOf('hour') >= moment(tempDate).hours(selectedHour).endOf('hour')
              );
            })
            .map(i => {
              let beginTmp = moment(i.begin);
              let endTmp = moment(i.end);
              if (moment(i.end).endOf('hour') > moment(tempDate).hours(selectedHour).endOf('hour')) {
                endTmp = moment(tempDate).hours(selectedHour).endOf('hour');
              }


              if (moment(i.begin).startOf('hour') < moment(tempDate).hours(selectedHour).startOf('hour')) {
                beginTmp = moment(tempDate).hours(selectedHour).startOf('hour');
              }


              return {
                begin: beginTmp,
                end: endTmp
              };
            });
          let sameMinuteRanges = sameHourRanges
            .filter(i => {
              return (
                moment(i.begin).startOf('minute') <=
                moment(tempDate).startOf('minute') &&
                moment(i.end).endOf('minute') >=
                moment(tempDate).endOf('minute')
              );
            })
            .map(i => {
              return {
                begin: moment(i.begin),
                end: moment(i.end)
              };
            });


          if (sameMinuteRanges && sameMinuteRanges.length !== 0) {
            if (
              !isValidSameDateTime(
                tempDate,
                sameMinuteRanges[0].begin,
                'minutes'
              )
            ) {
              sameMinuteRanges[0].begin = moment(tempDate).startOf('minute');
            }
            if (
              !isValidSameDateTime(
                tempDate,
                sameMinuteRanges[sameMinuteRanges.length - 1].end,
                'minutes'
              )
            ) {
              sameMinuteRanges[sameMinuteRanges.length - 1].end = moment(
                tempDate
              ).endOf('minute');
            }
            let seconds = [];
            sameMinuteRanges.map(i => {
              let min = moment(i.begin).seconds();
              let max = moment(i.end).seconds();
              seconds = seconds.concat(_range(min, max + 1));
            });
            if (_timeSelectRangeType === 'ONLY_RANGE') {
              return totalSeconds.filter(i => !seconds.includes(i));
            } else {
              return totalSeconds.filter(i => seconds.includes(i));
            }
          }
          return [];
        }
      };
    }
  };


  // 处理时间禁用
  const _disabledTime = useCallback(
    (date, partical) => {
      if (partical) modelRef.current = partical;
      if (fieldCode === 'ChangeSchedule_StartEndTime' && date) {
        // 查找与当前日期相关的禁用时间段
        const disabledRanges = [];


        serviceTimeRange?.forEach(piece => {
          // 跳过完全禁用的日期（已在disabledDate中处理）
          if (piece.begin === piece.end) {
            return;
          }


          const pieceBeginMoment = moment(piece.begin);
          const pieceEndMoment = moment(piece.end);


          // 检查是否整天都在禁用区间内 - 跳过整天禁用的情况，已在disabledDate中处理
          // 情况1: 当前日期在begin和end之间的整天（不是begin所在天也不是end所在天）
          if (pieceBeginMoment.isBefore(date, 'day') && pieceEndMoment.isAfter(date, 'day')) {
            return; // 整天都禁用，在disabledDate已处理
          }


          // 情况2: 当begin是当天00:00:00，end是当天23:59:00或23:59:59时，整天禁用
          if (pieceBeginMoment.isSame(date, 'day') && pieceEndMoment.isSame(date, 'day')) {
            const isBeginStartOfDay = pieceBeginMoment.hours() === 0 &&
              pieceBeginMoment.minutes() === 0 &&
              pieceBeginMoment.seconds() === 0;


            const isEndEndOfDay = (pieceEndMoment.hours() === 23 &&
              pieceEndMoment.minutes() === 59 &&
              (pieceEndMoment.seconds() === 0 || pieceEndMoment.seconds() === 59));


            if (isBeginStartOfDay && isEndEndOfDay) {
              return; // 整天禁用，在disabledDate已处理
            }
          }


          // 处理begin是0的特殊情况
          if (piece.begin === 0) {
            // 如果当前日期是end所在的日期
            if (date.isSame(pieceEndMoment, 'day')) {
              disabledRanges.push({
                begin: date.clone().startOf('day'),
                end: pieceEndMoment
              });
            }
            // 如果当前日期在end日期之前，应该已经在disabledDate中被整天禁用，这里跳过
            else if (date.isBefore(pieceEndMoment, 'day')) {
              return;
            }
            // 如果当前日期在end日期之后，没有禁用
            return;
          }


          // 如果当前日期是begin所在的日期
          if (pieceBeginMoment.isSame(date, 'day')) {
            // 结束时间是当天结束或者是piece的结束时间
            const endTime = pieceEndMoment.isSame(date, 'day') ?
              pieceEndMoment :
              date.clone().endOf('day');


            disabledRanges.push({
              begin: pieceBeginMoment,
              end: endTime
            });
          }
          // 如果当前日期是end所在的日期
          else if (pieceEndMoment.isSame(date, 'day')) {
            // 开始时间是当天开始
            disabledRanges.push({
              begin: date.clone().startOf('day'),
              end: pieceEndMoment
            });
          }
        });


        // 如果有禁用时间段
        if (disabledRanges.length > 0) {
          // 检查是否整天都被禁用
          const isFullDayDisabled = disabledRanges.some(range => {
            const isBeginStartOfDay = range.begin.hours() === 0 &&
              range.begin.minutes() === 0 &&
              range.begin.seconds() === 0;


            const isEndEndOfDay = (range.end.hours() === 23 &&
              range.end.minutes() === 59 &&
              (range.end.seconds() === 0 || range.end.seconds() === 59));


            return isBeginStartOfDay && isEndEndOfDay;
          });


          if (isFullDayDisabled) {
            return {
              disabledHours: () => Array.from({ length: 24 }, (_, i) => i),
              disabledMinutes: () => Array.from({ length: 60 }, (_, i) => i),
              disabledSeconds: () => Array.from({ length: 60 }, (_, i) => i)
            };
          }


          return {
            // 禁用小时
            disabledHours: () => {
              const disabledHours = new Set();


              disabledRanges.forEach(range => {
                const beginHour = range.begin.hours();
                const endHour = range.end.hours();
                const beginMinute = range.begin.minutes();
                const endMinute = range.end.minutes();


                // 禁用范围内的所有小时
                for (let h = beginHour; h <= endHour; h++) {
                  // 对于开始小时，只有当beginMinute为0时才完全禁用
                  if (h === beginHour && beginMinute > 0) {
                    continue;
                  }


                  // 对于结束小时，只有当endMinute为59时才完全禁用
                  if (h === endHour && endMinute < 59) {
                    continue;
                  }


                  disabledHours.add(h);
                }
              });


              return Array.from(disabledHours);
            },
            // 禁用分钟
            disabledMinutes: (hour) => {
              if (hour === undefined) return [];
              const disabledMinutes = new Set();


              disabledRanges.forEach(range => {
                const beginHour = range.begin.hours();
                const endHour = range.end.hours();
                const beginMinute = range.begin.minutes();
                const endMinute = range.end.minutes();


                // 如果小时在禁用范围中间，所有分钟都禁用
                if (hour > beginHour && hour < endHour) {
                  for (let m = 0; m < 60; m++) {
                    disabledMinutes.add(m);
                  }
                }
                // 如果是开始小时，从beginMinute开始禁用
                else if (hour === beginHour) {
                  for (let m = beginMinute; m < 60; m++) {
                    disabledMinutes.add(m);
                  }
                }
                // 如果是结束小时，禁用到endMinute
                else if (hour === endHour) {
                  for (let m = 0; m <= endMinute; m++) {
                    disabledMinutes.add(m);
                  }
                }
              });


              return Array.from(disabledMinutes);
            },
            // 禁用秒
            disabledSeconds: (hour, minute) => {
              if (hour === undefined || minute === undefined) return [];
              const disabledSeconds = new Set();


              disabledRanges.forEach(range => {
                const beginHour = range.begin.hours();
                const endHour = range.end.hours();
                const beginMinute = range.begin.minutes();
                const endMinute = range.end.minutes();
                const beginSecond = range.begin.seconds();
                const endSecond = range.end.seconds();


                // 如果小时和分钟都在禁用范围中间，所有秒都禁用
                if ((hour > beginHour && hour < endHour) ||
                  (hour === beginHour && minute > beginMinute) ||
                  (hour === endHour && minute < endMinute)) {
                  for (let s = 0; s < 60; s++) {
                    disabledSeconds.add(s);
                  }
                }
                // 如果是开始小时和分钟，从beginSecond开始禁用
                else if (hour === beginHour && minute === beginMinute) {
                  for (let s = beginSecond; s < 60; s++) {
                    disabledSeconds.add(s);
                  }
                }
                // 如果是结束小时和分钟，禁用到endSecond
                else if (hour === endHour && minute === endMinute) {
                  for (let s = 0; s <= endSecond; s++) {
                    disabledSeconds.add(s);
                  }
                }
              });


              return Array.from(disabledSeconds);
            }
          };
        }


        // 如果是选择结束时间，且已选择了开始时间
        if (modelRef.current === 'end' && rangeValue?.[0]) {
          const startDate = moment(rangeValue[0]);
          const isLastDay = date.isSame(startDate.clone().add(6, 'days'), 'day');
          const isSameDay = date.isSame(startDate, 'day');


          return {
            disabledHours: () => {
              let disabledHours = new Set();


              // 如果是第7天，限制时间不能超过开始时间对应的时分秒
              if (isLastDay) {
                const startHour = startDate.hours();
                for (let h = startHour + 1; h <= 23; h++) {
                  disabledHours.add(h);
                }
              }
              // 如果是同一天，限制时间必须在开始时间之后
              if (isSameDay) {
                const startHour = startDate.hours();
                for (let h = 0; h < startHour; h++) {
                  disabledHours.add(h);
                }
              }


              return Array.from(disabledHours);
            },
            disabledMinutes: (hour) => {
              let disabledMinutes = new Set();


              // 如果是第7天且小时相同，限制分钟不能超过开始时间的分钟
              if (isLastDay && hour === startDate.hours()) {
                const startMinute = startDate.minutes();
                for (let m = startMinute + 1; m < 60; m++) {
                  disabledMinutes.add(m);
                }
              }
              // 如果是同一天
              if (isSameDay) {
                const startHour = startDate.hours();
                const startMinute = startDate.minutes();
                // 如果是开始时间之前的小时，禁用所有分钟
                if (hour < startHour) {
                  return Array.from({ length: 60 }, (_, i) => i);
                }
                // 如果是开始时间的小时，禁用小于等于开始时间分钟的所有分钟
                if (hour === startHour) {
                  for (let m = 0; m <= startMinute; m++) {
                    disabledMinutes.add(m);
                  }
                }
              }


              return Array.from(disabledMinutes);
            },
            disabledSeconds: (hour, minute) => {
              let disabledSeconds = new Set();


              // 如果是第7天且时分相同，限制秒不能超过开始时间的秒
              if (
                isLastDay &&
                hour === startDate.hours() &&
                minute === startDate.minutes()
              ) {
                const startSecond = startDate.seconds();
                for (let s = startSecond + 1; s < 60; s++) {
                  disabledSeconds.add(s);
                }
              }
              // 如果是同一天
              if (isSameDay) {
                const startHour = startDate.hours();
                const startMinute = startDate.minutes();
                const startSecond = startDate.seconds();
                // 如果是开始时间之前的小时，禁用所有秒
                if (hour < startHour) {
                  return Array.from({ length: 60 }, (_, i) => i);
                }
                // 如果是开始时间的小时但分钟小于开始时间的分钟，禁用所有秒
                if (hour === startHour && minute < startMinute) {
                  return Array.from({ length: 60 }, (_, i) => i);
                }
                // 如果是开始时间的时分，禁用小于等于开始时间秒的所有秒
                if (hour === startHour && minute === startMinute) {
                  for (let s = 0; s < startSecond; s++) {
                    disabledSeconds.add(s);
                  }
                }
              }


              return Array.from(disabledSeconds);
            }
          };
        }
      }


      console.log(date, partical, rangeType, serviceTimeRange, _timeSelectRangeType, "haha")
      if (partical) modelRef.current = partical
      if (_timeSelectRangeType === 'ANY') {
        return false;
      }
      if (!date) {
        return {
          disabledHours: () => Array.from({ length: 24 }, (_, index) => index),
          disabledMinutes: () => Array.from({ length: 60 }, (_, index) => index),
          disabledSeconds: () => Array.from({ length: 60 }, (_, index) => index),
        };
      }
      if (serviceTimeRange && date && rangeType === 'SERVICETIME') {
        const result = calcServiceTime(serviceTimeRange || [], date);
        return result;
      }
      if (useExtend) {
        const result = calcServiceTime(serviceTimeRange || [], date);
        return result;
      }
      if (dateRange && rangeType === 'CUSTOM') {
        const { dateMaxLimit, dateMinLimit } = dateRange;
        const _dateRange = [moment().years(-27000), moment().years(27000)];
        // 处理最小日期限制
        if (dateMinLimit) {
          const { addon, key, days, id } = dateMinLimit;
          if (addon === 'before') {
            if (key === 'today_before') {
              const _startDate = moment().subtract(days, 'day');
              _dateRange[0] = _startDate.startOf('day');
            }
          } else if (!addon && key === 'today') {
            const _startDate = moment();
            _dateRange[0] = _startDate.startOf('day');
          } else if (addon === 'after') {
            if (key === 'today_after') {
              const _startDate = moment().add(days, 'day');
              _dateRange[0] = _startDate.startOf('day');
            }
          } else if (addon === EnumDateRange.thisWeek) {
            if (key === EnumDateRange.thisWeek) {
              if (obtainCurrentLanguageState() === 'en') {
                _dateRange[0] = moment()
                  .startOf('week')
                  .add(1, 'day');
              } else {
                _dateRange[0] = moment().startOf('week');
              }
            }
          } else if (addon === EnumDateRange.thisMonth) {
            if (key === EnumDateRange.thisMonth) {
              _dateRange[0] = moment().startOf('month');
            }
          } else if (addon === EnumDateRange.thisYear) {
            if (key === EnumDateRange.thisYear) {
              _dateRange[0] = moment().startOf('year');
            }
          } else {
            if (!addon) {
              if (key === 'defined' && dateMinLimit?.defined) {
                _dateRange[0] = moment(mostValuesRef.current.min);
              } else {
                let _startDate = mostValuesRef.current.min;
                if (_startDate) {
                  _dateRange[0] = moment(_startDate);
                }
              }
            }
          }
        }
        // 处理最大日期限制
        if (dateMaxLimit) {
          const { addon, key, days, id } = dateMaxLimit;
          if (addon === 'before') {
            if (key === 'today_before') {
              const _endDate = moment().subtract(days, 'day');
              _dateRange[1] = _endDate.endOf('day');
            }
          } else if (!addon && key === 'today') {
            const _endDate = moment();
            _dateRange[1] = _endDate.endOf('day');
          } else if (addon === 'after') {
            if (key === 'today_after') {
              const _endDate = moment().add(days, 'day');
              _dateRange[1] = _endDate.endOf('day');
            }
          } else if (addon === EnumDateRange.thisWeek) {
            if (key === EnumDateRange.thisWeek) {
              if (obtainCurrentLanguageState() === 'en') {
                _dateRange[1] = moment()
                  .endOf('week')
                  .add(1, 'day');
              } else {
                _dateRange[1] = moment().endOf('week');
              }
            }
          } else if (addon === EnumDateRange.thisMonth) {
            if (key === EnumDateRange.thisMonth) {
              _dateRange[1] = moment().endOf('month');
            }
          } else if (addon === EnumDateRange.thisYear) {
            if (key === EnumDateRange.thisYear) {
              _dateRange[1] = moment().endOf('year');
            }
          } else {
            if (!addon) {
              // 自定义时间
              if (key === EnumDateRange.defined && dateMaxLimit?.defined) {
                _dateRange[1] = moment(mostValuesRef.current.max);
              } else {
                let _endDate = mostValuesRef.current.max;
                if (_endDate) {
                  _dateRange[1] = moment(_endDate);
                }
              }
            }
          }
        }


        const _dateLongRange = [
          {
            begin: _dateRange[0].valueOf(),
            end: _dateRange[1].valueOf()
          }
        ];


        const result = calcServiceTime(_dateLongRange || [], date);
        return result;
      }


      return {
        disabledHours: () => [],
        disabledMinutes: selectedHour => {
          return [];
        },
        disabledSeconds: (selectedHour, selectedMinute) => {
          return [];
        }
      };
    },
    [rangeType, serviceTimeRange, _timeSelectRangeType, rangeValue, modelRef.current]
  );


  // 处理日期选择器打开/关闭
  const onOpenChange = open => {
    if (open) {
      const { dateMaxLimit, dateMinLimit } = dateRange || {};
      // 获取最小日期限制
      if (dateMinLimit && !dateMinLimit?.addon) {
        if (dateMinLimit.key === 'defined' && dateMinLimit?.defined) {
          mostValuesRef.current.min = dateMinLimit?.defined;
        } else if (dateMinLimit?.id) {
          t?.actions?.getFieldValue(dateMinLimit.id)?.then(time => {
            mostValuesRef.current.min = time;
          });
        }
      }
      // 获取最大日期限制
      if (dateMaxLimit && !dateMaxLimit?.addon) {
        if (dateMaxLimit.key === 'defined' && dateMaxLimit?.defined) {
          mostValuesRef.current.max = dateMaxLimit.defined;
        } else if (dateMaxLimit?.id) {
          t?.actions?.getFieldValue(dateMaxLimit.id)?.then(time => {
            mostValuesRef.current.max = time;
          });
        }
      }
      // 获取扩展时间范围
      if (useExtend) {
        t.actions.getFormState(state => {
          const formData = { ...(state.values || {}), ...(t.baseActions.getBaseValue() || {}) }
          getDateRangePieces({
            formId: t.orderInfo.formId,
            formData,
            fieldCode,
            extendClassId: extendSetting[0].id,
          }).then(res => {
            if (res.code === 100000) {
              setServiceTimeRange(res.data || []);
            }
          });
        })
      }
    } else {
      // 关闭时处理值
      if (!rangeValue) {
        setRangeValue(undefined)
      }
      if (rangeValue && rangeValue?.[0] && rangeValue?.[1]) {
        const startTime = rangeValue[0].format("YYYY-MM-DD HH:mm")
        const endTime = rangeValue[1].format("YYYY-MM-DD HH:mm")
        let type = startTime !== endTime
        if (type) {
          handleChange(rangeValue)
        } else {
          let copyRangeValue = [...rangeValue]
          rangeValue.forEach(item => copyRangeValue.push(item))
          modelRef.current == 'start' ? copyRangeValue[0] = undefined : copyRangeValue[1] = undefined
          setRangeValue(copyRangeValue)
        }
      }
    }
    setOpen(open);
  };


  // 处理值变化
  const value = useMemo(() => {
    if (!_value) {
      setRangeValue(null)
      return null
    }
    if (_value?.startDate && _value?.endDate) {
      setRangeValue([moment(_value?.startDate), moment(_value?.endDate)])
      return [moment(_value?.startDate), moment(_value?.endDate)]
    }
  }, [_value])


  // 获取下一个可用的小时
  function getNextAvailableHour(bannedHours, currentHour) {
    if (!bannedHours.includes(currentHour)) return currentHour
    const banned = new Set(bannedHours);
    if (banned.size === 24) return undefined; // 所有小时均被禁用
    if (banned.size === 0) return 0; // 无禁用小时，默认返回0


    const maxBanned = Math.max(...bannedHours);
    let candidate = (maxBanned + 1) % 24;
    while (banned.has(candidate)) {
      candidate = (candidate + 1) % 24;
    }
    return candidate;
  }


  // 获取下一个可用的分钟或秒
  function getNextAvailableMAndS(bannedTimes, currentHour) {
    if (!bannedTimes.includes(currentHour)) return currentHour
    const banned = new Set(bannedTimes);
    if (banned.size === 60) return undefined; // 所有时间均被禁用
    if (banned.size === 0) return 0; // 无禁用时间，默认返回0


    const maxBanned = Math.max(...bannedTimes);
    let candidate = (maxBanned + 1) % 60;
    while (banned.has(candidate)) {
      candidate = (candidate + 1) % 60;
    }
    return candidate;
  }


  // 渲染组件
  return (
    <div className={styles['dynamic-date']}>
      {disabled ? (
        <div className={styles['readonly-date']}>
          {value ? `${value[0].format(_dateFormat)} - ${value[1].format(_dateFormat)}` : '--'}
        </div>
      ) : (
        <DatePicker.RangePicker
          value={rangeValue}
          disabled={isBusinessPanel}
          disabledDate={disabledDate}
          onChange={handleChange}
          showTime={[
            EnumDateFormatType.all,
            EnumDateFormatType.yearMonthDayHoursMinutes
          ].includes(dateFormat)}
          format={_dateFormat}
          suffixIcon={_suffixIcon}
          onOpenChange={onOpenChange}
          open={open}
          dropdownClassName={`fs-${formLayout?.fontSize}`}
          getPopupContainer={getPopupContainer || (() => document.body)}
          disabledTime={_disabledTime}
          onPickerValueChange={(current) => {
            if (!current) return
            if (fieldCode === 'ChangeSchedule_StartEndTime') {
              try {
                // 如果是修改开始时间，且已有结束时间，检查结束时间是否需要调整
                if (modelRef.current === 'start' && rangeValue?.[1] && moment.isMoment(rangeValue[1])) {
                  const endDate = rangeValue[1];
                  // 确保current是有效的moment对象
                  if (!moment.isMoment(current)) return;


                  const isLastDay = endDate.isSame(current.clone().add(6, 'days'), 'day');


                  // 如果是第7天，且结束时间超过了开始时间对应的时分秒，调整结束时间
                  if (isLastDay && endDate.format('HH:mm:ss') > current.format('HH:mm:ss')) {
                    const newEndDate = moment(endDate).hours(current.hours()).minutes(current.minutes()).seconds(current.seconds());
                    if (moment.isMoment(newEndDate)) {
                      setRangeValue([current, newEndDate]);
                      return;
                    }
                  }


                  // 如果超过了7天，调整到第7天对应时间
                  const maxEndDate = current.clone().add(6, 'days').hours(current.hours()).minutes(current.minutes()).seconds(current.seconds());
                  if (moment.isMoment(maxEndDate) && endDate.valueOf() > maxEndDate.valueOf()) {
                    setRangeValue([current, maxEndDate]);
                    return;
                  }


                  setRangeValue([current, rangeValue[1]]);
                  return;
                }
              } catch (error) {
                console.error('Error in onPickerValueChange:', error);
              }
            }


            const disabledTimes = _disabledTime(current)
            if (disabledTimes && disabledTimes.disabledHours && current) {
              try {
                const disabledHours = disabledTimes.disabledHours()
                const candidate = getNextAvailableHour(disabledHours, current.hours())


                const disabledMinutes = disabledTimes.disabledMinutes(candidate)
                const m = getNextAvailableMAndS(disabledMinutes, current.minutes()) ?? current.minutes()


                const disabledSeconds = disabledTimes.disabledSeconds(m)
                const s = getNextAvailableMAndS(disabledSeconds, current.seconds()) ?? current.seconds()


                const time = current.clone().hours(candidate).minutes(m).seconds(s)
                if (!moment.isMoment(time)) return;


                if (modelRef.current == 'start') {
                  setRangeValue([time, rangeValue?.[1]])
                } else {
                  setRangeValue([rangeValue?.[0], time])
                }
              } catch (error) {
                console.error('Error in disabledTimes handling:', error);
              }
            } else {
              if (modelRef.current == 'start') {
                setRangeValue([current, rangeValue?.[1]])
              } else {
                setRangeValue([rangeValue?.[0], current])
              }
            }
          }}
        />
      )}
    </div>
  );
};


export default IDate;
