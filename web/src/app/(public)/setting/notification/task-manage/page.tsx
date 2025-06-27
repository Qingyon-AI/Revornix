'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { getMineNotificationTask } from '@/service/notification';
import { useQuery } from '@tanstack/react-query';
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import AddNotificationTask from '@/components/notification/add-notification-task';
import NotificationTaskItem from '@/components/notification/notification-task-item';

const NotificationTaskManagePage = () => {
	const { data, isFetching, isSuccess } = useQuery({
		queryKey: ['notification-task'],
		queryFn: getMineNotificationTask,
	});
	return (
		<div className='px-5 pb-5'>
			<div className='flex flex-row justify-end mb-5 items-center'>
				<AddNotificationTask />
			</div>
			{isFetching && <Skeleton className='w-full h-64' />}
			{isSuccess && !isFetching && data?.data.length === 0 && (
				<div className='bg-muted text-muted-foreground rounded text-xs h-64 flex items-center justify-center'>
					暂无相关内容
				</div>
			)}
			{isSuccess && !isFetching && data?.data.length > 0 && (
				<div className='p-3 rounded-xl bg-muted'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>通知源</TableHead>
								<TableHead>通知目标</TableHead>
								<TableHead>通知标题</TableHead>
								<TableHead>通知内容</TableHead>
								<TableHead>cron表达式</TableHead>
								<TableHead>启用状态</TableHead>
								<TableHead>操作</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.data.map((task, index) => (
								<TableRow key={index}>
									<NotificationTaskItem task={task} />
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
};

export default NotificationTaskManagePage;
