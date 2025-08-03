'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getMineNotificationTargets } from '@/service/notification';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import AddNotificationTarget from '@/components/notification/add-notification-target';
import NotificationTargetCard from '@/components/notification/notification-target-card';

const NotificationTargetManagePage = () => {
	const t = useTranslations();

	const { data, isFetching, isRefetching, isSuccess } = useQuery({
		queryKey: ['notification-target'],
		queryFn: async () => {
			return await getMineNotificationTargets();
		},
	});

	return (
		<>
			<div className='px-5 pb-5'>
				<Alert className='mb-5'>
					<Info />
					<AlertDescription>
						{t('setting_notification_target_manage_alert')}
					</AlertDescription>
				</Alert>
				<div className='flex flex-row justify-end mb-5 items-center'>
					<AddNotificationTarget />
				</div>
				<div>
					{isFetching && !isRefetching && <Skeleton className='w-full h-64' />}
					{isSuccess && data && data?.data.length === 0 && (
						<div className='bg-muted text-muted-foreground rounded text-xs h-64 flex items-center justify-center'>
							{t('setting_notification_target_empty')}
						</div>
					)}
					{isSuccess && data && data?.data?.length !== 0 && (
						<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
							{data &&
								data?.data.map((item) => {
									return (
										<NotificationTargetCard
											key={item.id}
											notification_target={item}
										/>
									);
								})}
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default NotificationTargetManagePage;
