'use client';

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { useRouter } from 'nextjs-toploader/app';
import { ArrowUpRight, Boxes } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ResourceSelectEmptyStateProps = {
	title: string;
	description: string;
	actionLabel?: string;
	href?: string;
	icon?: LucideIcon;
};

const ResourceSelectEmptyState = ({
	title,
	description,
	actionLabel,
	href,
	icon: Icon = Boxes,
}: ResourceSelectEmptyStateProps) => {
	const router = useRouter();

	return (
		<div className='flex w-full justify-center p-1.5'>
			<div className='w-[17rem] max-w-[calc(100vw-2.5rem)]'>
				<Empty className='flex-none gap-3 rounded-md border-none px-3 py-4 md:px-3 md:py-4'>
					<EmptyHeader className='max-w-[15rem] gap-1.5'>
						<EmptyMedia
							variant='icon'
							className='mb-0 size-9 rounded-xl'>
							<Icon className='size-5' />
						</EmptyMedia>
						<div className='text-base font-semibold tracking-tight'>{title}</div>
						<EmptyDescription className='max-w-[15rem] text-xs leading-5'>
							{description}
						</EmptyDescription>
					</EmptyHeader>
					{actionLabel && href ? (
						<EmptyContent className='max-w-[15rem] gap-0'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-9 w-full rounded-lg px-3 text-xs font-medium shadow-none'
								onPointerDown={(event) => {
									event.preventDefault();
								}}
								onClick={() => {
									router.push(href);
								}}>
								{actionLabel}
								<ArrowUpRight className='size-4' />
							</Button>
						</EmptyContent>
					) : null}
				</Empty>
			</div>
		</div>
	);
};

export default ResourceSelectEmptyState;
