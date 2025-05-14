.dynamic-number {
    width: 100%;
    min-height: 20px;
    .readonly-number {
        width: 100%;
        display: inline-block;
        line-height: 29px;
        white-space: normal;
        word-break: break-all;
        padding-right: 8px;
    }
    :global(.ant-input-number-disabled .ant-input-number-input) {
        cursor: default;
        width: 100%;
        background-color: @background_color_33;
    }
}
