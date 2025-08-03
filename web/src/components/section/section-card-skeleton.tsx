import { Skeleton } from '@/components/ui/skeleton';

const SectionCardSkeleton = () => {
	return (
		<div className='flex flex-col'>
			<Skeleton className='h-64 w-full' />
		</div>
	);
};

export default SectionCardSkeleton;
