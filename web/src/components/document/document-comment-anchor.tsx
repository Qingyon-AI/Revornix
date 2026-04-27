'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';
import { Clock3, Pin } from 'lucide-react';

import { getDocumentCommentDetail } from '@/service/document';
import { formatInUserTimeZone } from '@/lib/time';
import { cn, replacePath } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';

const DocumentCommentAnchor = ({ commentId }: { commentId: number }) => {
	const t = useTranslations();
	const router = useRouter();
	const [highlighted, setHighlighted] = useState(true);

	const { data: comment, isLoading, isError } = useQuery({
		queryKey: ['getDocumentCommentDetail', commentId],
		queryFn: () => getDocumentCommentDetail({ document_comment_id: commentId }),
		retry: false,
	});

	useEffect(() => {
		if (!comment) return;
		const timer = setTimeout(() => setHighlighted(false), 1800);
		return () => clearTimeout(timer);
	}, [comment]);

	if (isError) return null;

	return (
		<div className='shrink-0'>
			<div className='mb-1 flex items-center gap-1.5 px-1 text-xs font-medium text-primary'>
				<Pin className='size-3.5' />
				<span>{t('document_comment_anchor_label')}</span>
			</div>
			{isLoading ? (
				<Skeleton className='h-24 w-full rounded-3xl' />
			) : comment ? (
				<div
					className={cn(
						'rounded-3xl border px-4 py-3.5 transition-colors duration-700',
						highlighted
							? 'border-primary/40 bg-primary/8 shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.07)]'
							: 'border-border/60 bg-card/55 shadow-[0_1px_0_rgba(255,255,255,0.03)]'
					)}>
					<div className='mb-3 flex items-start gap-3'>
						<div
							className='flex min-w-0 cursor-pointer items-center gap-3'
							onClick={() =>
								router.push(`/user/detail/${comment.creator.id}`)
							}>
							<Avatar className='size-8 ring-1 ring-border/70'>
								<AvatarImage
									src={replacePath(comment.creator.avatar, comment.creator.id)}
									alt='avatar'
									className='size-8 object-cover'
								/>
								<AvatarFallback className='size-8 font-semibold'>
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
					</div>
					<p className='whitespace-pre-wrap wrap-break-word text-sm leading-6 text-foreground/92'>
						{comment.content}
					</p>
				</div>
			) : null}
		</div>
	);
};

export default DocumentCommentAnchor;
