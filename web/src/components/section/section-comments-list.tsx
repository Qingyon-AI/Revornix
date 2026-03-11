'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { searchSectionComment } from '@/service/section';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '../ui/skeleton';
import { useTranslations } from 'next-intl';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { MessageSquareText } from 'lucide-react';
import SectionCommentCard from './section-comment-card';

const SectionCommentsList = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();

	const [keyword, setKeyword] = useState('');

	const { ref: bottomRef, inView } = useInView();

	const { data, isFetchingNextPage, isFetching, fetchNextPage, hasNextPage } =
		useInfiniteQuery({
			queryKey: ['searchSectionComment', keyword, section_id],
			queryFn: (pageParam) => searchSectionComment({ ...pageParam.pageParam }),
			initialPageParam: {
				limit: 10,
				keyword: keyword,
				section_id: section_id,
			},
			getNextPageParam: (lastPage) => {
				return lastPage.has_more
					? {
							start: lastPage.next_start,
							limit: lastPage.limit,
							keyword: keyword,
							section_id: section_id,
						}
					: undefined;
			},
		});

	const comments = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage, fetchNextPage]);

	return (
		<>
			{!isFetching && comments && comments.length === 0 && (
				<Empty className='h-full rounded-2xl border border-dashed border-border/70 bg-muted/20'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<MessageSquareText />
						</EmptyMedia>
						<EmptyDescription>{t('section_comments_empty')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			<div className='flex flex-col gap-3'>
				{comments &&
					comments.map((comment) => {
						return (
							<SectionCommentCard key={comment.id} comment={comment} />
						);
					})}
				{isFetching && !data && (
					<div className='flex flex-col gap-3'>
						{[...Array(12)].map((number, index) => {
							return <Skeleton className='h-28 w-full rounded-2xl' key={index} />;
						})}
					</div>
				)}
				{isFetchingNextPage && data && (
					<div className='flex flex-col gap-3'>
						{[...Array(12)].map((number, index) => {
							return <Skeleton className='h-28 w-full rounded-2xl' key={index} />;
						})}
					</div>
				)}
				<div ref={bottomRef}></div>
			</div>
		</>
	);
};

export default SectionCommentsList;
