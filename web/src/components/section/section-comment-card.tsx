'use client';

import { Clock3, Loader2, TrashIcon } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import type { SectionCommentInfo } from '@/generated';
import { formatInUserTimeZone } from '@/lib/time';
import { replacePath } from '@/lib/utils';
import { deleteSectionComment } from '@/service/section';
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

const SectionCommentCard = ({
	comment,
	currentUserId,
	sectionId,
}: {
	comment: SectionCommentInfo;
	currentUserId?: number;
	sectionId: number;
}) => {
	const router = useRouter();
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [deleting, setDeleting] = useState(false);
	const [open, setOpen] = useState(false);

	const isOwner = currentUserId !== undefined && comment.creator.id === currentUserId;

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await deleteSectionComment({ section_comment_ids: [comment.id] });
			toast.success(t('section_comment_delete_success'));
			queryClient.invalidateQueries({ queryKey: ['searchSectionComment', '', sectionId] });
			setOpen(false);
		} catch {
			toast.error(t('section_comment_delete_failed'));
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className='rounded-3xl border border-border/60 bg-card/55 px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm'>
			<div className='mb-3 flex items-start justify-between gap-3'>
				<div
					className='flex min-w-0 cursor-pointer items-center gap-3'
					onClick={() => router.push(`/user/detail/${comment.creator.id}`)}>
					<Avatar className='size-10 ring-1 ring-border/70'>
						<AvatarImage
							src={replacePath(comment.creator.avatar, comment.creator.id)}
							alt='avatar'
							className='size-10 object-cover'
						/>
						<AvatarFallback className='size-10 font-semibold'>
							{comment.creator.nickname.slice(0, 1) ?? '?'}
						</AvatarFallback>
					</Avatar>
					<div className='min-w-0 space-y-1'>
						<p className='truncate text-sm font-semibold'>
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
					<AlertDialog open={open} onOpenChange={setOpen}>
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
								<AlertDialogTitle>{t('section_comment_delete_confirm')}</AlertDialogTitle>
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

			<p className='whitespace-pre-wrap wrap-break-word text-sm leading-6 text-foreground/92'>
				{comment.content}
			</p>
		</div>
	);
};

export default SectionCommentCard;
