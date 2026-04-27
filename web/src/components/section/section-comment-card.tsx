'use client';

import { Clock3, Heart, Loader2, MessageCircle, TrashIcon } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
	deleteSectionComment,
	likeSectionComment,
	unlikeSectionComment,
	type SectionCommentInfo,
} from '@/service/section';
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
import SectionCommentForm from './section-comment-form';
import SectionCommentReplies from './section-comment-replies';

type Props = {
	comment: SectionCommentInfo;
	currentUserId?: number;
	sectionId: number;
	rootComment?: SectionCommentInfo;
	publicMode?: boolean;
	isReply?: boolean;
};

const SectionCommentCard = ({
	comment,
	currentUserId,
	sectionId,
	rootComment,
	publicMode = false,
	isReply = false,
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
	const [likeBusy, setLikeBusy] = useState(false);

	const isOwner =
		currentUserId !== undefined && comment.creator.id === currentUserId;
	const canInteract = currentUserId !== undefined;

	const rootIdForInvalidation = rootComment
		? rootComment.id
		: isReply && comment.root_id !== null && comment.root_id !== undefined
			? comment.root_id
			: undefined;

	const invalidateLists = () => {
		queryClient.invalidateQueries({
			predicate(query) {
				return (
					query.queryKey[0] === 'searchSectionComment' &&
					query.queryKey[3] === sectionId
				);
			},
		});
		if (rootIdForInvalidation !== undefined) {
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey[0] === 'searchSectionCommentReplies' &&
						query.queryKey[1] === rootIdForInvalidation
					);
				},
			});
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await deleteSectionComment({ section_comment_ids: [comment.id] });
			toast.success(t('section_comment_delete_success'));
			invalidateLists();
			setDeleteOpen(false);
		} catch {
			toast.error(t('section_comment_delete_failed'));
		} finally {
			setDeleting(false);
		}
	};

	const handleToggleLike = async () => {
		if (!canInteract || likeBusy) return;
		const previouslyLiked = optimisticLiked;
		const previousCount = optimisticLikeCount;
		setLikeBusy(true);
		setOptimisticLiked(!previouslyLiked);
		setOptimisticLikeCount(
			previouslyLiked ? Math.max(previousCount - 1, 0) : previousCount + 1
		);
		try {
			if (previouslyLiked) {
				await unlikeSectionComment({ section_comment_id: comment.id });
			} else {
				await likeSectionComment({ section_comment_id: comment.id });
			}
		} catch {
			setOptimisticLiked(previouslyLiked);
			setOptimisticLikeCount(previousCount);
			toast.error(t('section_comment_like_failed'));
		} finally {
			setLikeBusy(false);
		}
	};

	return (
		<div
			className={cn(
				'rounded-3xl border border-border/60 bg-card/55 px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm',
				isReply && 'rounded-2xl px-3 py-2.5'
			)}>
			<div className='mb-2 flex items-start justify-between gap-3'>
				<div
					className='flex min-w-0 cursor-pointer items-center gap-3'
					onClick={() => router.push(`/user/detail/${comment.creator.id}`)}>
					<Avatar
						className={cn(
							'ring-1 ring-border/70',
							isReply ? 'size-6' : 'size-8'
						)}>
						<AvatarImage
							src={replacePath(comment.creator.avatar, comment.creator.id)}
							alt='avatar'
							className={cn('object-cover', isReply ? 'size-6' : 'size-8')}
						/>
						<AvatarFallback
							className={cn(
								'font-semibold',
								isReply ? 'size-6 text-xs' : 'size-8'
							)}>
							{comment.creator.nickname.slice(0, 1) ?? '?'}
						</AvatarFallback>
					</Avatar>
					<div className='min-w-0 space-y-1'>
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

				{isOwner && (
					<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
						<AlertDialogTrigger asChild>
							<Button
								variant='ghost'
								size='icon'
								className='size-8 shrink-0 rounded-xl text-muted-foreground hover:text-destructive'>
								<TrashIcon className='size-4' />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{t('section_comment_delete_confirm')}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{t('section_comment_delete_description')}
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

			<p
				className={cn(
					'whitespace-pre-wrap wrap-break-word leading-6 text-foreground/92',
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

			<div className='mt-2 flex items-center gap-1'>
				<Button
					variant='ghost'
					size='sm'
					disabled={!canInteract || likeBusy}
					onClick={handleToggleLike}
					className={cn(
						'h-7 gap-1 rounded-full px-2 text-xs',
						optimisticLiked
							? 'text-rose-500 hover:text-rose-500'
							: 'text-muted-foreground hover:text-foreground'
					)}>
					<Heart
						className={cn('size-3.5', optimisticLiked && 'fill-current')}
					/>
					{optimisticLikeCount > 0 ? optimisticLikeCount : t('section_comment_like')}
				</Button>

				{canInteract && (
					<Button
						variant='ghost'
						size='sm'
						onClick={() => setReplying((v) => !v)}
						className='h-7 gap-1 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground'>
						<MessageCircle className='size-3.5' />
						{t('section_comment_reply')}
					</Button>
				)}
			</div>

			{replying && canInteract && (
				<div className='mt-2'>
					<SectionCommentForm
						section_id={sectionId}
						parent_id={comment.id}
						rootIdForInvalidation={
							rootIdForInvalidation ?? (isReply ? comment.root_id ?? undefined : comment.id)
						}
						placeholder={t('section_comment_reply_placeholder', {
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
				<SectionCommentReplies
					rootComment={comment}
					sectionId={sectionId}
					currentUserId={currentUserId}
					publicMode={publicMode}
				/>
			)}
		</div>
	);
};

export default SectionCommentCard;
