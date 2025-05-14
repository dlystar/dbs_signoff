import { intl } from '@chaoswise/intl';
import React, { useEffect, useState } from 'react';
import { Skeleton, Spin } from '@chaoswise/ui';
import { helper, checkType } from '@/utils/T';
import { useDebounceFn } from 'ahooks';
import { EnumGroupType } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/constants';
import EnumEnv from '@/constants/EnumEnv';
import IInput from '../components/IInput';
import IExpandContainer from '../components/IExpandContainer';
import ITextArea from '../components/ITextArea';
import IRichText from '../components/IRichText';
import IRadio from '../components/IRadio';
import ICheckbox from '../components/ICheckbox';
import ISelect from '../components/ISelect';
import ISelectV2 from '../components/ISelectV2';
import ISelectMany from '../components/ISelectMany';
import ISelectManyV2 from '../components/ISelectManyV2';
import IMultiSelect from '../components/IMultiSelect';
import INumber from '../components/INumber';
import IDate from '../components/IDate';
import IDateRangeFrom from '../components/IDateRange';
import IMember from '../components/IMember';
import IGroup from '../components/IGroup';
import IUpload from '../components/IUpload';
import IConfigurationItem from '../components/IConfigurationItem';
import IEvaluateStar from '../components/IEvaluateStar';
import ITableForm from '../components/ITableForm';
import IText from '../components/IText';
import ICustomCmdbModel from '../components/ICustomCmdbModel';
import IKnowledgeList from '../components/IKnowledgeList';
import ICustomConfigGuration from '../components/ICustomConfigGuration';
import ITableCustomConfigGuration from '../components/ITableCustomConfigGuration';
// import IPosition from '../components/IPosition';
import IAutoNumber from '../components/IAutoRef';
import IFormImportSetting from '../settingComponents/IFormImportSetting';
import IFormExportSetting from '../settingComponents/IFormExportSetting';
import IFieldHintSetting from '../settingComponents/IFieldHintSetting';
import ITabSetting from '../settingComponents/ITabSetting';
import IQuote from '../components/IQuote';

import IHandWrittenSignature from '../components/IHandWrittenSignature';
import IConfigGuration from '../components/IConfigGuration';
import INewConfig from '../components/INewConfig';
import INewConfigTab from '../components/INewConfigTab';

