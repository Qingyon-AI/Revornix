'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
	searchPublicSectionComment,
	searchSectionComment,
	type InifiniteScrollPagnitionSectionCommentInfo,
	type SectionCommentSortType,
} from '@/service/section';
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
import {
	Tabs,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs';
import SectionCommentCard from './section-comment-card';
import { useUserContext } from '@/provider/user-provider';

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
	const { mainUserInfo } = useUserContext();
	const keyword = '';
	const [sort, setSort] = useState<SectionCommentSortType>('time');

	const initialPageParam = {
		limit: 10,
		keyword: keyword,
		section_id: section_id,
		sort,
	};

	const { ref: bottomRef, inView } = useInView();

	const { data, isFetchingNextPage, isFetching, fetchNextPage, hasNextPage } =
		useInfiniteQuery({
			queryKey: ['searchSectionComment', keyword, sort, section_id],
			queryFn: (pageParam) =>
				publicMode
					? searchPublicSectionComment({ ...pageParam.pageParam })
					: searchSectionComment({ ...pageParam.pageParam }),
			initialPageParam,
			initialData:
				sort === 'time' && initialData
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
							sort,
						}
					: undefined;
			},
		});

	const comments = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage, fetchNextPage]);

	return (
		<div className='flex h-full flex-col gap-3 overflow-hidden'>
			<Tabs
				value={sort}
				onValueChange={(v) => setSort(v as SectionCommentSortType)}
				className='shrink-0'>
				<TabsList className='h-8 rounded-full'>
					<TabsTrigger value='time' className='h-7 rounded-full px-3 text-xs'>
						{t('section_comment_sort_time')}
					</TabsTrigger>
					<TabsTrigger value='hot' className='h-7 rounded-full px-3 text-xs'>
						{t('section_comment_sort_hot')}
					</TabsTrigger>
				</TabsList>
			</Tabs>
			<div className='min-h-0 flex-1 overflow-y-auto'>
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
									<SectionCommentCard
										comment={comment}
										currentUserId={publicMode ? undefined : mainUserInfo?.id}
										sectionId={section_id}
										publicMode={publicMode}
									/>
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
		</div>
	);
};

export default SectionCommentsList;
