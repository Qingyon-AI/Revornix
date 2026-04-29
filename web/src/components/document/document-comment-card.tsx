'use client';

import { Clock3, Heart, Loader2, MessageCircle, TrashIcon } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
	deleteDocumentComment,
	likeDocumentComment,
	unlikeDocumentComment,
	type DocumentCommentInfo,
} from '@/service/document';
import { formatInUserTimeZone } from '@/lib/time';
import { cn, replacePath } from '@/lib/utils';
import { getQueryClient } from '@/lib/get-query-client';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
import DocumentCommentInput from './document-comment-input';
import DocumentCommentReplies from './document-comment-replies';

type Props = {
	comment: DocumentCommentInfo;
	currentUserId?: number;
	documentId: number;
	rootComment?: DocumentCommentInfo;
	publicMode?: boolean;
	isReply?: boolean;
	loginHref?: string;
};

const DocumentCommentCard = ({
	comment,
	currentUserId,
	documentId,
	rootComment,
	publicMode = false,
	isReply = false,
	loginHref,
}: Props) => {
	const router = useRouter();
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [deleting, setDeleting] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [replying, setReplying] = useState(false);

	const [optimisticLiked, setOptimisticLiked] = useState(comment.liked);
	const [optimisticLikeCount, setOptimisticLikeCount] = useState(
		comment.like_count ?? 0
	);
	useEffect(() => {
		setOptimisticLiked(comment.liked);
		setOptimisticLikeCount(comment.like_count ?? 0);
	}, [comment.liked, comment.like_count]);

	const isOwner =
		currentUserId !== undefined && comment.creator.id === currentUserId;
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

	const rootIdForInvalidation = rootComment
		? rootComment.id
		: isReply && comment.root_id !== null && comment.root_id !== undefined
			? comment.root_id
			: undefined;

	const invalidateLists = () => {
		queryClient.invalidateQueries({
			predicate(query) {
				return (
					query.queryKey[0] === 'searchDocumentComment' &&
					query.queryKey[3] === documentId
				);
			},
		});
		if (rootIdForInvalidation !== undefined) {
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey[0] === 'searchDocumentCommentReplies' &&
						query.queryKey[1] === rootIdForInvalidation
					);
				},
			});
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await deleteDocumentComment({ document_comment_ids: [comment.id] });
			toast.success(t('document_comment_delete_success'));
			invalidateLists();
			setDeleteOpen(false);
		} catch {
			toast.error(t('document_comment_delete_failed'));
		} finally {
			setDeleting(false);
		}
	};

	const likeMutation = useMutation({
		mutationFn: async ({ liked }: { liked: boolean }) => {
			if (liked) {
				await unlikeDocumentComment({ document_comment_id: comment.id });
			} else {
				await likeDocumentComment({ document_comment_id: comment.id });
			}
		},
		onMutate: async ({ liked }) => {
			await queryClient.cancelQueries({
				queryKey: ['getDocumentCommentDetail', comment.id],
			});
			await queryClient.cancelQueries({
				predicate: (query) =>
					query.queryKey[0] === 'searchDocumentComment' &&
					query.queryKey[3] === documentId,
			});

			const previousDetail = queryClient.getQueryData([
				'getDocumentCommentDetail',
				comment.id,
			]);
			const previousLists = queryClient.getQueriesData({
				predicate: (query) =>
					query.queryKey[0] === 'searchDocumentComment' &&
					query.queryKey[3] === documentId,
			});

			queryClient.setQueryData(
				['getDocumentCommentDetail', comment.id],
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
								c.id === comment.id
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
					['getDocumentCommentDetail', comment.id],
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
		const previouslyLiked = optimisticLiked;
		const previousCount = optimisticLikeCount;
		setOptimisticLiked(!previouslyLiked);
		setOptimisticLikeCount(
			previouslyLiked
				? Math.max(previousCount - 1, 0)
				: previousCount + 1
		);
		likeMutation.mutate({ liked: previouslyLiked });
	};

	return (
		<div
			className={cn(
				'rounded-2xl space-y-1.5',
				isReply && 'rounded-xl'
			)}>
			<div className='flex items-start justify-between gap-3'>
				<div
					className='flex min-w-0 cursor-pointer items-center gap-3'
					onClick={() => router.push(`/user/detail/${comment.creator.id}`)}>
					<Avatar
						className={cn(
							'ring-1 ring-border/70',
							isReply ? 'size-5' : 'size-7'
						)}>
						<AvatarImage
							src={replacePath(comment.creator.avatar, comment.creator.id)}
							alt='avatar'
							className={cn('object-cover', isReply ? 'size-5' : 'size-7')}
						/>
						<AvatarFallback
							className={cn(
								'font-semibold',
								isReply ? 'size-5 text-[10px]' : 'size-7 text-xs'
							)}>
							{comment.creator.nickname.slice(0, 1) ?? '?'}
						</AvatarFallback>
					</Avatar>
					<div className='min-w-0 space-y-0.5'>
						<p
							className={cn(
								'truncate font-semibold',
								isReply ? 'text-xs' : 'text-sm'
							)}>
							{comment.creator.nickname}
						</p>
						<div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
							<Clock3 className='size-3.5' />
							<span>
								{formatInUserTimeZone(comment.create_time, 'MM-dd HH:mm')}
							</span>
						</div>
					</div>
				</div>

			</div>

			<p
				className={cn(
					'whitespace-pre-wrap wrap-break-word leading-5 text-foreground/92',
					isReply ? 'text-[13px]' : 'text-sm'
				)}>
				{isReply && comment.reply_user && (
					<button
						type='button'
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/user/detail/${comment.reply_user!.id}`);
						}}
						className='mr-1 cursor-pointer text-sky-600 hover:underline dark:text-sky-400'>
						@{comment.reply_user.nickname}
					</button>
				)}
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
						optimisticLiked
							? 'text-rose-500 hover:text-rose-500'
							: 'text-muted-foreground hover:text-foreground'
					)}>
					<Heart
						className={cn('size-3.5', optimisticLiked && 'fill-current')}
					/>
					{optimisticLikeCount > 0
						? optimisticLikeCount
						: t('document_comment_like')}
				</Button>

				<Button
					variant='ghost'
					size='sm'
					onClick={() => {
						if (!ensureLoggedInOrRedirect()) return;
						setReplying((v) => !v);
					}}
					className='h-7 gap-1 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground'>
					<MessageCircle className='size-3.5' />
					{t('document_comment_reply')}
				</Button>

				{isOwner && (
					<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
						<AlertDialogTrigger asChild>
							<Button
								variant='ghost'
								size='sm'
								className='h-6 gap-1 rounded-full px-2 text-xs text-muted-foreground hover:text-destructive'>
								<TrashIcon className='size-3.5' />
								{t('delete')}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{t('document_comment_delete_confirm')}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{t('document_comment_delete_description')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={deleting}>
									{t('cancel')}
								</AlertDialogCancel>
								<Button
									variant='destructive'
									onClick={handleDelete}
									disabled={deleting}
									className='rounded-xl'>
									{deleting ? (
										<Loader2 className='size-4 animate-spin' />
									) : (
										<TrashIcon className='size-4' />
									)}
									{t('delete')}
								</Button>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}
			</div>

			{replying && canInteract && (
				<div className='mt-2'>
					<DocumentCommentInput
						document_id={documentId}
						parent_id={comment.id}
						rootIdForInvalidation={
							rootIdForInvalidation ??
							(isReply ? comment.root_id ?? undefined : comment.id)
						}
						placeholder={t('document_comment_reply_placeholder', {
							nickname: comment.creator.nickname,
						})}
						compact
						autoFocus
						onCancel={() => setReplying(false)}
						onSuccess={() => setReplying(false)}
					/>
				</div>
			)}

			{!isReply && (
				<DocumentCommentReplies
					rootComment={comment}
					documentId={documentId}
					currentUserId={currentUserId}
					publicMode={publicMode}
					loginHref={loginHref}
				/>
			)}
		</div>
	);
};

export default DocumentCommentCard;
