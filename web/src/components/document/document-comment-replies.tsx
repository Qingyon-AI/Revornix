'use client';

import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
	searchDocumentCommentReplies,
	searchPublicDocumentCommentReplies,
	type DocumentCommentInfo,
} from '@/service/document';

import DocumentCommentCard from './document-comment-card';
import { Button } from '../ui/button';

type Props = {
	rootComment: DocumentCommentInfo;
	documentId: number;
	currentUserId?: number;
	publicMode?: boolean;
	loginHref?: string;
};

const DocumentCommentReplies = ({
	rootComment,
	documentId,
	currentUserId,
	publicMode = false,
	loginHref,
}: Props) => {
	const t = useTranslations();
	const [expanded, setExpanded] = useState(false);

	const previewReplies = rootComment.preview_replies ?? [];
	const totalReplyCount = rootComment.reply_count ?? 0;

	const initialPageParam = {
		root_comment_id: rootComment.id,
		limit: 10,
	};

	const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
		useInfiniteQuery({
			queryKey: ['searchDocumentCommentReplies', rootComment.id],
			queryFn: (pageParam) =>
				publicMode
					? searchPublicDocumentCommentReplies({ ...pageParam.pageParam })
					: searchDocumentCommentReplies({ ...pageParam.pageParam }),
			initialPageParam,
			enabled: expanded,
			retry: publicMode ? false : undefined,
			refetchOnWindowFocus: publicMode ? false : undefined,
			getNextPageParam: (lastPage) => {
				return lastPage.has_more
					? {
							root_comment_id: rootComment.id,
							start: lastPage.next_start,
							limit: lastPage.limit,
						}
					: undefined;
			},
		});

	const expandedReplies = data?.pages.flatMap((p) => p.elements) ?? [];
	const repliesToShow: DocumentCommentInfo[] = expanded
		? expandedReplies
		: previewReplies;

	if (totalReplyCount === 0 && previewReplies.length === 0) {
		return null;
	}

	const remaining = Math.max(totalReplyCount - previewReplies.length, 0);

	return (
		<div className='mt-3 space-y-2 border-l-2 border-border/40 pl-3'>
			{repliesToShow.map((reply) => (
				<DocumentCommentCard
					key={reply.id}
					comment={reply}
					currentUserId={currentUserId}
					documentId={documentId}
					rootComment={rootComment}
					publicMode={publicMode}
					isReply
					loginHref={loginHref}
				/>
			))}

			{!expanded && remaining > 0 && (
				<Button
					variant='ghost'
					size='sm'
					className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
					onClick={() => setExpanded(true)}>
					<ChevronDown className='size-3.5' />
					{t('document_comment_show_more_replies', { count: remaining })}
				</Button>
			)}

			{expanded && (
				<div className='flex items-center gap-2'>
					{hasNextPage && (
						<Button
							variant='ghost'
							size='sm'
							className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
							onClick={() => fetchNextPage()}
							disabled={isFetchingNextPage}>
							{isFetchingNextPage ? (
								<Loader2 className='size-3.5 animate-spin' />
							) : (
								<ChevronDown className='size-3.5' />
							)}
							{t('document_comment_load_more_replies')}
						</Button>
					)}
					<Button
						variant='ghost'
						size='sm'
						className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
						onClick={() => setExpanded(false)}>
						<ChevronUp className='size-3.5' />
						{t('document_comment_collapse_replies')}
					</Button>
					{isFetching && !data && (
						<Loader2 className='size-3.5 animate-spin text-muted-foreground' />
					)}
				</div>
			)}
		</div>
	);
};

export default DocumentCommentReplies;
