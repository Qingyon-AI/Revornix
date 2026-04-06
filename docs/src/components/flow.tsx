'use client';

const items = [
	{ title: 'Collect', description: 'Bring documents into Revornix from files, websites, notes, or audio.' },
	{ title: 'Process', description: 'Run parsing, summarization, embedding, graph, and podcast workflows.' },
	{ title: 'Organize', description: 'Bind documents into sections and keep derived outputs up to date.' },
	{ title: 'Publish', description: 'Move finished content into community pages, subscriptions, and public access.' },
];

export default function Flow() {
	return (
		<div className='grid gap-4 md:grid-cols-4'>
			{items.map((item, index) => (
				<div
					key={item.title}
					className='rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm'>
					<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
						Stage {index + 1}
					</div>
					<div className='mt-2 text-lg font-semibold'>{item.title}</div>
					<p className='mt-2 text-sm leading-6 text-muted-foreground'>
						{item.description}
					</p>
				</div>
			))}
		</div>
	);
}
