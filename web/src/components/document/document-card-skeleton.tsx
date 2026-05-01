import { CardViewMode } from '@/lib/card-view-mode';
import { Skeleton } from '../ui/skeleton';

const DocumentCardSkeleton = ({
	layout = 'grid',
}: {
	layout?: CardViewMode;
}) => {
	if (layout === 'list') {
		return (
			<div className='flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm'>
				<Skeleton className='size-14 shrink-0 rounded-lg' />
				<div className='min-w-0 flex-1 space-y-2'>
					<Skeleton className='h-5 w-2/3 rounded-full' />
					<Skeleton className='h-4 w-full rounded-full' />
					<Skeleton className='h-4 w-1/2 rounded-full' />
				</div>
				<div className='hidden items-center gap-2 sm:flex'>
					<Skeleton className='h-7 w-20 rounded-full' />
					<Skeleton className='h-7 w-24 rounded-full' />
				</div>
			</div>
		);
	}

	return (
		<div className='flex h-full min-h-[27rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm'>
			<div className='h-40 w-full bg-muted/25 p-4'>
				<div className='flex h-full w-full items-center justify-center rounded-lg border border-border/60 bg-background/70'>
					<Skeleton className='size-11 rounded-xl' />
				</div>
			</div>
			<div className='flex flex-1 flex-col gap-3 p-4'>
				<div className='space-y-2'>
					<Skeleton className='h-5 w-[82%] rounded-full' />
					<Skeleton className='h-5 w-[58%] rounded-full' />
				</div>
				<div className='space-y-2'>
					<Skeleton className='h-4 w-full rounded-full' />
					<Skeleton className='h-4 w-[92%] rounded-full' />
					<Skeleton className='h-4 w-[76%] rounded-full' />
				</div>
				<div className='flex flex-wrap gap-2'>
					<Skeleton className='h-7 w-16 rounded-full' />
					<Skeleton className='h-7 w-24 rounded-full' />
					<Skeleton className='h-7 w-20 rounded-full' />
				</div>
				<div className='mt-auto flex flex-wrap gap-2'>
					<Skeleton className='h-7 w-24 rounded-full' />
					<Skeleton className='h-7 w-20 rounded-full' />
				</div>
				<div className='flex flex-wrap gap-2'>
					<Skeleton className='h-8 w-28 rounded-lg' />
				</div>
			</div>
		</div>
	);
};

export default DocumentCardSkeleton;
