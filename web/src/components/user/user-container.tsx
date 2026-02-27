'use client';

import { followUser, getUserInfo } from '@/service/user';
import {
	InfiniteData,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from '@tanstack/react-query';
import { Separator } from '../ui/separator';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { searchUserSection } from '@/service/section';
import SectionCard from '../section/section-card';
import SectionCardSkeleton from '../section/section-card-skeleton';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
	InifiniteScrollPagnitionUserPublicInfo,
	UserPublicInfo,
} from '@/generated';
import {
	filterInfiniteQueryElements,
	mapInfiniteQueryElements,
} from '@/lib/infinite-query-cache';

const UserContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const userFollowsQueryKey = ['getUserFollows', mainUserInfo?.id] as const;
	const userFansQueryKey = ['getUserFans', mainUserInfo?.id] as const;

	const { data: userInfo, isFetching: isFetchingUserInfo } = useQuery({
		queryKey: ['userInfo', id],
		queryFn: async () => {
			return getUserInfo({ user_id: id });
		},
	});

	const {
		data,
		isFetchingNextPage,
		isFetching: isFetchingSections,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchUserSection', keyword, id],
		queryFn: (pageParam) => searchUserSection({ ...pageParam.pageParam }),
		initialPageParam: {
			user_id: id,
			limit: 10,
			keyword: keyword,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: keyword,
						user_id: id,
					}
				: undefined;
		},
	});

	const mutateFollow = useMutation({
		mutationFn: async () => {
			if (!userInfo) return;
			return followUser({
				to_user_id: id,
				status: userInfo.is_followed ? false : true,
			});
		},
		onMutate(variables) {
			if (!userInfo) return;

			const previousUserInfo = queryClient.getQueryData<UserPublicInfo>([
				'userInfo',
				id,
			]);
			const previousUserFollows = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionUserPublicInfo>
			>({
				queryKey: userFollowsQueryKey,
			});
			const previousUserFans = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionUserPublicInfo>
			>({
				queryKey: userFansQueryKey,
			});

			const isFollowed = !!userInfo.is_followed;
			const nextFollowStatus = !isFollowed;

			queryClient.setQueryData<UserPublicInfo>(['userInfo', id], (old) => {
				if (!old) return old;
				return {
					...old,
					is_followed: nextFollowStatus,
					fans: Math.max(0, (old.fans ?? 0) + (nextFollowStatus ? 1 : -1)),
				};
			});

			if (!nextFollowStatus) {
				filterInfiniteQueryElements<
					InifiniteScrollPagnitionUserPublicInfo,
					UserPublicInfo
				>(queryClient, userFollowsQueryKey, (item) => item.id !== id);
			} else {
				mapInfiniteQueryElements<
					InifiniteScrollPagnitionUserPublicInfo,
					UserPublicInfo
				>(queryClient, userFollowsQueryKey, (item) => {
					if (item.id !== id) return item;
					return {
						...item,
						is_followed: true,
					};
				});
			}

			mapInfiniteQueryElements<
				InifiniteScrollPagnitionUserPublicInfo,
				UserPublicInfo
			>(queryClient, userFansQueryKey, (item) => {
				if (item.id !== id) return item;
				return {
					...item,
					is_followed: nextFollowStatus,
				};
			});

			return { previousUserInfo, previousUserFollows, previousUserFans };
		},
		onError(error, variables, context) {
			toast.error(`${error.message}`);
			if (context?.previousUserInfo) {
				queryClient.setQueryData(['userInfo', id], context.previousUserInfo);
			}
			context?.previousUserFollows?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
			context?.previousUserFans?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
		},
		onSuccess(data, variables, context) {
			refreshMainUserInfo();
		},
	});

	const sections = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetchingSections && hasNextPage && fetchNextPage();
	}, [inView, isFetchingSections, hasNextPage, fetchNextPage]);

	return (
		<div className='px-5 pb-5'>
			<div>
				<div className='mb-5'>
					{isFetchingUserInfo && !userInfo && (
						<Skeleton className='w-full h-52' />
					)}
					{userInfo && (
						<div className='w-full flex flex-col items-center justify-center'>
							{userInfo.avatar && (
								<Avatar
									className='size-24 mb-3'
									title={
										userInfo.nickname ? userInfo.nickname : 'Unknown User'
									}>
									<AvatarImage
										className='object-cover'
										src={userInfo.avatar}
										alt='user avatar'
									/>
									<AvatarFallback>{userInfo.nickname}</AvatarFallback>
								</Avatar>
							)}
							<p className='font-bold text-2xl mb-2'>{userInfo.nickname}</p>
							<p className='text-muted-foreground mb-2'>
								{userInfo.slogan ? userInfo.slogan : t('user_slogan_empty')}
							</p>
							<div className='flex flex-row gap-5 items-center mb-2'>
								<div>
									{t('user_fans')}{' '}
									<span className='font-bold'>{userInfo.fans}</span>
								</div>
								<div className='text-muted-foreground text-xs'>|</div>
								<div>
									{t('user_follows')}{' '}
									<span className='font-bold'>{userInfo.follows}</span>
								</div>
							</div>
							<div className='flex flex-row items-center justify-center gap-2'>
								{userInfo.is_followed ? (
									<Button
										disabled={mutateFollow.isPending}
										variant={'destructive'}
										onClick={() => mutateFollow.mutate()}>
										{t('user_cancel_follow')}
									</Button>
								) : (
									<Button
										disabled={mutateFollow.isPending}
										onClick={() => mutateFollow.mutate()}>
										{t('user_follow')}
									</Button>
								)}
							</div>
						</div>
					)}
				</div>
				<Separator className='mb-5' />
				{isSuccess && sections.length === 0 && (
					<div className='flex flex-col items-center justify-center h-full'>
						<p className='text-sm text-muted-foreground'>
							{t('user_sections_empty')}
						</p>
					</div>
				)}
				<div className='grid grid-cols-1 gap-4 md:grid-cols-4 pb-5'>
					{sections &&
						sections.map((section, index) => {
							return (
								<div key={index}>
									<SectionCard section={section} />
								</div>
							);
						})}
					{isFetchingSections && !data && (
						<>
							{[...Array(12)].map((number, index) => {
								return <SectionCardSkeleton key={index} />;
							})}
						</>
					)}
					{isFetchingNextPage && data && (
						<>
							{[...Array(12)].map((number, index) => {
								return <SectionCardSkeleton key={index} />;
							})}
						</>
					)}
					<div ref={bottomRef}></div>
				</div>
			</div>
		</div>
	);
};

export default UserContainer;
