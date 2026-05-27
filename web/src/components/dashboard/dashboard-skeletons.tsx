import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DashboardStatTileSkeleton = () => {
	return (
		<div className='rounded-xl border border-border/50 bg-background/60 p-3'>
			<div className='mb-2 flex items-center gap-2'>
				<Skeleton className='size-3.5 rounded' />
				<Skeleton className='h-3 w-16 rounded-full' />
			</div>
			<Skeleton className='h-4 w-12 rounded-full' />
		</div>
	);
};

const TodaySummarySkeleton = () => {
	return (
		<div className='flex h-full flex-col gap-4'>
			<div className='flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4'>
				<div className='flex items-start justify-between gap-3'>
					<div className='min-w-0 flex-1 space-y-2'>
						<Skeleton className='h-3 w-24 rounded-full' />
						<Skeleton className='h-6 w-2/3 rounded-full' />
					</div>
					<Skeleton className='h-6 w-24 rounded-full' />
				</div>
				<div className='grid grid-cols-2 gap-3 min-[560px]:grid-cols-4'>
					{Array.from({ length: 4 }).map((_, index) => (
						<DashboardStatTileSkeleton key={index} />
					))}
				</div>
			</div>
			<div className='rounded-2xl border border-border/60 bg-background/45 p-4'>
				<div className='mb-3 flex items-center justify-between gap-3'>
					<div className='flex items-center gap-2'>
						<Skeleton className='size-4 rounded' />
						<Skeleton className='h-4 w-28 rounded-full' />
					</div>
					<Skeleton className='h-7 w-20 rounded-full' />
				</div>
				<Skeleton className='h-16 w-full rounded-xl' />
			</div>
		</div>
	);
};

const TodayNewsSkeleton = () => {
	return (
		<div className='space-y-2'>
			{Array.from({ length: 8 }).map((_, index) => (
				<div
					key={index}
					className='flex h-7 items-center justify-between gap-3 rounded-md px-1'>
					<Skeleton
						className={cn(
							'h-4 rounded-full',
							index % 3 === 0
								? 'w-[68%]'
								: index % 3 === 1
									? 'w-[58%]'
									: 'w-[76%]',
						)}
					/>
					<Skeleton className='h-3.5 w-16 shrink-0 rounded-full' />
				</div>
			))}
		</div>
	);
};

const MonthChartSkeleton = () => {
	const bars = [42, 70, 36, 82, 54, 64, 30, 76, 48, 88, 58, 40, 68, 52, 74];
	return (
		<div className='flex h-[250px] w-full flex-col justify-end gap-4'>
			<div className='grid flex-1 grid-cols-[repeat(15,minmax(0,1fr))] items-end gap-2 border-b border-border/60 px-1 pb-3'>
				{bars.map((height, index) => (
					<Skeleton
						key={index}
						className='w-full rounded-t-md'
						style={{ height: `${height}%` }}
					/>
				))}
			</div>
			<div className='grid grid-cols-6 gap-3 px-1'>
				{Array.from({ length: 6 }).map((_, index) => (
					<Skeleton key={index} className='h-3 rounded-full' />
				))}
			</div>
		</div>
	);
};

const LabelChartSkeleton = () => {
	return (
		<div className='flex h-[250px] items-center justify-center'>
			<div className='relative size-44 rounded-full border-[34px] border-muted/70'>
				<Skeleton className='absolute -right-6 top-6 h-5 w-20 rounded-full' />
				<Skeleton className='absolute -left-8 bottom-10 h-5 w-24 rounded-full' />
				<Skeleton className='absolute left-1/2 top-1/2 h-12 w-16 -translate-x-1/2 -translate-y-1/2 rounded-xl' />
			</div>
		</div>
	);
};

const StackedDocumentsSkeleton = () => {
	return (
		<div className='relative flex items-center justify-center'>
			<div className='relative h-32 w-full'>
				{Array.from({ length: 3 }).map((_, index) => (
					<div
						key={index}
						className='absolute inset-0 rounded-xl border border-border/50 bg-primary-foreground p-4'
						style={{
							zIndex: 10 - index,
							transform: `translateY(${index * 6}px) scale(${
								1 - index * 0.05
							})`,
						}}>
						<div className='flex h-full items-center gap-4'>
							<div className='min-w-0 flex-1 space-y-2'>
								<Skeleton className='h-4 w-3/4 rounded-full' />
								<Skeleton className='h-3.5 w-full rounded-full' />
								<Skeleton className='h-3.5 w-5/6 rounded-full' />
							</div>
							<Skeleton className='aspect-square h-full rounded-lg' />
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export {
	LabelChartSkeleton,
	MonthChartSkeleton,
	StackedDocumentsSkeleton,
	TodayNewsSkeleton,
	TodaySummarySkeleton,
};
