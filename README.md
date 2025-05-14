.dynamic-date {
    width: 100%;
    min-height: 20px;
    :global(.ant-picker) {
      width: 100%;
    }
    .readonly-date {
        width: 100%;
        display: inline-block;
        line-height: 29px;
        white-space: normal;
        word-break: break-all;
        padding-right: 8px;
    }
    :global(.ant-calendar-picker) {
        min-width: 100% !important;
        width: 100% !important;
    }
    :global(.ant-input.ant-input-disabled) {
        cursor: default;
        background-color: @background_color_33;
    }
    :global(.ant-input-disabled + .ant-calendar-picker-icon) {
        cursor: default;
    }
}

:global {
    .ant-picker-time-panel-column > li.ant-picker-time-panel-cell-disabled .ant-picker-time-panel-cell-inner {
        color: rgba(0, 0, 0, 0.25) !important;
    }
}
