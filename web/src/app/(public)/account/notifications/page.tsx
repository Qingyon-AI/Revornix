'use client';

import NotificationCard from '@/components/notification/notification-card';
import NotificationCardSkeleton from '@/components/notification/notification-card-skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getQueryClient } from '@/lib/get-query-client';
import {
	readAllNotifications,
	searchNotifications,
} from '@/service/notification';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useGetSet } from 'react-use';
import { toast } from 'sonner';

const NotificationsPage = () => {
	const queryClient = getQueryClient();
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();

	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		isError,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchMyNotifications', keyword],
		queryFn: (pageParam) => searchNotifications({ ...pageParam.pageParam }),
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
		mutationFn: readAllNotifications,
		onSuccess: () => {
			toast.success('已全部标记为已读');
			queryClient.invalidateQueries({
				queryKey: ['searchMyNotifications', keyword],
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
	}, [inView]);
	return (
		<div className='pb-5 px-5 w-full flex-1 overflow-auto'>
			<Tabs defaultValue='systemAlert' className='h-full flex flex-col'>
				<div className='w-full justify-between items-center flex gap-4'>
					<TabsList>
						<TabsTrigger value='systemAlert'>系统通知</TabsTrigger>
					</TabsList>
					<Button
						disabled={mutate.isPending}
						variant={'secondary'}
						onClick={() => mutate.mutate()}>
						一键已读
						<BadgeCheck />
						{mutate.isPending && <Loader2 className='animate-spin' />}
					</Button>
				</div>
				<TabsContent value='systemAlert' className='flex-1 overflow-auto'>
					{isError && (
						<div className='flex flex-col items-center justify-center h-full'>
							<div className='text-sm text-muted-foregroun flex flex-col items-center justify-center gap-2'>
								<p>哦不～</p>
								<p>后台出问题啦，请稍后再试</p>
							</div>
						</div>
					)}
					{isSuccess && notifications && notifications.length === 0 && (
						<div className='flex flex-col items-center justify-center h-full'>
							<p className='text-sm text-muted-foreground'>暂无内容</p>
						</div>
					)}
					<div className='flex flex-col gap-3'>
						{isFetching && !data && (
							<>
								{[...Array(20)].map((number, index) => {
									return <NotificationCardSkeleton key={index} />;
								})}
							</>
						)}
						{isFetchingNextPage && data && (
							<>
								{[...Array(20)].map((number, index) => {
									return <NotificationCardSkeleton key={index} />;
								})}
							</>
						)}
						{notifications &&
							notifications.map((notification, index) => {
								return (
									<NotificationCard key={index} notification={notification} />
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
