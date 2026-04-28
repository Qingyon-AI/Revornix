'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';
import { Clock3, Heart, MessageCircle, Pin } from 'lucide-react';
import { toast } from 'sonner';

import {
	getDocumentCommentDetail,
	likeDocumentComment,
	unlikeDocumentComment,
} from '@/service/document';
import { formatInUserTimeZone } from '@/lib/time';
import { cn, replacePath } from '@/lib/utils';
import { getQueryClient } from '@/lib/get-query-client';
import { useUserContext } from '@/provider/user-provider';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import DocumentCommentInput from './document-comment-input';

const DocumentCommentAnchor = ({
	commentId,
	documentId,
	loginHref,
}: {
	commentId: number;
	documentId: number;
	loginHref?: string;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const [highlighted, setHighlighted] = useState(true);
	const { mainUserInfo } = useUserContext();
	const queryClient = getQueryClient();

	const {
		data: comment,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['getDocumentCommentDetail', commentId],
		queryFn: () =>
			getDocumentCommentDetail({ document_comment_id: commentId }),
		retry: false,
	});

	useEffect(() => {
		if (!comment) return;
		const timer = setTimeout(() => setHighlighted(false), 1800);
		return () => clearTimeout(timer);
	}, [comment]);

	const [replying, setReplying] = useState(false);

	const currentUserId = mainUserInfo?.id;
	const canInteract = currentUserId !== undefined;

	const ensureLoggedInOrRedirect = () => {
		if (canInteract) return true;
		if (loginHref) {
			router.push(loginHref);
		} else {
			toast.error(t('seo_login_required_to_interact'));
		}
		return false;
	};

	const likeMutation = useMutation({
		mutationFn: async ({ liked }: { liked: boolean }) => {
			if (liked) {
				await unlikeDocumentComment({ document_comment_id: commentId });
			} else {
				await likeDocumentComment({ document_comment_id: commentId });
			}
		},
		onMutate: async ({ liked }) => {
			await queryClient.cancelQueries({
				queryKey: ['getDocumentCommentDetail', commentId],
			});
			await queryClient.cancelQueries({
				predicate: (query) =>
					query.queryKey[0] === 'searchDocumentComment' &&
					query.queryKey[3] === documentId,
			});

			const previousDetail = queryClient.getQueryData([
				'getDocumentCommentDetail',
				commentId,
			]);
			const previousLists = queryClient.getQueriesData({
				predicate: (query) =>
					query.queryKey[0] === 'searchDocumentComment' &&
					query.queryKey[3] === documentId,
			});

			queryClient.setQueryData(
				['getDocumentCommentDetail', commentId],
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						liked: !liked,
						like_count: liked
							? Math.max((old.like_count ?? 0) - 1, 0)
							: (old.like_count ?? 0) + 1,
					};
				}
			);

			previousLists.forEach(([queryKey]) => {
				queryClient.setQueryData(queryKey, (old: any) => {
					if (!old?.pages) return old;
					return {
						...old,
						pages: old.pages.map((page: any) => ({
							...page,
							elements: page.elements.map((c: any) =>
								c.id === commentId
									? {
											...c,
											liked: !liked,
											like_count: liked
												? Math.max(
														(c.like_count ?? 0) - 1,
														0
													)
												: (c.like_count ?? 0) + 1,
										}
									: c
							),
						})),
					};
				});
			});

			return { previousDetail, previousLists };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousDetail) {
				queryClient.setQueryData(
					['getDocumentCommentDetail', commentId],
					context.previousDetail
				);
			}
			context?.previousLists.forEach(([queryKey, data]) => {
				queryClient.setQueryData(queryKey, data);
			});
			toast.error(t('document_comment_like_failed'));
		},
	});

	const handleToggleLike = () => {
		if (likeMutation.isPending || !comment) return;
		if (!ensureLoggedInOrRedirect()) return;
		likeMutation.mutate({ liked: comment.liked });
	};

	if (isError) return null;

	return (
		<div className='shrink-0'>
			<div className='mb-3 flex items-center gap-1.5 px-1 text-xs font-medium text-primary'>
				<Pin className='size-3.5' />
				<span>{t('document_comment_anchor_label')}</span>
			</div>
			{isLoading ? (
				<Skeleton className='h-20 w-full rounded-2xl' />
			) : comment ? (
				<div
					className={cn(
						'relative py-2.5 transition-colors duration-700 space-y-1.5',
						highlighted
							? 'bg-primary/8'
							: 'bg-card/55'
					)}>
					<div className='flex items-start gap-3'>
						<div
							className='flex min-w-0 cursor-pointer items-center gap-3'
							onClick={() =>
								router.push(`/user/detail/${comment.creator.id}`)
							}>
							<Avatar className='size-7 ring-1 ring-border/70'>
								<AvatarImage
									src={replacePath(
										comment.creator.avatar,
										comment.creator.id
									)}
									alt='avatar'
									className='size-7 object-cover'
								/>
								<AvatarFallback className='size-7 text-xs font-semibold'>
									{comment.creator.nickname.slice(0, 1) ?? '?'}
								</AvatarFallback>
							</Avatar>
							<div className='min-w-0 space-y-0.5'>
								<p className='truncate text-sm font-semibold'>
									{comment.creator.nickname}
								</p>
								<div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
									<Clock3 className='size-3.5' />
									<span>
										{formatInUserTimeZone(
											comment.create_time,
											'MM-dd HH:mm'
										)}
									</span>
								</div>
							</div>
						</div>
					</div>
					<p className='whitespace-pre-wrap wrap-break-word text-sm leading-5 text-foreground/92'>
						{comment.content}
					</p>

					<div className='flex items-center gap-1'>
						<Button
							variant='ghost'
							size='sm'
							disabled={likeMutation.isPending}
							onClick={handleToggleLike}
							className={cn(
								'h-6 gap-1 rounded-full px-2 text-xs',
								comment.liked
									? 'text-rose-500 hover:text-rose-500'
									: 'text-muted-foreground hover:text-foreground'
							)}>
							<Heart
								className={cn(
									'size-3.5',
									comment.liked && 'fill-current'
								)}
							/>
							{(comment.like_count ?? 0) > 0
								? comment.like_count
								: t('document_comment_like')}
						</Button>

						<Button
							variant='ghost'
							size='sm'
							onClick={() => {
								if (!ensureLoggedInOrRedirect()) return;
								setReplying((v) => !v);
							}}
							className='h-6 gap-1 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground'>
							<MessageCircle className='size-3.5' />
							{t('document_comment_reply')}
						</Button>
					</div>

					{replying && canInteract && (
						<div className='mt-2'>
							<DocumentCommentInput
								document_id={documentId}
								parent_id={comment.id}
								rootIdForInvalidation={comment.id}
								placeholder={t(
									'document_comment_reply_placeholder',
									{
										nickname: comment.creator.nickname,
									}
								)}
								compact
								autoFocus
								onCancel={() => setReplying(false)}
								onSuccess={() => setReplying(false)}
							/>
						</div>
					)}
				</div>
			) : null}
		</div>
	);
};

export default DocumentCommentAnchor;
