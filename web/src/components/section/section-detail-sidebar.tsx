'use client';

import { AlertCircle, Expand } from 'lucide-react';
import { useTranslations } from 'next-intl';

import GraphTaskCard from '@/components/graph/graph-task-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';

import SectionGraph from './section-graph';
import SectionInfo from './section-info';
import SectionMedia from './section-media';

const SectionGraphCardSkeleton = ({
	surfaceCardClassName,
}: {
	surfaceCardClassName: string;
}) => {
	return (
		<Card className={`overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
			<div className='flex items-start justify-between gap-4 border-b border-border/60 px-4 pb-0 pt-4 sm:px-5 sm:pt-5'>
				<div className='space-y-2 pb-4'>
					<div className='h-6 w-28 rounded-xl bg-muted/70' />
					<div className='h-4 w-48 rounded-full bg-muted/60' />
				</div>
				<div className='size-10 shrink-0 rounded-2xl bg-muted/70' />
			</div>

			<div className='px-4 pb-4 pt-4 sm:px-5 sm:pb-5'>
				<div className='h-[300px] w-full rounded-[24px] bg-muted/60' />
			</div>
		</Card>
	);
};

type SectionDetailSidebarProps = {
	id: number;
	isPending: boolean;
	hasSection: boolean;
	graphBadge: string;
	graphTone: 'default' | 'success' | 'warning' | 'danger';
	graphStale: boolean;
	surfaceCardClassName: string;
};

const SectionDetailSidebar = ({
	id,
	isPending,
	hasSection,
	graphBadge,
	graphTone,
	graphStale,
	surfaceCardClassName,
}: SectionDetailSidebarProps) => {
	const t = useTranslations();

	return (
		<div className='space-y-5 p-4'>
			<SectionInfo id={id} />

			{isPending && !hasSection ? (
				<SectionGraphCardSkeleton surfaceCardClassName={surfaceCardClassName} />
			) : (
				<GraphTaskCard
					title={t('section_graph')}
					description={t('section_graph_description')}
					badge={graphBadge}
					hint={graphStale ? t('section_graph_stale_hint') : undefined}
					tone={graphTone}
					className={`gap-0 overflow-hidden py-0 ${surfaceCardClassName}`}
					action={
						<Dialog>
							<DialogTrigger asChild>
								<Button
									className='size-8 shrink-0 rounded-2xl border-border/70 bg-background/65 shadow-none hover:bg-background'
									size='icon'
									variant='outline'>
									<Expand size={4} className='text-muted-foreground' />
								</Button>
							</DialogTrigger>
							<DialogContent className='flex h-[82vh] w-[min(1440px,96vw)] max-w-[min(1440px,96vw)] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-[min(1440px,96vw)]'>
								<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
									<DialogTitle>{t('section_graph')}</DialogTitle>
									<DialogDescription>
										{t('section_graph_description')}
									</DialogDescription>
									{graphStale ? (
										<div className='flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-800 dark:text-amber-200'>
											<AlertCircle className='mt-0.5 size-4 shrink-0' />
											<span>{t('section_graph_stale_hint')}</span>
										</div>
									) : null}
								</DialogHeader>
								<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
									<div className='h-full min-h-[360px] overflow-hidden rounded-2xl border border-border/60 bg-background/45'>
										<SectionGraph
											section_id={id}
											showSearch
											showStaleHint={false}
										/>
									</div>
								</div>
							</DialogContent>
						</Dialog>
					}>
					<div className='h-[300px] overflow-hidden rounded-[20px] border border-border/60 bg-background/35'>
						<SectionGraph section_id={id} showStaleHint={false} />
					</div>
				</GraphTaskCard>
			)}

			<SectionMedia
				section_id={id}
				surfaceCardClassName={surfaceCardClassName}
			/>
		</div>
	);
};

export default SectionDetailSidebar;
