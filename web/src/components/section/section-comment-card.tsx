'use client';

import { Clock3 } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';

import type { SectionCommentInfo } from '@/generated';
import { formatInUserTimeZone } from '@/lib/time';
import { replacePath } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const SectionCommentCard = ({ comment }: { comment: SectionCommentInfo }) => {
	const router = useRouter();

	return (
		<div className='rounded-3xl border border-border/60 bg-card/55 px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm'>
			<div className='mb-3 flex items-start gap-3'>
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
			</div>

			<p className='whitespace-pre-wrap break-words text-sm leading-6 text-foreground/92'>
				{comment.content}
			</p>
		</div>
	);
};

export default SectionCommentCard;
