import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const HotSearchCardSkeleton = () => {
	return (
		<Card className='flex h-full shrink-0 flex-col shadow-none'>
			<CardHeader className='flex w-full flex-row items-center justify-between'>
				<CardTitle className='flex min-w-0 items-center gap-3'>
					<Skeleton className='size-9 shrink-0 rounded-xl' />
					<Skeleton className='h-5 w-32 max-w-[45vw] rounded-full' />
				</CardTitle>
				<Skeleton className='size-9 shrink-0 rounded-md' />
			</CardHeader>
			<CardContent className='flex-1'>
				<div className='h-44 space-y-2 overflow-hidden'>
					{Array.from({ length: 6 }).map((_, index) => (
						<div key={index} className='flex items-center gap-2'>
							<Skeleton className='size-6 shrink-0 rounded' />
							<div className='min-w-0 flex-1 space-y-1.5'>
								<Skeleton className='h-4 w-full rounded-full' />
								{index % 2 === 0 ? (
									<Skeleton className='h-3 w-2/3 rounded-full' />
								) : null}
							</div>
						</div>
					))}
				</div>
			</CardContent>
			<CardFooter>
				<Skeleton className='h-3 w-24 rounded-full' />
			</CardFooter>
		</Card>
	);
};

export default HotSearchCardSkeleton;
