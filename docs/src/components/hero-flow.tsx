'use client';

import { cn } from '@/lib/utils';

const columns = [
	{
		title: 'Inputs',
		items: ['Chrome extension', 'npm package', 'PyPI package', 'Web app'],
	},
	{
		title: 'Revornix',
		items: ['Document ingestion', 'Section workflows', 'AI orchestration'],
	},
	{
		title: 'Outputs',
		items: ['Markdown', 'Podcast', 'Graph', 'PPT', 'Public pages'],
	},
];

const HeroFlow = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				'grid gap-4 rounded-3xl border border-border/60 bg-card/70 p-6 md:grid-cols-3',
				className,
			)}>
			{columns.map((column) => (
				<div
					key={column.title}
					className='rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm'>
					<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
						{column.title}
					</div>
					<div className='mt-4 flex flex-col gap-3'>
						{column.items.map((item) => (
							<div
								key={item}
								className='rounded-xl border border-border/60 bg-card px-3 py-2 text-sm font-medium text-foreground/90'>
								{item}
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
};

export default HeroFlow;
