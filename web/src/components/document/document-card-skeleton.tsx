import { Skeleton } from '../ui/skeleton';

const DocumentCardSkeleton = () => {
	return (
		<div className='flex flex-col gap-2 py-2'>
			<Skeleton className='h-64 w-full' />
		</div>
	);
};

export default DocumentCardSkeleton;