// //表单组件
import IFormInput from '../settingComponents/IFormInput';
import IFormTextarea from '../settingComponents/IFormTextarea';
import IFormTitleInput from '../settingComponents/IFormTitleInput';
import IFormSelect from '../settingComponents/IFormSelect';
import IFormRadio from '../settingComponents/IFormRadio';
import IFormCheckbox from '../settingComponents/IFormCheckbox';
import IFormDate from '../settingComponents/IFormDate';
import IFormNumber from '../settingComponents/IFormNumber';
import IFormDecimalsMount from '../settingComponents/IFormDecimalsMount';
import INumberRange from '../settingComponents/INumberRange';
import IVisibleRange from '../settingComponents/IVisibleRange';
import IRadioOption from '../settingComponents/IRadioOption';
import ICheckboxOption from '../settingComponents/ICheckboxOption';
import ISelectOption from '../settingComponents/ISelectOption';
import ISelectManyOption from '../settingComponents/ISelectManyOption';
import ISelectOptionsItems from '../settingComponents/ISelectOptionsItems';
import IMultiSelectOption from '../settingComponents/IMultiSelectOption';
import IColumnSetting from '../settingComponents/IColumnSetting';
import IStarInfo from '../settingComponents/IStarInfo';
import IDateRange from '../settingComponents/IDateRange';
import IServiceTimeRange from '../settingComponents/IServiceTimeRange';
import ITimeRangeType from '../settingComponents/ITimeRangeType';
import ISelectRange from '../settingComponents/ISelectRange';
import IUploadSetting from '../settingComponents/IUploadSetting';
import IUploadTemplate from '../settingComponents/IUploadTemplate';
import IValiDateRule from '../settingComponents/IValiDateRule';
import IFormRichText from '../settingComponents/IFormRichText';
import IDateFormatValueInfo from '../settingComponents/IDateFomatValueInfo';
import ITextRange from '../settingComponents/ITextRange';
import { EnumType, DynamicEnumType } from '@/constants/common/formType';
import IFormCustomCmdbModel from '../settingComponents/IFormCustomCmdbModel';
import IFormCustomCmdbTab from '../settingComponents/IFormCustomCmdbTab';
import IKnowledgePageSize from '../settingComponents/IKnowledgePageSize';
import IKnowledgeQuoteFields from '../settingComponents/IKnowledgeQuoteFields';
import IFormCustomRelationConfig from '../settingComponents/IFormCustomRelationConfig';
import IFormCustomCmdbConfig from '../settingComponents/IFormCustomCmdbConfig';
import IFormCustomCmdbConfigMultiple from '../settingComponents/IFormCustomCmdbConfigMultiple';
import INewConfigSelect from '../settingComponents/INewConfigSelect';
import INewConfigSelectTable from '../settingComponents/INewConfigSelect/TableConfigSelect';
import INewConfigSelectTab from '../settingComponents/INewConfigSelect/TabConfigSelect';
import TableConfigFilter from '../settingComponents/INewConfigSelect/TableConfigFilter';
// import IPositionValidate from '../settingComponents/IPositionValidate';
// import IPositionDefault from '../settingComponents/IPositionDefault';
// import IPositionSetting from '../settingComponents/IPositionSetting';
import IUserMsg from '../settingComponents/IUserMsg';
import IUserDefault from '../settingComponents/IUserDefault';
import IQuoteDataTable from '../settingComponents/IQuoteDataTable';
import IQuoteDataTableList from '../settingComponents/IQuoteDataTableList';
import IDateInitValue from '../settingComponents/IDateInitValue';
import IUploadFileFormat from '../settingComponents/IUploadFileFormat';
import IUploadFileQuantity from '../settingComponents/IUploadFileQuantity';
import IUploadFileSize from '../settingComponents/IUploadFileSize';
import ITableColDefaultWidth from '../settingComponents/ITableColDefaultWidth';
import IAutoRefRule from '../settingComponents/IAutoRefRule';
import UserSecurityFlag from '../settingComponents/IUsersecurityFlag';
import ShowInfluence from '../settingComponents/ShowInfluence';
import IHasAddBtn from '../settingComponents/IHasAddBtn';
import UserStatus from '../settingComponents/IUserStatus';
import IShowMemberGroupCount from '../settingComponents/IShowMemberGroupCount';
import IFieldEncryptMode from '../settingComponents/IFieldEncryptMode';
import IRangeTypeRadio from '../settingComponents/IRangeTypeRadio';
import ITableFieldRowConf from '../settingComponents/ITableFieldRowConf';
import IExtendSetting from '../settingComponents/IExtendSetting';
import IContentExtension from '../settingComponents/IContentExtension';
import IFormCommonCheckbox from '../settingComponents/IFormCommonCheckbox';
import IFormCommonRadio from '../settingComponents/IFormCommonRadio';
import { $rowKey as $tableRowKey } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/FormEngine/FormRender/components/hooks/useTableItems';

