.dynamic-number {
    display: flex;
    align-items: center;
    width: 100%;

    .readonly-number {
        width: 100%;
    }
}

.number-input-wrapper {
    display: flex !important;
    align-items: center;
    width: 100%;
    position: relative;
    padding-right: 0;

    :global {
        .ant-input {
            border: none !important;
            padding: 0;
            margin: 0;
            height: 28px;
            line-height: 28px;
            border-radius: 0;

            &:active {
                outline: none;
            }

            &:focus {
                box-shadow: none !important;
                outline: none !important;
            }
        }
    }
}

.number-btn-group {
    display: flex;
    align-items: center;
    flex-direction: row;
    border-left: 1px solid rgba(0, 0, 0, 0.15);
    font-size: 12px;
    position: relative;
    color: rgba(0, 0, 0, .45);

    &::after {
        background-color: rgba(0, 0, 0, .15);
        content: "";
        display: block;
        height: 16px;
        left: 50%;
        position: absolute;
        width: 1px;
    }
}

.number-btn {
    width: 36px;
    text-align: center;
    height: 28px;
    cursor: pointer;
    outline: none;
    transition: background 0.2s;
    border-radius: 0;
    line-height: 28px;

    &:disabled {
        color: #ccc;
        cursor: not-allowed;
        background: #f5f5f5;
    }

    &:active {
        background: #e6f7ff;
    }

    &:hover {
        color: @primary-color;
    }
}
