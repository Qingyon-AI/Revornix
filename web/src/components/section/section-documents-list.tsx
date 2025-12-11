'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { searchSectionDocuments } from '@/service/section';
import SectionDocumentCard from './section-document-card';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useTranslations } from 'next-intl';

const SectionDocumentsList = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const { ref: bottomRef, inView } = useInView();
	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchSectionDocument', ''],
		queryFn: (pageParam) => searchSectionDocuments({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			section_id: section_id,
			keyword: '',
			desc: true,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						section_id: section_id,
						keyword: '',
						desc: true,
				  }
				: undefined;
		},
	});
	const documents = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage]);

	return (
		<>
			{isSuccess &&
				documents &&
				documents.map((document, index) => {
					return <SectionDocumentCard key={index} document={document} />;
				})}
			{isSuccess && documents && documents.length === 0 && (
				<p className='flex-1 flex justify-center items-center text-sm text-muted-foreground'>
					{t('section_no_documents')}
				</p>
			)}
			{isFetching && !data && (
				<>
					{[...Array(10)].map((number, index) => {
						return <Skeleton className='h-40 w-full' key={index} />;
					})}
				</>
			)}
			{isFetchingNextPage && data && (
				<>
					{[...Array(10)].map((number, index) => {
						return <Skeleton className='h-40 w-full' key={index} />;
					})}
				</>
			)}
			<div ref={bottomRef}></div>
		</>
	);
};

export default SectionDocumentsList;
