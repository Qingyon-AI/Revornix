import { CardViewMode } from '@/lib/card-view-mode';
import { Skeleton } from '../ui/skeleton';

const DocumentCardSkeleton = ({
	layout = 'grid',
}: {
	layout?: CardViewMode;
}) => {
	if (layout === 'list') {
		return <Skeleton className='h-24 w-full rounded-2xl' />;
	}

	return (
		<div className='flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm'>
			<div className='h-40 w-full bg-card/60 p-4'>
				<div className='flex h-full w-full items-center justify-center rounded-xl border border-border/60 bg-card/75'>
					<Skeleton className='size-10 rounded-xl' />
				</div>
			</div>
			<div className='flex flex-1 flex-col gap-3 p-4'>
				<div className='space-y-2'>
					<Skeleton className='h-5 w-[82%] rounded-lg' />
					<Skeleton className='h-5 w-[58%] rounded-lg' />
				</div>
				<div className='space-y-2'>
					<Skeleton className='h-4 w-full rounded-lg' />
					<Skeleton className='h-4 w-[92%] rounded-lg' />
					<Skeleton className='h-4 w-[76%] rounded-lg' />
				</div>
				<div className='flex flex-wrap gap-2'>
					<Skeleton className='h-7 w-16 rounded-lg' />
					<Skeleton className='h-7 w-24 rounded-lg' />
					<Skeleton className='h-7 w-20 rounded-lg' />
				</div>
				<div className='mt-auto flex flex-wrap gap-2'>
					<Skeleton className='h-7 w-24 rounded-lg' />
					<Skeleton className='h-7 w-20 rounded-lg' />
				</div>
				<div className='flex flex-wrap gap-2'>
					<Skeleton className='h-7 w-28 rounded-lg' />
				</div>
			</div>
		</div>
	);
};

export default DocumentCardSkeleton;
