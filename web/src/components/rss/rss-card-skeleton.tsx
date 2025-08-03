import { Skeleton } from '../ui/skeleton';

const RssCardSkeleton = () => {
	return (
		<div className='flex flex-col'>
			<Skeleton className='h-64 w-full' />
		</div>
	);
};

export default RssCardSkeleton;
