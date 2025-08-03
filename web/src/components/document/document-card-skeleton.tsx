import { Skeleton } from '../ui/skeleton';

const DocumentCardSkeleton = () => {
	return (
		<div className='flex flex-col'>
			<Skeleton className='h-64 w-full' />
		</div>
	);
};

export default DocumentCardSkeleton;
