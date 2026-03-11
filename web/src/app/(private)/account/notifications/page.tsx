'use client';

import NotificationRecordCard from '@/components/notification/notification-record-card';
import NotificationRecordCardSkeleton from '@/components/notification/notification-record-card-skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getQueryClient } from '@/lib/get-query-client';
import {
	readAllNotificationRecords,
	searchNotificationRecords,
} from '@/service/notification';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { BadgeCheck, BellOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import {
	InifiniteScrollPagnitionNotificationRecord,
	NotificationRecord,
} from '@/generated';
import { mapInfiniteQueryElements } from '@/lib/infinite-query-cache';
import { useUserContext } from '@/provider/user-provider';

const NotificationsPage = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();
	const searchMyNotificationsQueryKey = [
		'searchMyNotifications',
		mainUserInfo?.id,
	] as const;

	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		isError,
		hasNextPage,
	} = useInfiniteQuery({
		enabled: !!mainUserInfo?.id,
		queryKey: [...searchMyNotificationsQueryKey, keyword],
		queryFn: (pageParam) =>
			searchNotificationRecords({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			keyword: keyword,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: keyword,
				  }
				: undefined;
		},
	});

	const mutate = useMutation({
		mutationFn: readAllNotificationRecords,
		onSuccess: () => {
			toast.success(t('notification_all_marked_read_done'));
			mapInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationRecord,
				NotificationRecord
			>(queryClient, searchMyNotificationsQueryKey, (item) => {
				if (item.read_at) return item;
				return {
					...item,
					read_at: new Date(),
				};
			});
		},
		onError: (err) => {
			toast.error(err.message);
			console.error(err);
		},
	});

	const notifications = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage, fetchNextPage]);
	return (
		<div className='pb-5 px-5 w-full flex-1 overflow-auto'>
			<Tabs defaultValue='systemAlert' className='h-full flex flex-col'>
				<div className='w-full justify-between items-center flex gap-4'>
					<TabsList>
						<TabsTrigger value='systemAlert'>
							{t('notification_system')}
						</TabsTrigger>
					</TabsList>
					<Button
						disabled={mutate.isPending}
						variant={'secondary'}
						onClick={() => mutate.mutate()}>
						{t('notification_all_marked_read')}
						<BadgeCheck />
						{mutate.isPending && <Loader2 className='animate-spin' />}
					</Button>
				</div>
				<TabsContent value='systemAlert' className='flex-1 overflow-auto'>
					{isError && (
						<div className='flex flex-col items-center justify-center h-full'>
							<div className='text-sm text-muted-foregroun flex flex-col items-center justify-center gap-2'>
								<p>{t('something_wrong')}</p>
							</div>
						</div>
					)}
					{isSuccess && notifications && notifications.length === 0 && (
						<Empty className='h-full'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<BellOff />
								</EmptyMedia>
								<EmptyDescription>{t('notification_empty')}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
					<div className='flex flex-col gap-3'>
						{isFetching && !data && (
							<>
								{[...Array(20)].map((number, index) => {
									return <NotificationRecordCardSkeleton key={index} />;
								})}
							</>
						)}
						{isFetchingNextPage && data && (
							<>
								{[...Array(20)].map((number, index) => {
									return <NotificationRecordCardSkeleton key={index} />;
								})}
							</>
						)}
						{notifications &&
							notifications.map((notification, index) => {
								return (
									<NotificationRecordCard
										key={index}
										notification={notification}
									/>
								);
							})}
						<div ref={bottomRef}></div>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default NotificationsPage;
