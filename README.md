import React, { useEffect, useRef, useState } from 'react'
import { observer } from '@chaoswise/cw-mobx'
import FilterArea from './FilterArea/index'
import ListView from './ListView/index'
import { withRouter } from 'react-router-dom'
import DoPagination from "@/components/DoPagination";
import Box from '@/components/Box';
import { Spin } from 'antd';

const ExceptTabsContent = ({ orderManageStore, history, isType, disabledFilter, isCustomView }) => {
	const {
		updateState,
		currentPage,
		totalCount,
		pageSize,
		getList,
		loading,
		curSilderKey,
		list,
	} = orderManageStore

	const filterRef = useRef()
	const [filterHeight, setFilterHeight] = useState(0)

	useEffect(() => {
		//获取高级筛选区域的高度
		setFilterHeight(filterRef?.current?.clientHeight || 0)
	}, [filterRef?.current?.clientHeight])

	return (
		<div className="right-wrap">
				<Spin
				indicator={<div></div>}
				spinning={list == null ? true : (loading ? true : false)}
				>
				{
					!disabledFilter && (
						<div className="filterArea">
							<FilterArea orderManageStore={orderManageStore} filterRef={filterRef} history={history} isType={isType} />
						</div>
					)
				}
				</Spin>
				<Box loading={loading}>
				<div className="tableArea" style={{ height: `calc(100% - ${filterHeight}px)`, width: '100%' }}>
					<ListView orderManageStore={orderManageStore} filterHeight={filterHeight} activeKey={curSilderKey} disabledFilter={disabledFilter} isCustomView={isCustomView}></ListView>
				</div>
				<div className="page" key='page'>
					{
						list?.length > 0 ?
							<DoPagination
								current={currentPage}
								total={totalCount}
								pageSize={pageSize}
								onChange={current => {
									updateState({
										currentPage: current
									})
									// getList()
									getList(false, {}, false, false);
								}}
								onPageSize={(_, pageSize) => {
									updateState({
										currentPage: 1,
										pageSize: _
									})
									// getList()
									getList(false, {}, false, false);
								}}
								pageSizeOptions={['30', '50', '100']}
							/> : null
					}
				</div>
				</Box>



			<style jsx>{`
				.right-wrap{
					height:100%;
         			display: flex;
          			flex-direction: column;
					.tableArea {
            			flex: 1;
					}
					.page{
						margin-right:38px;
						height:50px;

						:global(.do-pagination .cw-pagination-wrapper){
							padding-bottom: 0px;
						}
					}
					:global(.ant-table-column-sorters){
						table-layout: fixed;
						width: 100%;
						:global(.ant-table-column-title){
							width: 100%;
							:global(.DoTable-column-sorters){
								display: flex;
								:global(.ant-table-column-title){
									width: auto;
									max-width: calc(100% - 30px);
								}
							}
						}
					}
					// :global(.ant-spin-nested-loading > div > .ant-spin){
					// 	height:calc(100vh - 500px);
					// 	max-height:100vh;
					// }
				}

      `}</style>
		</div>
	)
}

export default withRouter(observer(ExceptTabsContent))
