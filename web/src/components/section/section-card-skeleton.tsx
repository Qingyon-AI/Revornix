import { CardViewMode } from '@/lib/card-view-mode';
import { Skeleton } from '@/components/ui/skeleton';

const SectionCardSkeleton = ({
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
					<Skeleton className='h-5 w-[78%] rounded-lg' />
					<Skeleton className='h-5 w-[54%] rounded-lg' />
				</div>
				<div className='flex flex-wrap gap-2'>
					<Skeleton className='h-6 w-20 rounded-full' />
				</div>
				<div className='space-y-2'>
					<Skeleton className='h-4 w-full rounded-lg' />
					<Skeleton className='h-4 w-[88%] rounded-lg' />
					<Skeleton className='h-4 w-[72%] rounded-lg' />
				</div>
				<div className='flex flex-wrap gap-2'>
					<Skeleton className='h-7 w-16 rounded-lg' />
					<Skeleton className='h-7 w-24 rounded-lg' />
					<Skeleton className='h-7 w-20 rounded-full' />
				</div>
				<div className='flex items-center'>
					<Skeleton className='h-8 w-24 rounded-full' />
				</div>
				<div className='mt-auto flex items-center justify-between gap-3'>
					<div className='flex items-center gap-2'>
						<Skeleton className='size-5 rounded-full' />
						<Skeleton className='h-4 w-16 rounded-lg' />
					</div>
					<Skeleton className='h-7 w-28 rounded-lg' />
				</div>
			</div>
		</div>
	);
};

export default SectionCardSkeleton;
