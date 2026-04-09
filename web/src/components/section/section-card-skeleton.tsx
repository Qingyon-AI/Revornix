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
		<div className='flex flex-col'>
			<Skeleton className='h-64 w-full' />
		</div>
	);
};

export default SectionCardSkeleton;