export const translateType = {
  get INPUT() {
    return intl.get('767078d5-1f30-4e23-8392-130489b71c72').d('单行文本');
  },
  get TEXTAREA() {
    return intl.get('fbc50101-62ee-4116-99b5-e9737a2c4b36').d('多行文本');
  },
  get RICH_TEXT() {
    return intl.get('a1ced248-bdc7-44c4-ad0a-1b1d5e48ea57').d('富文本');
  },
  get RADIO() {
    return intl.get('9d57319f-9bb2-4af9-97a2-f88adc04b56f').d('单选框');
  },
  get CHECKBOX() {
    return intl.get('3c3aa2b4-0317-4c0e-b6fd-2f485210bb4d').d('多选框');
  },
  get SELECT() {
    return intl.get('5990b72d-1cee-40d8-a923-919f67027efa').d('下拉单选');
  },
  get SELECT_MANY() {
    return intl.get('35d5a012-3084-41cc-94d1-07c15a10bf45').d('下拉多选');
  },
  get MULTI_SELECT() {
    return intl.get('b06033cb-a89e-4100-b458-57593042f84a').d('多级下拉');
  },
  get NUMBER() {
    return intl.get('d7e7755c-5dda-41eb-8ff4-8a5655c36d90').d('数字');
  },
  get TIME() {
    return intl.get('be35e3d9-cfd2-440e-aa0a-0c1ce971f277').d('时间');
  },
  get DATE() {
    return intl.get('86558d3b-a651-4203-87b9-6d6185ec4749').d('日期');
  },
  get DATERANGE() {
    return intl.get('0b4cd469-a0db-43d1-9232-3e458b39bd1f').d('日期范围');
  },
  get MEMBER() {
    return intl.get('aa172580-f360-46b6-8da0-59d8db956511').d('成员');
  },
  get GROUP() {
    return intl.get('97fa4167-4c57-42c6-af10-ab473cca7824').d('成员组');
  },
  get UPLOAD() {
    return intl.get('716d11f9-32ed-46e3-ad87-f93f51277fbc').d('文件');
  },
  get CONFIGURATION_ITEM() {
    return intl.get('c90c914d-72f1-41b8-b5b1-7d5b1bfa168e').d('关联配置项');
  },
  get ADD_GROUP() {
    return intl.get('ece14efc-f6bc-43ab-89e1-d5f2f422acbd').d('添加分组');
  },
  get EVALUATE_STAR() {
    return intl.get('2e3971a8-9cfb-479f-9085-5b89557ee1ac').d('星级评价');
  },
  get TABLE_FORM() {
    return intl.get('0af5ba0e-f890-4479-8125-904f29c3fa36').d('表格');
  },
  get TEXT() {
    return intl.get('a6f9afc0-ba1a-4290-87e0-d30577f41aa6').d('文本提醒');
  },
  get CMDB_MODEL() {
    return intl.get('13b01462-d06a-43e6-9e85-1648621d8403').d('配置项模型');
  },
  get KNOWLEDGE_LIST() {
    return intl.get('5e68d5fe-eda3-40f3-8dc7-9b721f1a69cc').d('知识列表');
  },
  get POSITION() {
    return intl.get('c68ef116-5824-40bd-88d9-7304a6703a42').d('定位');
  },
  get QUOTE() {
    return intl.get('21509da6-b191-4833-8b70-c404452f758d').d('引用');
  },
  get [EnumGroupType.TAB]() {
    return intl.get('8053b0c1-1d82-4836-8d9e-e98feca01ce7').d('添加标签容器');
  },
  get WRITTEN_SIGNATURE() {
    return intl.get('c4659bf9-e510-4ec7-99d5-f81b4bf5cfd4').d('手写签名');
  },
  get [EnumType.customConfigTab]() {
    return intl.get('ab6abd5c-6c92-440b-ac66-514775006fe2').d('配置项标签');
  },
  get [EnumType.customConfigGuration]() {
    return intl.get('34e5bc64-93dd-4739-9a76-c20b0dfbc8ad').d('配置项');
  },

  //表单设置组件
  get FORM_INPUT() {
    return intl.get('fe08fb2a-f050-4576-93a8-c827480dce74').d('表单文本框');
  },
  get FORM_SELECT() {
    return intl.get('47f5e03f-ecab-4193-b0d0-3a6c4d11d836').d('表单下拉选择');
  },
  get FORM_NUMBER() {
    return intl.get('aab65c50-4ba6-4fb9-8266-6431582d44ef').d('表单数字选择框');
  },
  get FORM_RADIO() {
    return intl.get('4af3a0f7-9abe-409d-a783-68e93b09c054').d('表单单选框');
  },
  get FORM_CHECKBOX() {
    return intl.get('3083b0ca-7897-4ff2-afa4-14f1647ec11f').d('表单多选框');
  },
  get FORM_DATE() {
    return intl.get('091b832c-d242-45c0-9b17-22469e475c6d').d('表单日期');
  },
  get NUMBER_RANGE() {
    return intl.get('094e23d8-46d3-4478-a7fe-26c7dfdc0e9d').d('数字范围');
  },
  get Visible_RANGE() {
    return intl.get('c3c735fb-bce7-4b4e-827f-ab015226c96f').d('可见范围');
  },
  get RADIO_OPTION() {
    return intl.get('8738e31d-fca3-48c6-97b6-2a37aa954ec9').d('选项');
  },
  get CHECKBOX_OPTION() {
    return intl.get('8738e31d-fca3-48c6-97b6-2a37aa954ec9').d('选项');
  },
  get SELECT_OPTION() {
    return intl.get('8738e31d-fca3-48c6-97b6-2a37aa954ec9').d('选项');
  },
  get SELECT_MANY_OPTION() {
    return intl.get('8738e31d-fca3-48c6-97b6-2a37aa954ec9').d('选项');
  },
  get MULTI_SELECT_OPTION() {
    return intl.get('8738e31d-fca3-48c6-97b6-2a37aa954ec9').d('选项');
  },
  get ROW_SETTING() {
    return intl.get('d0369dda-571f-46fe-9b42-042630c8628c').d('行设置');
  },
  get STAR_INFO() {
    return intl.get('629a7601-6bca-4ed7-a2e2-e9b6c22bbfce').d('默认及提示');
  },
  get DATE_RANGE() {
    return intl.get('bc2940ac-2d01-43c3-ab70-ce89c152b0e6').d('时间范围');
  },
  get SELECT_RANGE() {
    return intl.get('5300d2bc-e6ea-4589-8a2d-cede98f887d6').d('选择范围');
  },
  get UPLOAD_SETTING() {
    return intl.get('a5505406-a154-45c3-b83d-aca6bf76c78c').d('上传设置');
  },
  get UPLOAD_TEMPLATE() {
    return intl.get('e026754b-cc57-4a63-a2f2-92df838519c2').d('上传模版');
  },
  get VALIDATE_RULE() {
    return intl.get('1f24a599-0663-43f2-a1c8-d30ddbadac66').d('校验规则');
  },
  get FORM_RICH_TEXT() {
    return intl.get('332a37b1-b599-44dd-996f-da92e1aede93').d('表单富文本');
  },
  get DATE_FORMAT_VALUE() {
    return intl.get('e75ed548-6dae-46eb-b5e9-157c85fe0fe0').d('日期格式默认值');
  },
  get TEXT_RANGE() {
    return intl.get('7471058b-1e40-421a-a483-935ca3832631').d('文本范围');
  },
  get FORM_CMDB_MODEL() {
    return intl.get('13b01462-d06a-43e6-9e85-1648621d8403').d('配置项模型');
  },
  get AUTO_NUMBER() {
    return intl.get('a16ecd30-ccf9-4e91-bbfe-382dc30420ec').d('自动编号');
  },
  get FORM_LAYOUT_STYLE() {
    return intl.get('b985835e-286f-4bf9-8308-83831f028ebd').d('表单样式');
  },
  get EXTEND_FIELD() {
    return intl.get('398a6f4a-eae1-4314-8672-c97b5e2ed018').d('扩展容器');
  },
};
// 维护一套_value表单值，为了后端筛选检索
export const createBaseValues = () => {
  let baseValueMap = {};

  return {
    setBaseValue: (key, value) => {
      baseValueMap[key] = value;
    },
    getBaseValue: () => {
      return baseValueMap;
    },
  };
};

