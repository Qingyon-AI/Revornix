'use client';

import NotificationRecordCard from '@/components/notification/notification-record-card';
import NotificationRecordCardSkeleton from '@/components/notification/notification-record-card-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getQueryClient } from '@/lib/get-query-client';
import {
	readAllNotificationRecords,
	searchNotificationRecords,
} from '@/service/notification';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { BadgeCheck, BellOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useEffect, useState } from 'react';
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
	const deferredKeyword = useDeferredValue(keyword.trim());
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
		queryKey: [...searchMyNotificationsQueryKey, deferredKeyword],
		queryFn: (pageParam) =>
			searchNotificationRecords({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			keyword: deferredKeyword || undefined,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: deferredKeyword || undefined,
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
				<div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<TabsList>
						<TabsTrigger value='systemAlert'>
							{t('notification_system')}
						</TabsTrigger>
					</TabsList>
					<div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center'>
						<Input
							value={keyword}
							onChange={(event) => setKeyword(event.target.value)}
							placeholder={t('notification_search_placeholder')}
							className='w-full sm:w-72'
						/>
						<Button
							disabled={mutate.isPending}
							variant={'secondary'}
							onClick={() => mutate.mutate()}>
							{t('notification_all_marked_read')}
							<BadgeCheck />
							{mutate.isPending && <Loader2 className='animate-spin' />}
						</Button>
					</div>
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
								<EmptyDescription>
									{deferredKeyword
										? t('notification_search_empty')
										: t('notification_empty')}
								</EmptyDescription>
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
									<div
										key={index}
										ref={
											index === notifications.length - 1
												? bottomRef
												: undefined
										}>
										<NotificationRecordCard notification={notification} />
									</div>
								);
							})}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default NotificationsPage;
