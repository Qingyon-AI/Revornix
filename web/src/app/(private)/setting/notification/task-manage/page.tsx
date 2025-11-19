'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
	getMineNotificationTask,
	updateNotificationTask,
} from '@/service/notification';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import AddNotificationTask from '@/components/notification/add-notification-task';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import UpdateNotificationTask from '@/components/notification/update-notification-task';
import DeleteNotificationTask from '@/components/notification/delete-notification-task';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PaginationNotificationTask } from '@/generated';
import { NotificationContentType } from '@/enums/notification';

interface NotificationTarget {
	id: number;
	title: string;
	description: string | null;
	create_time: string;
	update_time: string | null;
}

interface NotificationSource {
	id: number;
	title: string;
	description: string | null;
	create_time: string;
	update_time: string | null;
}

const NotificationTaskManagePage = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [pageNum, setPageNum] = useState(1);
	const [pageSize, setPageSize] = useState(5);

	let { data, isLoading } = useQuery({
		queryKey: ['notification-task', pageNum, pageSize],
		queryFn: () =>
			getMineNotificationTask({
				page_num: pageNum,
				page_size: pageSize,
			}),
	});

	const mutateUpdate = useMutation({
		mutationFn: updateNotificationTask,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({
				queryKey: ['notification-task', pageNum, pageSize],
			});

			const previousData = queryClient.getQueryData<PaginationNotificationTask>(
				['notification-task', pageNum, pageSize]
			);

			// 直接进行乐观更新
			queryClient.setQueryData<PaginationNotificationTask>(
				['notification-task', pageNum, pageSize],
				(old) => {
					if (!old) return old;
					return {
						...old,
						elements: old.elements.map((item) =>
							item.id === variables.notification_task_id
								? { ...item, enable: variables.enable! }
								: item
						),
					};
				}
			);

			return { previousData };
		},
		onError(error, variables, context) {
			toast.error(error.message);
			// ❗ 必须恢复缓存
			if (context?.previousData) {
				queryClient.setQueryData(
					['notification-task', pageNum, pageSize],
					context.previousData
				);
			}
		},
		onSettled() {
			// 重拉数据，保证最终一致性
			queryClient.invalidateQueries({
				queryKey: ['notification-task', pageNum, pageSize],
			});
		},
	});

	const columns: ColumnDef<any>[] = [
		{
			accessorKey: 'notification_source',
			header: () => {
				return (
					<div className='w-full'>
						{t('setting_notification_task_manage_form_source')}
					</div>
				);
			},
			cell: ({ row }) => {
				const notification_source: NotificationSource = row.getValue(
					'notification_source'
				);
				return (
					<div className='flex flex-row gap-2 items-center'>
						{notification_source.title}
					</div>
				);
			},
		},
		{
			accessorKey: 'notification_target',
			header: () => {
				return (
					<div className='w-full'>
						{t('setting_notification_task_manage_form_target')}
					</div>
				);
			},
			cell: ({ row }) => {
				const notification_target: NotificationTarget = row.getValue(
					'notification_target'
				);
				return (
					<div className='flex flex-row gap-2 items-center'>
						{notification_target.title}
					</div>
				);
			},
		},
		{
			accessorKey: 'trigger_cron_expr',
			header: () => {
				return (
					<div className='w-full'>
						{t('setting_notification_task_manage_form_cron_expr')}
					</div>
				);
			},
			cell: ({ row }) => (
				<div className='flex flex-row gap-2 items-center'>
					{row.getValue('trigger_cron_expr')}
				</div>
			),
		},
		{
			accessorKey: 'notification_content_type',
			header: () => {
				return (
					<div className='w-full'>
						{t('setting_notification_task_manage_form_content_type')}
					</div>
				);
			},
			cell: ({ row }) => (
				<div className='flex flex-row gap-2 items-center'>
					{row.getValue('notification_content_type') ===
					NotificationContentType.CUSTOM
						? t('setting_notification_task_manage_form_content_type_custom')
						: t('setting_notification_task_manage_form_content_type_template')}
				</div>
			),
		},
		{
			accessorKey: 'enable',
			header: () => {
				return (
					<div className='w-full'>
						{t('setting_notification_task_manage_form_enable')}
					</div>
				);
			},
			cell: ({ row }) => (
				<div className='flex flex-row gap-2 items-center'>
					<Switch
						checked={row.getValue('enable')}
						onCheckedChange={(e) => {
							mutateUpdate.mutate({
								notification_task_id: row.original.id,
								enable: e,
							});
						}}
					/>
				</div>
			),
		},
		{
			id: 'actions',
			header: () => <div>{t('setting_notification_task_action')}</div>,
			cell: ({ row }) => {
				return (
					<div className='flex flex-row gap-2'>
						<UpdateNotificationTask notification_task_id={row.original.id} />
						<DeleteNotificationTask notification_task_id={row.original.id} />
					</div>
				);
			},
		},
	];

	const table = useReactTable({
		data: data?.elements || [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className='px-5 pb-5'>
			<div className='flex flex-row justify-end mb-5 items-center'>
				<AddNotificationTask />
			</div>
			<div className='rounded-md border'>
				{isLoading && <Skeleton className='w-full h-64' />}
				{!isLoading && (
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead key={header.id}>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext()
													  )}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className='h-24 text-center'>
										{t('account_api_key_empty')}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				)}
			</div>
			<div className='flex flex-row items-center justify-between mt-4'>
				<div className='text-xs text-muted-foreground'>
					{t('account_api_key_summary', {
						total: data?.total_elements || 0,
						pageNum: pageNum,
					})}
				</div>
				<div className='flex flex-row gap-2'>
					<Button
						variant={'outline'}
						onClick={() => setPageNum(pageNum - 1)}
						disabled={pageNum === 1}>
						{t('previous_page')}
					</Button>
					<Button
						variant={'outline'}
						onClick={() => setPageNum(pageNum + 1)}
						disabled={data && pageNum >= data?.total_pages}>
						{t('next_page')}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default NotificationTaskManagePage;
