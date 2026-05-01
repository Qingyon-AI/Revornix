'use client';

import type { InifiniteScrollPagnitionSectionDocumentInfo } from '@/generated';
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchPublicSectionDocuments, searchSectionDocuments } from '@/service/section';
import SectionDocumentCard from './section-document-card';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { ListItemSkeleton } from '../ui/skeleton';
import { useTranslations } from 'next-intl';
import NoticeBox from '../ui/notice-box';

const SectionDocumentsList = ({
	section_id,
	publicMode = false,
	initialData,
}: {
	section_id: number;
	publicMode?: boolean;
	initialData?: InifiniteScrollPagnitionSectionDocumentInfo;
}) => {
	const t = useTranslations();
	const { ref: bottomRef, inView } = useInView();
	const initialPageParam = {
		limit: 10,
		section_id: section_id,
		keyword: '',
		desc: true,
	};
	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchSectionDocument', section_id, ''],
		queryFn: (pageParam) =>
			publicMode
				? searchPublicSectionDocuments({ ...pageParam.pageParam })
				: searchSectionDocuments({ ...pageParam.pageParam }),
		initialPageParam,
		initialData: initialData
			? {
					pages: [initialData],
					pageParams: [initialPageParam],
				}
			: undefined,
		retry: publicMode ? false : undefined,
		refetchOnWindowFocus: publicMode ? false : undefined,
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
					return (
						<div
							key={document.id ?? index}
							ref={index === documents.length - 1 ? bottomRef : undefined}>
							<SectionDocumentCard
								document={document}
								publicMode={publicMode}
							/>
						</div>
					);
				})}
			{isSuccess && documents && documents.length === 0 && (
				<NoticeBox>
					{publicMode
						? t('section_no_public_documents')
						: t('section_no_documents')}
				</NoticeBox>
			)}
			{isFetching && !data && (
				<>
					{[...Array(10)].map((number, index) => {
						return <ListItemSkeleton key={index} className='py-5' />;
					})}
				</>
			)}
			{isFetchingNextPage && data && (
				<>
					{[...Array(10)].map((number, index) => {
						return <ListItemSkeleton key={index} className='py-5' />;
					})}
				</>
			)}
		</>
	);
};

export default SectionDocumentsList;
