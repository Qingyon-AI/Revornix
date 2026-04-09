'use client';

import AddNotificationTarget from '@/components/notification/add-notification-target';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getMineNotificationTargets } from '@/service/notification';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bell, Info, XCircleIcon } from 'lucide-react';
import NotificationTargetCard from '@/components/notification/notification-target-card';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';

const NotificationTargetManagePage = () => {
	const t = useTranslations();

	const { ref: bottomRef, inView } = useInView();
	const [keyword, setKeyword] = useState('');

	const {
		data,
		isFetchingNextPage,
		isFetching,
		isError,
		error,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchNotificationTargets', keyword],
		queryFn: (pageParam) =>
			getMineNotificationTargets({ ...pageParam.pageParam }),
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
	const notification_targets =
		data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage]);

	return (
		<>
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Alert className='bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-500 border-none'>
					<Info className='size-4' />
					<AlertTitle>
						{t('setting_notification_target_manage_alert')}
					</AlertTitle>
					<AlertDescription>
						{t('setting_notification_target_manage_alert_detail')}
					</AlertDescription>
				</Alert>
			</div>
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Input
					placeholder={t('setting_notification_target_manage_search')}
					value={keyword}
					onChange={(e) => setKeyword(e.target.value)}
				/>
				<AddNotificationTarget />
			</div>
			{isSuccess && notification_targets.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<Bell />
						</EmptyMedia>
						<EmptyDescription>
							{t('setting_notification_target_manage_empty')}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			{isError && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<XCircleIcon />
						</EmptyMedia>
						<EmptyDescription>{error.message}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			<div className='grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4 px-5 pb-5'>
				{notification_targets &&
					notification_targets.map((notification_target, index) => {
						return (
							<div
								className='h-full'
								key={index}
								ref={
									index === notification_targets.length - 1
										? bottomRef
										: undefined
								}>
								<NotificationTargetCard
									notification_target={notification_target}
								/>
							</div>
						);
					})}
				{isFetching && !data && (
					<>
						{[...Array(12)].map((number, index) => {
							return <Skeleton key={index} className='h-64 w-full' />;
						})}
					</>
				)}
				{isFetchingNextPage && data && (
					<>
						{[...Array(12)].map((number, index) => {
							return <Skeleton key={index} className='h-64 w-full' />;
						})}
					</>
				)}
			</div>
		</>
	);
};

export default NotificationTargetManagePage;
