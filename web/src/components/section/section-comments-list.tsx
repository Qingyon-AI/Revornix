'use client';

import type { InifiniteScrollPagnitionSectionCommentInfo } from '@/generated';
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchPublicSectionComment, searchSectionComment } from '@/service/section';
import { useEffect } from 'react';
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

const SectionCommentsList = ({
	section_id,
	initialData,
	publicMode = false,
}: {
	section_id: number;
	initialData?: InifiniteScrollPagnitionSectionCommentInfo;
	publicMode?: boolean;
}) => {
	const t = useTranslations();
	const keyword = '';
	const initialPageParam = {
		limit: 10,
		keyword: keyword,
		section_id: section_id,
	};

	const { ref: bottomRef, inView } = useInView();

	const { data, isFetchingNextPage, isFetching, fetchNextPage, hasNextPage } =
		useInfiniteQuery({
			queryKey: ['searchSectionComment', keyword, section_id],
			queryFn: (pageParam) =>
				publicMode
					? searchPublicSectionComment({ ...pageParam.pageParam })
					: searchSectionComment({ ...pageParam.pageParam }),
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
		<div className='h-full overflow-y-auto'>
			{!isFetching && comments.length === 0 ? (
				<Empty className='flex min-h-full rounded-3xl border border-dashed border-border/70 bg-muted/20'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<MessageSquareText />
						</EmptyMedia>
						<EmptyDescription>{t('section_comments_empty')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className='flex flex-col gap-3'>
					{comments.map((comment, index) => {
						return (
							<div
								key={comment.id}
								ref={index === comments.length - 1 ? bottomRef : undefined}>
								<SectionCommentCard comment={comment} />
							</div>
						);
					})}
					{isFetching && !data && (
						<div className='flex flex-col gap-3'>
							{[...Array(12)].map((_, index) => {
								return (
									<Skeleton className='h-28 w-full rounded-3xl' key={index} />
								);
							})}
						</div>
					)}
					{isFetchingNextPage && data && (
						<div className='flex flex-col gap-3'>
							{[...Array(12)].map((_, index) => {
								return (
									<Skeleton className='h-28 w-full rounded-3xl' key={index} />
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SectionCommentsList;
