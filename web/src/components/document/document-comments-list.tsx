'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
	searchDocumentComment,
	searchPublicDocumentComment,
	type DocumentCommentSortType,
	type InifiniteScrollPagnitionDocumentCommentInfo,
} from '@/service/document';
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
import { MessageSquareText, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import DocumentCommentCard from './document-comment-card';
import { useUserContext } from '@/provider/user-provider';

const DocumentCommentsList = ({
	document_id,
	initialData,
	publicMode = false,
	loginHref,
}: {
	document_id: number;
	initialData?: InifiniteScrollPagnitionDocumentCommentInfo;
	publicMode?: boolean;
	loginHref?: string;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const keyword = '';
	const [sort, setSort] = useState<DocumentCommentSortType>('time');

	const initialPageParam = {
		limit: 10,
		keyword,
		document_id,
		sort,
	};

	const { ref: bottomRef, inView } = useInView();

	const {
		data,
		isFetchingNextPage,
		isFetching,
		fetchNextPage,
		hasNextPage,
		refetch,
	} = useInfiniteQuery({
		queryKey: ['searchDocumentComment', keyword, sort, document_id],
		queryFn: (pageParam) =>
			publicMode
				? searchPublicDocumentComment({ ...pageParam.pageParam })
				: searchDocumentComment({ ...pageParam.pageParam }),
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
						keyword,
						document_id,
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
			<div className='flex shrink-0 items-center justify-between gap-2'>
				<Tabs
					value={sort}
					onValueChange={(v) => setSort(v as DocumentCommentSortType)}>
					<TabsList className='h-8 rounded-full'>
						<TabsTrigger
							value='time'
							className='h-7 rounded-full px-3 text-xs'>
							{t('document_comment_sort_time')}
						</TabsTrigger>
						<TabsTrigger
							value='hot'
							className='h-7 rounded-full px-3 text-xs'>
							{t('document_comment_sort_hot')}
						</TabsTrigger>
					</TabsList>
				</Tabs>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					title={t('refresh')}
					className='size-8 rounded-full text-muted-foreground hover:text-foreground'
					onClick={() => refetch()}
					disabled={isFetching}>
					<RefreshCw
						className={cn('size-3.5', isFetching && 'animate-spin')}
					/>
					<span className='sr-only'>{t('refresh')}</span>
				</Button>
			</div>
			<div className='min-h-0 flex-1 overflow-y-auto'>
				{!isFetching && comments.length === 0 ? (
					<Empty className='flex min-h-full rounded-3xl border border-dashed border-border/70 bg-muted/20'>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<MessageSquareText />
							</EmptyMedia>
							<EmptyDescription>
								{t('document_comments_empty')}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className='flex flex-col gap-3'>
						{comments.map((comment, index) => (
							<div
								key={comment.id}
								ref={
									index === comments.length - 1 ? bottomRef : undefined
								}>
								<DocumentCommentCard
									comment={comment}
									currentUserId={mainUserInfo?.id}
									documentId={document_id}
									publicMode={publicMode}
									loginHref={loginHref}
								/>
							</div>
						))}
						{isFetching && !data && (
							<div className='flex flex-col gap-3'>
								{[...Array(12)].map((_, index) => (
									<Skeleton
										className='h-28 w-full rounded-3xl'
										key={index}
									/>
								))}
							</div>
						)}
						{isFetchingNextPage && data && (
							<div className='flex flex-col gap-3'>
								{[...Array(12)].map((_, index) => (
									<Skeleton
										className='h-28 w-full rounded-3xl'
										key={index}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default DocumentCommentsList;
