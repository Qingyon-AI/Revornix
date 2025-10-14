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
import { useTranslations } from 'next-intl';

const NotificationTaskManagePage = () => {
	const t = useTranslations();
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
					{t('setting_notification_task_empty')}
				</div>
			)}
			{isSuccess && !isFetching && data?.data.length > 0 && (
				<div className='p-3 rounded-xl bg-muted'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('setting_notification_task_source')}</TableHead>
								<TableHead>{t('setting_notification_task_target')}</TableHead>
								<TableHead>
									{t('setting_notification_task_content_template')}
								</TableHead>
								<TableHead>{t('setting_notification_task_title')}</TableHead>
								<TableHead>{t('setting_notification_task_content')}</TableHead>
								<TableHead>
									{t('setting_notification_task_cron_expr')}
								</TableHead>
								<TableHead>
									{t('setting_notification_task_enable_status')}
								</TableHead>
								<TableHead>
									{t('setting_notification_task_enable_action')}
								</TableHead>
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
