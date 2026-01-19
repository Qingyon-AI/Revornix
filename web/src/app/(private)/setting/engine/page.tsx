'use client';

import MineEngineCard from '@/components/setting/mine-engine-card';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { searchCommunityEngines } from '@/service/engine';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Info, TrashIcon, XCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import EngineAddButton from '@/components/setting/engine-add-button';

const EnginePage = () => {
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
		queryKey: ['searchCommunityEngines', keyword],
		queryFn: (pageParam) => searchCommunityEngines({ ...pageParam.pageParam }),
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
	const engines = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage]);

	return (
		<>
			<Separator className='mb-5' />
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Alert className='bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-500 border-none'>
					<Info className='size-4' />
					<AlertTitle>{t('engine_community_tips_title')}</AlertTitle>
					<AlertDescription>
						{t('engine_community_tips_description')}
					</AlertDescription>
				</Alert>
			</div>
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Input
					placeholder={t('engine_search_placeholder')}
					value={keyword}
					onChange={(e) => setKeyword(e.target.value)}
				/>
				<EngineAddButton />
			</div>
			{isSuccess && engines.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<TrashIcon />
						</EmptyMedia>
						<EmptyDescription>{t('engine_empty')}</EmptyDescription>
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
			<div className='grid grid-cols-1 gap-4 md:grid-cols-4 px-5 pb-5'>
				{engines &&
					engines.map((engine, index) => {
						return <MineEngineCard key={index} engine_info={engine} />;
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
				<div ref={bottomRef}></div>
			</div>
		</>
	);
};

export default EnginePage;
