'use client';

import AddNotificationSource from '@/components/notification/add-notification-source';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getMineNotificationSources } from '@/service/notification';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Info, Send, XCircleIcon } from 'lucide-react';
import NotificationSourceCard from '@/components/notification/notification-source-card';
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

const NotificationSourceManagePage = () => {
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
		queryKey: ['searchNotificationSources', keyword],
		queryFn: (pageParam) =>
			getMineNotificationSources({ ...pageParam.pageParam }),
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
	const notification_sources = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage]);

	return (
		<>
			<Separator className='mb-5' />
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Alert className='bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-500 border-none'>
					<Info className='size-4' />
					<AlertTitle>
						{t('setting_notification_source_manage_alert')}
					</AlertTitle>
					<AlertDescription>
						{t('setting_notification_source_manage_alert_detail')}
					</AlertDescription>
				</Alert>
			</div>
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Input
					placeholder={t('setting_notification_source_manage_search')}
					value={keyword}
					onChange={(e) => setKeyword(e.target.value)}
				/>
				<AddNotificationSource />
			</div>
			{isSuccess && notification_sources.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<Send />
						</EmptyMedia>
						<EmptyDescription>
							{t('setting_notification_source_manage_empty')}
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
				{notification_sources &&
					notification_sources.map((notification_source, index) => {
						return (
							<div
								className='h-full'
								key={index}
								ref={
									index === notification_sources.length - 1
										? bottomRef
										: undefined
								}>
								<NotificationSourceCard
									notification_source={notification_source}
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

export default NotificationSourceManagePage;
