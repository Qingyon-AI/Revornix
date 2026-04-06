import { ArrowRight } from 'lucide-react';

type ProcessStep = {
	title: string;
	description?: string;
};

export const ProcessDiagram = ({
	title,
	steps,
}: {
	title?: string;
	steps: ProcessStep[];
}) => {
	return (
		<div className='my-6 overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-sm'>
			{title ? (
				<div className='border-b border-border/60 bg-background/60 px-5 py-3 text-sm font-medium text-foreground/90'>
					{title}
				</div>
			) : null}
			<div className='flex flex-col gap-3 p-4 md:flex-row md:items-stretch md:gap-2'>
				{steps.map((step, index) => (
					<div
						key={`${step.title}-${index}`}
						className='flex flex-1 items-center gap-2 md:min-w-0'>
						<div className='min-w-0 flex-1 rounded-2xl border border-border/60 bg-background/80 px-4 py-4 shadow-sm'>
							<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
								Step {index + 1}
							</div>
							<div className='mt-2 text-sm font-semibold leading-6 text-foreground'>
								{step.title}
							</div>
							{step.description ? (
								<p className='mt-2 text-sm leading-6 text-muted-foreground'>
									{step.description}
								</p>
							) : null}
						</div>
						{index < steps.length - 1 ? (
							<div className='hidden shrink-0 md:flex'>
								<div className='flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground'>
									<ArrowRight className='size-4' />
								</div>
							</div>
						) : null}
					</div>
				))}
			</div>
		</div>
	);
};
