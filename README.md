.dosm-basic-layout{
  .extra{
    display: flex;
    align-items: center;
    justify-content: flex-end;
    // width: 201px;
    height: 100%;
    // padding: 0 10px;
  }
  .dosm-custom-content{
    background-color: transparent !important;
  }
  :global{
    //.cw-content-wrapper{
    //  padding-top: 0 !important;
    //}
    // .@{table-prefix-cls}-scroll{
    //   // 修复新版本谷歌浏览器表格头部展示异常问题
    //   .@{table-prefix-cls}-header:not(.@{table-prefix-cls}-hide-scrollbar){
    //       overflow-y: hidden;
    //   }
    // }
  }
  /* 设置滚动条的样式 */
  :global(.cw-menu-box::-webkit-scrollbar) {
    width: 8px;
  }

  /* 滚动槽 */
  :global(.cw-menu-box::-webkit-scrollbar-track) {
    border-radius: 10px;
  }

  /* 滚动条滑块 */
  :global(.cw-menu-box::-webkit-scrollbar-thumb) {
    border-radius: 10px;
    background: @background_color_134;
  }

  /* :TODO:暂时去掉内容区域距离顶部边距,待与UIUE沟通后设计页面再修改 */
  :global(.cw-layout-wrapper-content) {
    padding-top: 0!important;
    background-color: rgb(245, 247, 249);
  }
}

.dosm-basic-layout-fixed{
  :global{
    .cw-content-wrapper{
      //padding-top: 24px !important;
      padding: 0 !important;
    }
  }
   /* 设置滚动条的样式 */
   :global(.cw-menu-box::-webkit-scrollbar) {
     width: 8px;
   }

   /* 滚动槽 */
   :global(.cw-menu-box::-webkit-scrollbar-track) {
     border-radius: 10px;
   }

   /* 滚动条滑块 */
   :global(.cw-menu-box::-webkit-scrollbar-thumb) {
     border-radius: 10px;
     background: @background_color_134;
  }

}


.layout-without-sider{
  :global(.cw-content-layout){
    min-width: auto !important;
  }
}

.message{
  display: inline-block;

  :global(.cw-message-wrapper_){
    margin-top:18px;
    margin-right:24px;
  }
}

:global(.@{ant-prefix}-picker-dropdown.@{ant-prefix}-slid-up-leave){
  display: none;
}
:global(.ant-tabs-content) {
  height: 100%;
}
// :global(.ant-tabs-nav-list > .ant-tabs-tab) {
//   // margin: 0 32px 0 0;
// }

// :global(.ant-tabs-nav .ant-tabs-tab) {
//   font-size: 14px;
//   font-weight: 500;
//   height: 32px !important;
// }
// :global(.ant-tabs-nav .ant-tabs-tab-active) {
//   font-weight: 400 !important;
//   // &::before {
//     // background-color: @primary-color;
//   // }
// }
// :global(.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn) {
//   text-shadow: none;
// }

// :global(.ant-tabs-tab) {
//   font-size: 14px;
// }

:global(.fs-16) {
  * {
    font-size: 18px;
  }
  :global(*) {
    font-size: 18px;
  }
}
:global(.fs-14) {
  * {
    font-size: 16px;
  }
  :global(*) {
    font-size: 16px;
  }
}
:global(.fs-12) {
  * {
    font-size: 14px;
  }
  :global(*) {
    font-size: 14px;
  }
}

:global(.ant-picker-input > input) {
  font-size: inherit;
}
:global(.ant-modal-confirm-body-wrapper) {
  overflow: hidden;
  :global(.ant-modal-confirm-btns) {
    max-width: 100%;
    :global(.ant-btn) {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
:global(.ant-modal-confirm-title) {
  word-break: break-all;
}
:global(.ant-modal-confirm-btns .ant-btn) {
  min-height: 32px;
  height: auto;
  white-space: wrap !important;
}
:global(.ant-table-tbody > tr > td) {
  overflow: hidden;
}

// 兼容70版本chrome浏览器
:global(.ant-tabs-content-holder) {
  height: 100%;
}
// ::-webkit-scrollbar {
//   width: 8px;
//   height: 8px;
//   background-color: #f8f8f8;
// }
::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 8px;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover {
  background-color: #ccc;
}

// tooltip展示偏移
:global(.ant-tooltip-placement-topLeft .ant-tooltip-arrow){
  left: 0;
}
// 临时处理 portal tab视图样式问题
:global(.portal-tabs-wrapper.portal-tabs .portal-tabs-nav .portal-tabs-tab){
  padding: 8px 15px;
}



:global(.ant-collapse){
//  margin-bottom: 24px;
 border-radius: 8px;
 background: transparent;
}

:global(.ant-collapse >.ant-collapse-item > .ant-collapse-header){
  display: flex;
  align-items: center;
  font-size: 16px !important;
  border-radius: 8px !important;
  height: 48px;
 }

 :global(.ant-collapse >.ant-collapse-item-active > .ant-collapse-header){
  border-radius: 8px 8px 0 0 !important;
 }

 :global(.ant-collapse >.ant-collapse-item){
  margin-bottom: 24px;
  border-radius: 8px !important;
  box-shadow: 0px 0px 1px 0px rgba(0,0,0,0.25), 0px 2px 4px 0px rgba(0,0,0,0.05) !important;
 }

 
 :global(.ant-collapse-content){
  border-radius: 0 0 8px 8px !important;
  border: none !important;
  border-top: 1px solid #eef2f5 !important;
 }

 :global(.reply-collapse-container > .ant-tabs){
  border-radius: 8px !important;
  border: none !important;
  box-shadow: 0px 0px 1px 0px rgba(0,0,0,0.25), 0px 2px 4px 0px rgba(0,0,0,0.05) !important;
 }

 :global(.ant-form > .ant-tabs){
  border-radius: 8px !important;
  border: none !important;
  box-shadow: 0px 0px 1px 0px rgba(0,0,0,0.25), 0px 2px 4px 0px rgba(0,0,0,0.05) !important;
 }

 :global(.ant-form-item-children){
   color: #172733 !important;
 }

 :global(.ant-alert-message){
   font-size: 14px;
}

:global(.ant-tabs-nav-wrap){
  padding-left: 0 !important;
}
