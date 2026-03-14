'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const SelectorSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				'flex h-10 w-full flex-1 items-center rounded-md border border-input bg-background px-3',
				className,
			)}>
			<Skeleton className='h-4 w-40 max-w-[65%]' />
			<Skeleton className='ml-auto h-4 w-4 rounded-sm' />
		</div>
	);
};

export default SelectorSkeleton;
