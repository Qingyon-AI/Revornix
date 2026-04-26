'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MessageCircleMore } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import { Button } from '../ui/button';
import SectionComments from './section-comments';

const SectionOperateComment = ({
	section_id,
	className,
	onTriggerClick,
	iconOnly = false,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
	iconOnly?: boolean;
}) => {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const commentIdParam = searchParams.get('comment_id');
	const anchorCommentId = commentIdParam ? Number(commentIdParam) : undefined;

	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (anchorCommentId) {
			setOpen(true);
		}
	}, [anchorCommentId]);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					title={t('section_comments')}
					variant={'ghost'}
					className={cn('w-full flex-1 text-xs', className)}
					onClick={onTriggerClick}>
					<MessageCircleMore />
					{iconOnly ? <span className='sr-only'>{t('section_comments')}</span> : t('section_comments')}
				</Button>
			</SheetTrigger>
			<SheetContent className='flex h-full flex-col gap-0 overflow-hidden bg-card/95 pt-0 sm:max-w-xl'>
				<SheetHeader className='border-b border-border/60 px-5 pt-6 pb-3 pr-12 text-left'>
					<SheetTitle className='text-xl'>{t('section_comments')}</SheetTitle>
					<SheetDescription className='max-w-md text-sm leading-6'>
						{t('section_comments_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='min-h-0 flex-1 px-4 pb-4 pt-4 sm:px-5 sm:pb-5'>
					<SectionComments section_id={section_id} anchorCommentId={anchorCommentId} />
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateComment;