export const getEnumField = (
  connect,
  mapStyledProps,
  getUtil,
  publicFieldManagement,
  extraProps = {}
) => {
  const _connect = (field) =>
    connect({
      getProps: mapStyledProps,
      defaultProps: {
        utils,
        publicFieldManagement,
        t: getUtil && getUtil(),
        ...(extraProps || {}),
      },
    })(field);

  return {
    [EnumType.expandContainer]: _connect(IExpandContainer),
    [EnumType.input]: _connect(IInput),
    [EnumType.textarea]: _connect(ITextArea),
    [EnumType.richText]: _connect(IRichText),
    [EnumType.radio]: _connect(IRadio),
    [EnumType.checkbox]: _connect(ICheckbox),
    [EnumType.select]: _connect(ISelectV2),
    [EnumType.selectMany]: _connect(ISelectManyV2),
    [EnumType.multiSelect]: _connect(IMultiSelect),
    [EnumType.number]: _connect(INumber),
    [EnumType.date]: _connect(IDate),
    [EnumType.dateRange]: _connect(IDateRangeFrom),
    [EnumType.member]: _connect(IMember),
    [EnumType.group]: _connect(IGroup),
    [EnumType.upload]: _connect(IUpload),
    [EnumType.configurationItem]: _connect(IConfigurationItem),
    [EnumType.evaluateStar]: _connect(IEvaluateStar),
    [EnumType.tableForm]: _connect(ITableForm),
    [EnumType.text]: _connect(IText),
    [EnumType.knowledgeList]: _connect(IKnowledgeList),
    // 这三个留着备份用
    [EnumType.customCmdbModel]: _connect(ICustomCmdbModel),
    [EnumType.customConfigGuration]: _connect(ICustomConfigGuration),
    [EnumType.customConfigTab]: _connect(IConfigGuration),

    // 新版配置项逻辑
    [EnumType.dpConfig]: _connect(INewConfig),
    [EnumType.dpConfigTab]: _connect(INewConfigTab),

    // [EnumType.position]: _connect(IPosition),
    [EnumType.quote]: _connect(IQuote),
    [EnumType.autoNumber]: _connect(IAutoNumber),
    [EnumType.handWrittenSignature]: _connect(IHandWrittenSignature),

    //右侧表单属性组件
    [DynamicEnumType.formInput]: _connect(IFormInput),
    [DynamicEnumType.formTextarea]: _connect(IFormTextarea),
    [DynamicEnumType.formTitleInput]: _connect(IFormTitleInput),
    [DynamicEnumType.numberRange]: _connect(INumberRange),
    [DynamicEnumType.visibleRange]: _connect(IVisibleRange),
    [DynamicEnumType.rangeTypeRadio]: _connect(IRangeTypeRadio),
    [DynamicEnumType.radioOption]: _connect(IRadioOption),
    [DynamicEnumType.checkboxOption]: _connect(ICheckboxOption),
    [DynamicEnumType.selectOption]: _connect(ISelectOption),
    [DynamicEnumType.selectManyOption]: _connect(ISelectManyOption),
    [DynamicEnumType.selectOptionsItems]: _connect(ISelectOptionsItems),
    [DynamicEnumType.multiSelectOption]: _connect(IMultiSelectOption),
    [DynamicEnumType.colSetting]: _connect(IColumnSetting),
    [DynamicEnumType.tableFieldRowConf]: _connect(ITableFieldRowConf),

    [DynamicEnumType.starInfo]: _connect(IStarInfo),
    [DynamicEnumType.dateRange]: _connect(IDateRange),
    [DynamicEnumType.selectRange]: _connect(ISelectRange),
    [DynamicEnumType.formCheckbox]: _connect(IFormCheckbox),
    [DynamicEnumType.formDate]: _connect(IFormDate),
    [DynamicEnumType.formNumber]: _connect(IFormNumber),
    [DynamicEnumType.tableColDefaultWidth]: _connect(ITableColDefaultWidth),
    [DynamicEnumType.formDecimalsMount]: _connect(IFormDecimalsMount),
    [DynamicEnumType.formRadio]: _connect(IFormRadio),
    [DynamicEnumType.formSelect]: _connect(IFormSelect),
    [DynamicEnumType.uploadSetting]: _connect(IUploadSetting),
    [DynamicEnumType.uploadTemplate]: _connect(IUploadTemplate),
    [DynamicEnumType.valiDateRule]: _connect(IValiDateRule),
    [DynamicEnumType.formRichText]: _connect(IFormRichText),
    [DynamicEnumType.dateFormatValue]: _connect(IDateFormatValueInfo),
    [DynamicEnumType.textRange]: _connect(ITextRange),
    [DynamicEnumType.formCustomCmdbModel]: _connect(IFormCustomCmdbModel),
    [DynamicEnumType.formCustomCmdbTab]: _connect(IFormCustomCmdbTab),
    [DynamicEnumType.knowledgePageSize]: _connect(IKnowledgePageSize),
    [DynamicEnumType.knowledgeQuoteFields]: _connect(IKnowledgeQuoteFields),
    [DynamicEnumType.formCustomRelationConfig]: _connect(
      IFormCustomRelationConfig
    ),
    [DynamicEnumType.formCustomConfigGuration]: _connect(IFormCustomCmdbConfig),
    [DynamicEnumType.formCustomConfigGurationMultiple]: _connect(
      IFormCustomCmdbConfigMultiple
    ),
    [DynamicEnumType.formCustomConfigGurationAttribute]:
      _connect(TableConfigFilter),

    [DynamicEnumType.iNewConfigSelect]: _connect(INewConfigSelect),
    [DynamicEnumType.iNewConfigTableSelect]: _connect(INewConfigSelectTable),
    [DynamicEnumType.iNewConfigTabSelect]: _connect(INewConfigSelectTab),

    // [DynamicEnumType.positionValidate]: _connect(IPositionValidate),
    // [DynamicEnumType.positionDefault]: _connect(IPositionDefault),
    // [DynamicEnumType.positionSetting]: _connect(IPositionSetting),
    [DynamicEnumType.userMsg]: _connect(IUserMsg),
    [DynamicEnumType.formImportSetting]: _connect(IFormImportSetting),
    [DynamicEnumType.formExportSetting]: _connect(IFormExportSetting),
    [DynamicEnumType.userDefaultValue]: _connect(IUserDefault),
    [DynamicEnumType.fieldHintSetting]: _connect(IFieldHintSetting),
    [DynamicEnumType.quoteDataTable]: _connect(IQuoteDataTable),
    [DynamicEnumType.quoteDataTableList]: _connect(IQuoteDataTableList),
    [DynamicEnumType.dateInitValue]: _connect(IDateInitValue),
    [DynamicEnumType.uploadFileFormat]: _connect(IUploadFileFormat),
    [DynamicEnumType.uploadFileQuantity]: _connect(IUploadFileQuantity),
    [DynamicEnumType.uploadFileSize]: _connect(IUploadFileSize),
    [DynamicEnumType.tabSetting]: _connect(ITabSetting),
    [DynamicEnumType.autoRefRule]: _connect(IAutoRefRule),
    [DynamicEnumType.securityFlag]: _connect(UserSecurityFlag),
    [DynamicEnumType.showInfluence]: _connect(ShowInfluence),
    [DynamicEnumType.hasAddBtn]: _connect(IHasAddBtn),
    [DynamicEnumType.userStatus]: _connect(UserStatus),
    [DynamicEnumType.isShowWorkOrderCount]: _connect(IShowMemberGroupCount),
    [DynamicEnumType.fieldEncryptMode]: _connect(IFieldEncryptMode),
    [DynamicEnumType.serviceTimeRange]: _connect(IServiceTimeRange),
    [DynamicEnumType.timeRangType]: _connect(ITimeRangeType),
    [DynamicEnumType.extendSetting]: _connect(IExtendSetting),
    [DynamicEnumType.contentExtension]: _connect(IContentExtension),
    [DynamicEnumType.commonCheckbox]: _connect(IFormCommonCheckbox),
    [DynamicEnumType.commonRadio]: _connect(IFormCommonRadio),
  };
};

