'use client';

import AddNotificationSource from '@/components/notification/add-notification-source';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getMineNotificationSources } from '@/service/notification';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import NotificationSourceCard from '@/components/notification/notification-source-card';

const NotificationSourceManagePage = () => {
	const t = useTranslations();

	const { data, isFetching, isRefetching, isSuccess } = useQuery({
		queryKey: ['notification-source'],
		queryFn: async () => {
			return await getMineNotificationSources();
		},
	});

	return (
		<>
			<div className='px-5 pb-5'>
				<Alert className='mb-5'>
					<Info />
					<AlertDescription>
						{t('setting_notification_source_manage_alert')}
					</AlertDescription>
				</Alert>
				<div className='flex flex-row justify-end mb-5 items-center'>
					<AddNotificationSource />
				</div>
				<div>
					{isFetching && !isRefetching && <Skeleton className='w-full h-64' />}
					{isSuccess && data && data?.data.length === 0 && (
						<div className='bg-muted text-muted-foreground rounded text-xs h-64 flex items-center justify-center'>
							{t('setting_notification_source_empty')}
						</div>
					)}
					{isSuccess && data && data?.data?.length !== 0 && (
						<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
							{data &&
								data?.data.map((item) => {
									return (
										<NotificationSourceCard
											key={item.id}
											notification_source={item}
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

export default NotificationSourceManagePage;
