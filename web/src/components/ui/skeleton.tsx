import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='skeleton'
			aria-hidden='true'
			className={cn(
				'skeleton-shimmer rounded-md bg-muted/65 dark:bg-muted/35',
				className,
			)}
			{...props}
		/>
	);
}

const SkeletonText = ({
	lines = 3,
	className,
	lineClassName,
}: {
	lines?: number;
	className?: string;
	lineClassName?: string;
}) => {
	return (
		<div className={cn('space-y-2.5', className)}>
			{Array.from({ length: lines }).map((_, index) => (
				<Skeleton
					key={index}
					className={cn(
						'h-3.5 rounded-full',
						index === lines - 1 ? 'w-3/4' : 'w-full',
						lineClassName,
					)}
				/>
			))}
		</div>
	);
};

const ResourceCardSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				'flex h-full min-h-64 flex-col rounded-xl border border-border/60 bg-card p-5 shadow-sm',
				className,
			)}>
			<div className='flex items-start gap-3'>
				<Skeleton className='size-11 shrink-0 rounded-xl' />
				<div className='min-w-0 flex-1 space-y-2'>
					<Skeleton className='h-5 w-2/3 rounded-full' />
					<Skeleton className='h-4 w-24 rounded-full' />
				</div>
				<Skeleton className='size-8 rounded-lg' />
			</div>
			<SkeletonText className='mt-5' lines={3} />
			<div className='mt-5 flex flex-wrap gap-2'>
				<Skeleton className='h-7 w-20 rounded-full' />
				<Skeleton className='h-7 w-24 rounded-full' />
			</div>
			<div className='mt-auto flex items-center justify-between gap-3 pt-5'>
				<div className='flex items-center gap-2'>
					<Skeleton className='size-7 rounded-full' />
					<Skeleton className='h-4 w-24 rounded-full' />
				</div>
				<Skeleton className='h-9 w-24 rounded-lg' />
			</div>
		</div>
	);
};

const UserCardSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				'rounded-xl border border-border/60 bg-card p-5 shadow-sm',
				className,
			)}>
			<div className='flex items-center gap-3'>
				<Skeleton className='size-12 shrink-0 rounded-full' />
				<div className='min-w-0 flex-1 space-y-2'>
					<Skeleton className='h-5 w-32 rounded-full' />
					<Skeleton className='h-4 w-4/5 rounded-full' />
				</div>
			</div>
			<div className='mt-4 grid grid-cols-2 gap-3'>
				<Skeleton className='h-8 rounded-lg' />
				<Skeleton className='h-8 rounded-lg' />
			</div>
		</div>
	);
};

const ListItemSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				'flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm',
				className,
			)}>
			<Skeleton className='size-10 shrink-0 rounded-lg' />
			<div className='min-w-0 flex-1 space-y-2'>
				<Skeleton className='h-4 w-2/3 rounded-full' />
				<Skeleton className='h-3.5 w-1/2 rounded-full' />
			</div>
			<Skeleton className='h-8 w-20 rounded-lg' />
		</div>
	);
};

const MarkdownContentSkeleton = ({
	className,
	showToolbar = false,
}: {
	className?: string;
	showToolbar?: boolean;
}) => {
	return (
		<div
			className={cn(
				'mx-auto w-full max-w-[880px] space-y-5 pt-5',
				className,
			)}>
			{showToolbar ? (
				<div className='flex items-center justify-between gap-3 rounded-[22px] border border-border/50 bg-background/35 px-4 py-3 shadow-none'>
					<div className='min-w-0 flex-1 space-y-2'>
						<Skeleton className='h-4 w-28 rounded-full' />
						<Skeleton className='h-3 w-44 max-w-full rounded-full' />
					</div>
					<Skeleton className='h-8 w-20 shrink-0 rounded-full' />
				</div>
			) : null}

			<div className='space-y-3'>
				<Skeleton className='h-8 w-[56%] rounded-xl sm:h-9' />
				<SkeletonText lines={4} lineClassName='h-4' />
			</div>
			<div className='space-y-3'>
				<Skeleton className='h-6 w-40 rounded-xl' />
				<SkeletonText lines={5} lineClassName='h-4' />
			</div>
			<div className='space-y-3'>
				<Skeleton className='h-6 w-32 rounded-xl' />
				<SkeletonText lines={4} lineClassName='h-4' />
			</div>
		</div>
	);
};

const TablePanelSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				'rounded-xl border border-border/60 bg-card p-4 shadow-sm',
				className,
			)}>
			<div className='mb-4 flex items-center justify-between gap-4'>
				<div className='space-y-2'>
					<Skeleton className='h-5 w-40 rounded-full' />
					<Skeleton className='h-4 w-56 rounded-full' />
				</div>
				<Skeleton className='h-9 w-24 rounded-lg' />
			</div>
			<div className='space-y-2'>
				{Array.from({ length: 5 }).map((_, index) => (
					<ListItemSkeleton key={index} className='border-border/40 shadow-none' />
				))}
			</div>
		</div>
	);
};

export {
	ListItemSkeleton,
	MarkdownContentSkeleton,
	ResourceCardSkeleton,
	Skeleton,
	SkeletonText,
	TablePanelSkeleton,
	UserCardSkeleton,
};
