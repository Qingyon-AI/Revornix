'use client';

import AddRss from '@/components/rss/add-rss';
import RssCard from '@/components/rss/rss-card';
import RssCardSkeleton from '@/components/rss/rss-card-skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/get-query-client';
import { searchMineRssServer } from '@/service/rss';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const RSSPage = () => {
	const t = useTranslations();
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();
	const {
		data,
		isFetchingNextPage,
		isFetching,
		isRefetching,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchMyRssServers', keyword],
		queryFn: (pageParam) => searchMineRssServer({ ...pageParam.pageParam }),
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
	const rssServers = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);

	return (
		<div className='flex-1 flex flex-col'>
			<Separator className='mb-5' />
			<div className='w-full px-5'>
				<Alert className='mb-5'>
					<Info />
					<AlertDescription>
						RSS订阅将会在后台自动识别源的更新，并且生成对应文档，同时归类更新对应专栏。识别频率默认60分钟一次。
					</AlertDescription>
				</Alert>
				<div className='flex justify-end mb-5'>
					<AddRss />
				</div>

				<div className='w-full grid grid-cols-1 gap-4 md:grid-cols-4 flex-1 overflow-auto'>
					{rssServers &&
						rssServers.map((rss, index) => {
							return <RssCard key={index} rss={rss} />;
						})}
					{isFetching && !data && (
						<>
							{[...Array(12)].map((number, index) => {
								return <RssCardSkeleton key={index} />;
							})}
						</>
					)}
					{isFetchingNextPage && data && (
						<>
							{[...Array(12)].map((number, index) => {
								return <RssCardSkeleton key={index} />;
							})}
						</>
					)}
					<div ref={bottomRef}></div>
				</div>
			</div>
		</div>
	);
};

export default RSSPage;
