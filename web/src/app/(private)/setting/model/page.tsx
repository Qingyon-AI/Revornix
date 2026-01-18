'use client';

import ModelProviderCard from '@/components/setting/model-provider-card';
import { Skeleton } from '@/components/ui/skeleton';
import { searchAiModelProvider } from '@/service/ai';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { TrashIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import ModelProviderAddButton from '@/components/setting/model-provider-add';

const ModelSettingPage = () => {
	const t = useTranslations();
	const { ref: bottomRef, inView } = useInView();
	const [keyword, setKeyword] = useState('');
	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['getModelProviders', keyword],
		queryFn: (pageParam) => searchAiModelProvider({ ...pageParam.pageParam }),
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
	const modelProviders = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage]);

	return (
		<>
			<Separator className='mb-5' />
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Input
					placeholder={t('ai_model_provider_search_placeholder')}
					value={keyword}
					onChange={(e) => setKeyword(e.target.value)}
				/>
				<ModelProviderAddButton />
			</div>
			{isSuccess && modelProviders.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<TrashIcon />
						</EmptyMedia>
						<EmptyDescription>{t('ai_model_provider_empty')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			<div className='grid grid-cols-1 gap-4 md:grid-cols-4 px-5 pb-5'>
				{modelProviders &&
					modelProviders.map((modelProvider, index) => {
						return (
							<ModelProviderCard key={index} modelProvider={modelProvider} />
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
				<div ref={bottomRef}></div>
			</div>
		</>
	);
};

export default ModelSettingPage;
