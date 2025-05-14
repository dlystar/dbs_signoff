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

const IDate = ({
  value: _value,
  onChange: _onChange = () => {},
  dateFormat,
  disabled,
  placeholder,
  onBlur,
  suffixIcon,
  isTableItem,
  t,
  dateRange,
  fieldCode,
  serviceTimeIds,
  timeSelectRangeType = "ONLY_RANGE",
  rangeType = 'CUSTOM'
}) => {
  useEffect(() => {
    if (value === 0 && checkType.isNumber(value)) {
      _onChange(null);
      onBlur(null);
    }
  }, [value]);
  const [open, setOpen] = useState(false);
  const mostValuesRef = useRef({ min: undefined, max: undefined });
  const [serviceTimeRange, setServiceTimeRange] = useState(null);

  useEffect(() => {
    if (rangeType !== 'CUSTOM') {
      if (
        timeSelectRangeType &&
        timeSelectRangeType !== 'ANY' &&
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
  }, [timeSelectRangeType, serviceTimeIds, rangeType]);

  const handleChange = val => {
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
    _onChange(timeStamp);
    onBlur && onBlur(timeStamp);
  };

  const { isBusinessPanel, getPopupContainer, formLayout } = t || {};
  const _suffixIcon = suffixIcon || <Icon type="calendar" />;
  let _dateFormat =
    EnumDateFormatType.yearMonthDay === dateFormat
      ? EnumDateFormatRule.yearMonthDay
      : EnumDateFormatType.yearMonthDayHoursMinutes === dateFormat
      ? EnumDateFormatRule.yearMonthDayHoursMinutes
      : EnumDateFormatRule.all;
  // _dateFormat = isTableItem ? dateFormat === EnumDateFormatType.all ? EnumDateFormatRuleSimple.all : EnumDateFormatRuleSimple.yearMonthDay : _dateFormat;
  let _formState;
  t?.actions?.getFormState()?.then(res => {
    _formState = res;
  });
  const disabledDate = useCallback(
    current => {
      //为了兼容历史数据所以需要保留 特新增字段rangeType
      if (timeSelectRangeType === 'ANY') return false;
      if (rangeType === 'CUSTOM') {
        if (dateRange) {
          const { dateMaxLimit, dateMinLimit } = dateRange;
          const _dateRange = [];
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
                    timeSelectRangeType === 'ONLY_RANGE' ? 0 : 1
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
                //自定义时间
                if (key === 'defined' && dateMinLimit?.defined) {
                  _dateRange[0] = moment(mostValuesRef.current.min || dateMinLimit?.defined).startOf('day');
                } else {
                  let _startDate = mostValuesRef.current.min;
                  // 计划结束时间对于时间范围取决于其他日期字段时 只处理其他日期字段有值的情况
                  if (_startDate) {
                    _dateRange[0] = moment(_startDate).startOf('day');
                  }
                }
              }
            }
          }
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
                //自定义时间
                if (key === EnumDateRange.defined && dateMaxLimit?.defined) {
                  _dateRange[1] = moment(mostValuesRef.current.max || dateMaxLimit?.defined).endOf('day');
                } else {
                  let _endDate = mostValuesRef.current.max;
                  if (_endDate) {
                    _dateRange[1] = moment(_endDate).endOf('day');
                  }
                }
              }
            }
          }
          //最小值-无限制
          if (_dateRange[0] && !_dateRange[1]) {
            return current < _dateRange[0];
          } else if (_dateRange[1] && !_dateRange[0]) {
            //无限制-最大值
            return current > _dateRange[1];
          } else if (_dateRange[0] && _dateRange[1]) {
            //最小值-最大值
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
          //允许选择范围内的时间
          if (timeSelectRangeType === 'ONLY_RANGE') {
            return !_dateRanges.some(
              i =>
                i.begin.startOf('day') <= current &&
                i.end.endOf('day') >= current
            );
          } else {
            let result = calcServiceTime(serviceTimeRange,current);
            if(result){
              return result.disabledHours().length === 24;
            }
            return false;
          }
        } else {
          return false;
        }
      }
    },
    [rangeType, serviceTimeRange, timeSelectRangeType, dateRange]
  );

  //校验当前时间是否是和边界值是同一日期或时间 type date/hours/minutes/seconds
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

  const calcServiceTime = (serviceTimeRangeTemp, date) => {
    const totalHours = _range(0, 24);
    const totalMinutes = _range(0, 60);
    const totalSeconds = _range(0, 60);
    const tempDate = moment(date);
    const _dateRanges = serviceTimeRangeTemp.map(i => ({
      begin: moment(i.begin),
      end: moment(i.end)
    }));
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
      if (timeSelectRangeType === 'ONLY_RANGE_OUT') {
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
      }else{
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
        disabledHours: () => {
            return totalHours.filter(i => !hours.includes(i));
        },
        disabledMinutes: selectedHour => {
          if (selectedHour === -1){
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
            if (timeSelectRangeType === 'ONLY_RANGE_OUT') {
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
              
            }else{
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
        disabledSeconds: (selectedHour,selectedMinute) => {
          if(selectedHour == -1 || selectedMinute == -1){
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
            if (timeSelectRangeType === 'ONLY_RANGE') {
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

  const _disabledTime = useCallback(
    date => {
      if(timeSelectRangeType === 'ANY') {
        return false;
      }
      if (!date) {
        return {
          disabledHours: () => Array.from({length: 24}, (_, index) => index),
          disabledMinutes: () => Array.from({length: 60}, (_, index) => index),
          disabledSeconds: () => Array.from({length: 60}, (_, index) => index),
        };
      }
      if (serviceTimeRange && date && rangeType === 'SERVICETIME') {
        const result = calcServiceTime(serviceTimeRange, date);
        return result;
      }
      if (dateRange && rangeType === 'CUSTOM') {
        const { dateMaxLimit, dateMinLimit } = dateRange;
        const _dateRange = [moment().years(-27000), moment().years(27000)];
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
              //自定义时间
              if (key === 'defined' && dateMinLimit?.defined) {
                _dateRange[0] = moment(mostValuesRef.current.min);
              } else {
                let _startDate = mostValuesRef.current.min;
                // 计划结束时间对于时间范围取决于其他日期字段时 只处理其他日期字段有值的情况
                if (_startDate) {
                  _dateRange[0] = moment(_startDate);
                }
              }
            }
          }
        }
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
              //自定义时间
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

        const result = calcServiceTime(_dateLongRange, date);
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
    [rangeType, serviceTimeRange, timeSelectRangeType, dateRange]
  );

  const onOpenChange = open => {
    if (open) {
      //当前字段时间范围可能是取决于其他日期字段，这时日历选择下拉框展开需要提前缓存时间范围设置字段的当前值
      const { dateMaxLimit, dateMinLimit } = dateRange || {};
      if (dateMinLimit && !dateMinLimit?.addon) {
        if (dateMinLimit.key === 'defined' && dateMinLimit?.defined) {
          mostValuesRef.current.min = dateMinLimit?.defined;
        } else if (dateMinLimit?.id) {
          t?.actions?.getFieldValue(dateMinLimit.id)?.then(time => {
            mostValuesRef.current.min = time;
          });
        }
      }
      if (dateMaxLimit && !dateMaxLimit?.addon) {
        if (dateMaxLimit.key === 'defined' && dateMaxLimit?.defined) {
          mostValuesRef.current.max = dateMaxLimit.defined;
        } else if (dateMaxLimit?.id) {
          t?.actions?.getFieldValue(dateMaxLimit.id)?.then(time => {
            mostValuesRef.current.max = time;
          });
        }
      }
    }
    setOpen(open);
  };

  const value = useMemo(() => {
    if (!_value) return null
    if (isNaN(_value)) {
      return moment(_value).startOf('day')
    }
    return moment(Number(_value))
  }, [_value])

   // 获取下一个可用的小时
  // @param bannedHours: 被禁用的小时列表
  // @param currentHour: 当前选择的小时
  // @return: 下一个可用的小时，如果当前小时可用则返回当前小时
  const getNextAvailableHour = (bannedHours, currentHour) => {
    // 如果当前小时不在禁用列表中，直接返回当前小时
    if (!bannedHours.includes(currentHour)) return currentHour
    const banned = new Set(bannedHours);
    // 如果所有小时都被禁用，返回undefined
    if (banned.size === 24) return undefined;
    // 如果没有禁用的小时，返回0
    if (banned.size === 0) return 0;

    // 从最大禁用小时开始，寻找下一个可用的小时
    const maxBanned = Math.max(...bannedHours);
    let candidate = (maxBanned + 1) % 24;
    while (banned.has(candidate)) {
      candidate = (candidate + 1) % 24;
    }
    return candidate;
  }

  // 获取下一个可用的分钟或秒
  // @param bannedTimes: 被禁用的时间列表（分钟或秒）
  // @param currentTime: 当前选择的时间（分钟或秒）
  // @return: 下一个可用的时间，如果当前时间可用则返回当前时间
  const getNextAvailableMAndS = (bannedTimes, currentTime) => {
    // 如果当前时间不在禁用列表中，直接返回当前时间
    if (!bannedTimes.includes(currentTime)) return currentTime
    const banned = new Set(bannedTimes);
    // 如果所有时间都被禁用，返回undefined
    if (banned.size === 60) return undefined;
    // 如果没有禁用的时间，返回0
    if (banned.size === 0) return 0;

    // 从最大禁用时间开始，寻找下一个可用的时间
    const maxBanned = Math.max(...bannedTimes);
    let candidate = (maxBanned + 1) % 60;
    while (banned.has(candidate)) {
      candidate = (candidate + 1) % 60;
    }
    return candidate;
  }

  return (
    <div className={styles['dynamic-date']}>
      {disabled ? (
        <div className={styles['readonly-date']}>
          {value ? value.format(_dateFormat) : '--'}
        </div>
      ) : (
        <DatePicker
          value={value}
          disabled={isBusinessPanel}
          disabledDate={disabledDate}
          // 使用 onChange 替代 onPickerValueChange
          onChange={(date) => {
            if (!date) {
              handleChange(null);
              return;
            }
            // 如果不需要显示时间选择，直接使用当前值
            if (![
              EnumDateFormatType.all,
              EnumDateFormatType.yearMonthDayHoursMinutes
            ].includes(dateFormat)) {
              handleChange(date);
              return;
            }
            // 获取当前时间点的禁用时间配置
            const disabledTimes = _disabledTime(date);
            // 如果存在禁用时间配置
            if (disabledTimes && disabledTimes.disabledHours && date) {
              // 获取被禁用的小时列表
              const disabledHours = disabledTimes.disabledHours();
              // 获取下一个可用的小时
              const candidate = getNextAvailableHour(disabledHours, date.hours());
              // 获取被禁用的分钟列表
              const disabledMinutes = disabledTimes.disabledMinutes(candidate);
              // 获取下一个可用的分钟，如果获取不到则使用当前分钟
              const m = getNextAvailableMAndS(disabledMinutes, date.minutes()) ?? date.minutes();

              // 获取被禁用的秒数列表
              const disabledSeconds = disabledTimes.disabledSeconds(candidate, m);
              // 获取下一个可用的秒数，如果获取不到则使用当前秒数
              const s = getNextAvailableMAndS(disabledSeconds, date.seconds()) ?? date.seconds();

              // 创建一个新的时间对象，使用调整后的时、分、秒
              const time = date.clone().hours(candidate).minutes(m).seconds(s);
              // 更新值
              handleChange(time);
            } else {
              // 如果没有禁用时间配置，直接使用当前时间
              handleChange(date);
            }
          }}
          placeholder={placeholder}
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
        />
      )}
    </div>
  );
};

export default IDate;
