'use client';

import { Skeleton } from '@/components/ui/skeleton';
import UserFollowCard from '@/components/user/user-follow-card';
import { useUserContext } from '@/provider/user-provider';
import { getUserFollows } from '@/service/user';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const UserFollows = () => {
	const { userInfo } = useUserContext();
	const [keyword, setKeyword] = useState('');

	const { ref: bottomRef, inView } = useInView();
	const {
		data,
		isFetchingNextPage,
		isFetching,
		error,
		isSuccess,
		fetchNextPage,
		isError,
		hasNextPage,
	} = useInfiniteQuery({
		enabled: !!userInfo?.id,
		queryKey: ['getUserFollows', keyword, userInfo?.id],
		// @ts-expect-error
		queryFn: (pageParam) => getUserFollows({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			keyword: keyword,
			user_id: userInfo?.id,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: keyword,
						user_id: userInfo?.id,
				  }
				: undefined;
		},
	});
	const users = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);
	return (
		<div className='px-5 pb-5 w-full flex-1 overflow-auto'>
			{isError && (
				<div className='flex flex-col justify-center items-center w-full h-full text-muted-foreground text-xs'>
					<p>获取粉丝失败，请刷新重试</p>
					<p>{error.message}</p>
				</div>
			)}
			{isSuccess && !users.length && (
				<div className='flex justify-center items-center w-full h-full text-muted-foreground text-xs'>
					你还没有粉丝哦，快去发布一些专栏增加人气吧
				</div>
			)}
			<div className='w-full grid grid-cols-4 gap-5'>
				{isFetching && !data && (
					<>
						{[...Array(20)].map((number, index) => {
							return <Skeleton className='w-full h-36' key={index} />;
						})}
					</>
				)}
				{isFetchingNextPage && data && (
					<>
						{[...Array(20)].map((number, index) => {
							return <Skeleton className='w-full h-36' key={index} />;
						})}
					</>
				)}
				{users &&
					users.map((user, index) => {
						return <UserFollowCard key={index} user={user} />;
					})}
				<div ref={bottomRef}></div>
			</div>
		</div>
	);
};

export default UserFollows;
