'use client';

import { Skeleton } from '@/components/ui/skeleton';
import UserFanCard from '@/components/user/user-fan-card';
import { useUserContext } from '@/provider/user-provider';
import { getUserFans } from '@/service/user';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const UserFans = () => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
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
		enabled: !!mainUserInfo?.id,
		queryKey: ['getUserFans', keyword, mainUserInfo?.id],
		queryFn: (pageParam) => {
			// @ts-expect-error
			return getUserFans({ ...pageParam.pageParam });
		},
		initialPageParam: {
			limit: 10,
			keyword: keyword,
			user_id: mainUserInfo?.id,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: keyword,
						user_id: mainUserInfo?.id,
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
					<p>{error.message}</p>
				</div>
			)}
			{isSuccess && !users.length && (
				<div className='flex justify-center items-center w-full h-full text-muted-foreground text-xs'>
					{t('fans_empty')}
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
						return <UserFanCard key={index} user={user} />;
					})}
				<div ref={bottomRef}></div>
			</div>
		</div>
	);
};

export default UserFans;
