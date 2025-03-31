import { Skeleton } from '@/components/ui/skeleton';

const SectionCardSkeleton = () => {
	return (
		<div className='flex flex-col gap-2 py-2'>
			<Skeleton className='h-64 w-full' />
		</div>
	);
};

export default SectionCardSkeleton;
