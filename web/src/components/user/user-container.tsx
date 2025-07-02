'use client';

import { customImageLoader } from '@/lib/image-loader';
import { followUser, getUserInfo } from '@/service/user';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { Separator } from '../ui/separator';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { searchUserSection } from '@/service/section';
import SectionCard from '../section/section-card';
import SectionCardSkeleton from '../section/section-card-skeleton';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { cloneDeep } from 'lodash-es';
import { getQueryClient } from '@/lib/get-query-client';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';

const UserContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();
	const { refreshUserInfo } = useUserContext();

	const { data: userInfo, isFetching: isFetchingUserInfo } = useQuery({
		queryKey: ['userInfo', id],
		queryFn: async () => {
			return getUserInfo({ user_id: Number(id) });
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
			user_id: Number(id),
			limit: 10,
			keyword: keyword,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: keyword,
						user_id: Number(id),
				  }
				: undefined;
		},
	});

	const mutateFollow = useMutation({
		mutationFn: async () => {
			if (!userInfo) return;
			return followUser({
				to_user_id: id,
				status: userInfo.is_followed!,
			});
		},
		onMutate(variables) {
			const prevUserInfo = cloneDeep(userInfo);
			if (!userInfo) {
				return;
			}
			userInfo.is_followed = !userInfo.is_followed;
			return { prevUserInfo };
		},
		onError(error, variables, context) {
			toast.error(`${error.message}`);
			// Revert to the previous value
			if (userInfo && context?.prevUserInfo) {
				userInfo.is_followed = context.prevUserInfo.is_followed;
			}
		},
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey.includes('getUserFollows') ||
						query.queryKey.includes('getUserFans') ||
						query.queryKey.includes('userInfo')
					);
				},
			});
			refreshUserInfo();
		},
	});

	const sections = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetchingSections && hasNextPage && fetchNextPage();
	}, [inView]);

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
								<div className='w-20 h-20 relative mb-2'>
									<PhotoProvider>
										<PhotoView
											src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${userInfo.avatar.name}`}>
											<Image
												src={userInfo.avatar.name}
												loader={customImageLoader}
												alt='avatar'
												fill
												className='rounded-full object-cover'
											/>
										</PhotoView>
									</PhotoProvider>
								</div>
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
