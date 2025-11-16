'use client';

import AddRss from '@/components/rss/add-rss';
import RssCard from '@/components/rss/rss-card';
import RssCardSkeleton from '@/components/rss/rss-card-skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
		isLoading,
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
					<AlertDescription>{t('rss_page_tips')}</AlertDescription>
				</Alert>
				<div className='flex justify-end mb-5'>
					<AddRss />
				</div>

				{rssServers && rssServers.length === 0 && !isFetching && (
					<div className='w-full text-center rounded-lg bg-muted p-12 text-muted-foreground text-xs'>
						{t('rss_empty')}
					</div>
				)}

				<div className='w-full grid grid-cols-1 gap-4 md:grid-cols-4 flex-1 overflow-auto'>
					{rssServers &&
						rssServers.map((rss, index) => {
							return <RssCard key={index} rss={rss} />;
						})}

					{isLoading && (
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
