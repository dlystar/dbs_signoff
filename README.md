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
  onChange: _onChange = () => { },
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
  rangeType = 'CUSTOM',
  extendSetting,
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
  const useExtend = rangeType === 'EXTEND' && (extendSetting && Array.isArray(extendSetting) && extendSetting.length > 0)
  let _timeSelectRangeType = timeSelectRangeType
  if (useExtend) _timeSelectRangeType = 'ONLY_RANGE_OUT'
  const modelRef = useRef('start') 
  const [rangeValue, setRangeValue] = useState(value) 
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

  const handleChange = val => {
    const [start, end] = val || [null, null]
    let value = { startDate: handelVal(start), endDate: handelVal(end) }
    let _val = [start, end]
    if(value.startDate > value.endDate){
      value = {startDate: handelVal(end), endDate: handelVal(start) }
      _val = [end, start]
    }
    setRangeValue(_val)
    _onChange(value);
    onBlur && onBlur(value);
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

  const disabledDate = useCallback(
    current => {
            if (_timeSelectRangeType === 'ANY') return false;
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
    [rangeType, serviceTimeRange, _timeSelectRangeType]
  );

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
        disabledHours: () => {
          return totalHours.filter(i => !hours.includes(i));
        },
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

  const _disabledTime = useCallback(
    (date, partical) => {
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
    [rangeType, serviceTimeRange, _timeSelectRangeType]
  );

  const onOpenChange = open => {
    if (open) {
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
      if (!rangeValue) {
        setRangeValue(undefined)
      }
      if (rangeValue && rangeValue?.[0] && rangeValue?.[1]) {
        const startTime = rangeValue?.[0].format('YYYY-MM-DD HH:mm')
        const endTime =  rangeValue?.[1].format('YYYY-MM-DD HH:mm')
        let type = startTime !== endTime
        if(type) {
          handleChange(rangeValue) 
        }else {
          let copyRangeValue =[]
          rangeValue.forEach(item=>copyRangeValue.push(item))
          modelRef.current == "start"? copyRangeValue[0] = undefined :copyRangeValue[1] = undefined
          setRangeValue(copyRangeValue)
        }
       
      }
    }
    setOpen(open);
  };
 
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

  function getNextAvailableHour(bannedHours, currentHour) {
    if (!bannedHours.includes(currentHour)) return currentHour
    const banned = new Set(bannedHours);
    if (banned.size === 24) return undefined; 
    if (banned.size === 0) return 0; 

    const maxBanned = Math.max(...bannedHours);
    let candidate = (maxBanned + 1) % 24;
    while (banned.has(candidate)) {
      candidate = (candidate + 1) % 24;
    }
    return candidate;
  }

  function getNextAvailableMAndS(bannedTimes, currentHour) {
    if (!bannedTimes.includes(currentHour)) return currentHour
    const banned = new Set(bannedTimes);
    if (banned.size === 60) return undefined; 
    if (banned.size === 0) return 0;

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
            const disabledTimes = _disabledTime(current)
            if (disabledTimes && disabledTimes.disabledHours && current) {
              const disabledHours = disabledTimes.disabledHours()
              const candidate = getNextAvailableHour(disabledHours, current.hours())
              const disabledMinutes = disabledTimes.disabledMinutes(candidate)
              const m = getNextAvailableMAndS(disabledMinutes, current.minutes()) ?? current.minutes()

              const disabledSeconds = disabledTimes.disabledSeconds(m)
              const s = getNextAvailableMAndS(disabledSeconds, current.seconds()) ?? current.seconds()

              const time = current.clone().hours(candidate).minutes(m).seconds(s)
              if (modelRef.current == 'start') {
                setRangeValue([time, rangeValue?.[1]])
              } else {
                setRangeValue([rangeValue?.[0], time])
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
