'use client';

import { Clock3, MessageSquare } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';

import type { SectionCommentInfo } from '@/generated';
import { formatInUserTimeZone } from '@/lib/time';
import { replacePath } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const SectionCommentCard = ({ comment }: { comment: SectionCommentInfo }) => {
	const router = useRouter();

	return (
		<div className='rounded-2xl border border-border bg-muted/20 p-4 shadow-sm'>
			<div className='flex items-start justify-between gap-3 mb-4'>
				<div
					className='flex min-w-0 cursor-pointer items-center gap-3'
					onClick={() => router.push(`/user/detail/${comment.creator.id}`)}>
					<Avatar className='size-9 ring-1 ring-border/70'>
						<AvatarImage
							src={replacePath(comment.creator.avatar, comment.creator.id)}
							alt='avatar'
							className='size-9 object-cover'
						/>
						<AvatarFallback className='size-9'>
							{comment.creator.nickname}
						</AvatarFallback>
					</Avatar>
					<div className='min-w-0'>
						<p className='truncate text-sm font-medium'>
							{comment.creator.nickname}
						</p>
						<div className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
							<Clock3 className='size-3.5' />
							<span>
								{formatInUserTimeZone(comment.create_time, 'MM-dd HH:mm')}
							</span>
						</div>
					</div>
				</div>
			</div>

			<p className='whitespace-pre-wrap break-words text-sm leading-7 text-foreground/92'>
				{comment.content}
			</p>
		</div>
	);
};

export default SectionCommentCard;