export const handleValueToLabel = (value, enums) => {
  const _enums = Array.isArray(enums)
    ? enums?.map((item) => {
        return {
          ...item,
          value: item.id || item.value,
        };
      })
    : [];
  const valueIsArray = Array.isArray(value);
  const enumsMap = helper.convertToKeyVal(_enums);

  return valueIsArray
    ? value
        ?.map((item) => {
          return enumsMap[item]?.label || undefined;
        })
        .filter(Boolean)
    : enumsMap[value]?.label || '';
};

const utils = {
  isLoading: (state) => state === 'loading',
  skeleton: <Skeleton active paragraph={{ rows: 1 }} title={false} />,
  spin: <Spin />,
  handleValueToLabel,
};

export const EditableCell = ({ ...props }) => {
  const {
    value,
    column,
    t,
    utils,
    onCellChange,
    row,
    disabledRows,
    formReadOnly,
    useByChanges,
    linkOption,
    linkageChangeOptions,
    tableKey,
    linkageSetFieldHint,
    setDateRange,
    columnState
  } = props || {};
  const { orderInfo } = t || {};
  const rowNum = row?.index + '';
  const filedCode = column?.key;
  const xComponent = column?.['x-component'] || '';
  const attrId = column?.['attrId'] || '';
  const xProps = column?.['x-props'] || {};
  // 线上出现过这个问题，'x-props'中有disabled属性
  // 正常情况下应该是没有的，这会影响到只读
  delete xProps.disabled; // sonar扫描认这种格式
  const xDisabled =
    (column?.disabled?.indexOf(row?.index) > -1 ||
      column?.disabled?.indexOf(-1) > -1) &&
    !(column?.editable?.indexOf(row?.index) > -1);
  const disabled =
    xDisabled ||
    disabledRows?.indexOf(rowNum) != -1 ||
    formReadOnly ||
    orderInfo?.readOnlyflag ||
    useByChanges; // useByChanges用于页签的改动记录，只读标识
  const filterObj = linkOption?.[rowNum]?.[filedCode];
  const changeOptions = linkageChangeOptions?.[rowNum]?.[filedCode];
  const dateRange = columnState?.[row?.original?.[$tableRowKey]]?.[filedCode]?.dateRange || setDateRange?.[rowNum]?.[filedCode]
  const [val, setVal] = useState();
  // 获取字段的placeholder 字段联动指定了hintType=1，就用字段联动的，没指定，直接返回的字符串，直接用，不然用默认设置的
  const getPlaceholder = () => {
    if(linkageSetFieldHint?.[rowNum]?.[filedCode]?.hintType == 1){
      return linkageSetFieldHint?.[rowNum]?.[filedCode]?.hintContent
    }else if(typeof linkageSetFieldHint?.[rowNum]?.[filedCode] == 'string'){
      return linkageSetFieldHint?.[rowNum]?.[filedCode]
    }else{
      return xProps.placeholder
    }
  }
  useEffect(() => {
    setVal(value);
  }, [value]);

  // run 延迟调用 flush 立即调用
  const { run, flush } = useDebounceFn(
    (fieldCode, rowNum, v, l, needTriggerFieldlinkage) => {
      onCellChange(fieldCode || column?.key, rowNum, v, l, needTriggerFieldlinkage);
    },
    {
      wait: 500,
    }
  );

  let params = {
    value: val,
    t,
    utils,
    disabled,
    onBlur: (v, l, needTriggerFieldlinkage = true) => flush(xProps?.fieldCode || column?.key, rowNum, v, l, needTriggerFieldlinkage),
    onChange: (value, l, needTriggerFieldlinkage = true) => {
      setVal(value);
      run(xProps?.fieldCode, row?.index, value, l, needTriggerFieldlinkage);
    },
    changeOptions,
    tableKey,
    rowNum,
    ...xProps,
    placeholder: getPlaceholder(),
    dateRange: dateRange ?? xProps.dateRange,
  };

  if (filterObj && !checkType.isEmpty(filterObj))
    params = { ...params, filterObj };

  const EnumComponents = {
    [EnumType.input]: <IInput {...params} />,
    [EnumType.textarea]: <ITextArea {...params} isTableItem={true} />,
    [EnumType.date]: (
      <IDate {...params} suffixIcon={<span></span>} isTableItem={true} />
    ),

    [EnumType.radio]: <ISelectV2 {...params} />,
    [EnumType.select]: <ISelectV2 {...params} />,
    [EnumType.checkbox]: <ISelectMany {...params} isCheckbox={true} />,
    [EnumType.selectMany]: <ISelectMany {...params} />,
    [EnumType.multiSelect]: <IMultiSelect {...params} />,
    [EnumType.number]: <INumber {...params} />,
    [EnumType.member]: <IMember {...params} />,
    [EnumType.group]: <IGroup {...params} />,
    [EnumType.text]: <IText {...params} />,
    // [EnumType.position]: <IPosition {...params} />,
    [EnumType.autoNumber]: <IAutoNumber {...params} />,
    [EnumType.dpConfig]: <INewConfig {...params} />,
    [EnumType.upload]: <IUpload {...params} componentStyleMode={2} />,
  };
  // console.log(filterObj,'EditableCell');
  if (xComponent == EnumType.customConfigGuration) {
    return <ITableCustomConfigGuration {...params} />;
  }
  if (xComponent == EnumType.dpConfig) {
    return <INewConfig {...params} isTableItem={true} />;
  }

  return <div>{EnumComponents[xComponent]}</div>;
};

/* 默认值枚举 */
export const defaultEnum = {
  none: 'NONE',
  currentUser: 'CURRENT_USER',
  custom: 'CUSTOM',
  currentUserLeader: 'CURRENT_USER_LEADER',
  currentFieldLeader: 'FOLLOW_FIELD_LEADER',
};
export const EnumFieldHintType = {
  INNER: {
    value: 1,
    get label() {
      return intl
        .get('f92485ab-f710-430d-8d6b-1b940b7d67ca')
        .d('输入框内展示提示内容');
    },
  },
  BUBBLE: {
    value: 2,
    get label() {
      return intl
        .get('763ed2e4-ee54-42be-98f9-50a2eb2e04e1')
        .d('悬浮窗展示提示内容');
    },
  },
  ABOVE: {
    value: 4,
    get label() {
      return intl
        .get('3c049f76-0b57-4b27-a27d-e246a203e61e')
        .d('提示内容常显在字段上');
    },
  },
  BELOW: {
    value: 3,
    get label() {
      return intl
        .get('7f2d5d0a-df3c-4d74-aa12-48d6405b9fe2')
        .d('提示内容常显在字段下');
    },
  },
};

export const EnumAllFilesFuntion = () => {
  const enumAllFiles = {
    commonDocuments: {
      label: intl.get('d6dc745a-136d-45be-b978-44eff16fd500').d('常见文档'),
      value: window.DOSM_CONFIG?.enumAcceptDocuments
        ?.split(',')
        ?.map((i) => i.substring(1)),
      checked: true,
    },
    picture: {
      label: intl.get('9dd2f495-6de9-4318-88e9-85e49a0885f0').d('图片'),
      value: window.DOSM_CONFIG?.enumAcceptPicture
        ?.split(',')
        ?.map((i) => i.substring(1)),
      checked: true,
    },
    video: {
      label: intl.get('2268f941-9ac7-4f4d-a6cd-5f1af8b50366').d('音视频'),
      value: window.DOSM_CONFIG?.enumAcceptVideo
        ?.split(',')
        ?.map((i) => i.substring(1)),
      checked: false,
    },
    other: {
      label: intl.get('0f7145dc-e649-411d-a547-caff634d4e6a').d('其它'),
      value: window.DOSM_CONFIG?.enumAcceptOther
        ?.split(',')
        ?.map((i) => i.substring(1)),
      checked: false,
    },
  };

  return enumAllFiles;
};
