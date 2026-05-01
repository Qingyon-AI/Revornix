'use client';

import type { ReactNode } from 'react';

import { AlertCircle, Expand, GitBranch } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import SectionGraph from './section-graph';
import SectionInfo from './section-info';
import SectionMedia from './section-media';
import SidebarTaskNode from '@/components/ui/sidebar-task-node';

const SidebarSection = ({
	title,
	description,
	children,
	action,
	separated = true,
}: {
	title?: string;
	description?: string;
	children: ReactNode;
	action?: ReactNode;
	separated?: boolean;
}) => {
	return (
		<section className='space-y-4'>
			{separated ? <Separator className='bg-border/50' /> : null}
			{title ? (
				<div className='flex items-start justify-between gap-3'>
					<div className='space-y-1.5'>
						<h3 className='text-[1.35rem] font-semibold tracking-tight'>{title}</h3>
						{description ? (
							<p className='text-sm leading-7 text-muted-foreground'>
								{description}
							</p>
						) : null}
					</div>
					{action ? <div className='shrink-0'>{action}</div> : null}
				</div>
			) : null}
			{children}
		</section>
	);
};

const SectionGraphCardSkeleton = () => (
	<div className='space-y-5'>
		<Separator className='bg-border/50' />
		<div className='rounded-[22px] border border-border/60 bg-background/35 p-4'>
			<div className='flex items-start gap-3'>
				<Skeleton className='size-10 rounded-xl' />
				<div className='min-w-0 flex-1 space-y-2'>
					<Skeleton className='h-4 w-24 rounded-full' />
					<Skeleton className='h-5 w-32 rounded-full' />
					<Skeleton className='h-4 w-full rounded-full' />
				</div>
			</div>
		</div>
	</div>
);

type SectionDetailSidebarProps = {
	id: number;
	isPending: boolean;
	hasSection: boolean;
	hasRenderableGraph: boolean;
	graphBadge: string;
	graphTone: 'default' | 'success' | 'warning' | 'danger';
	graphStale: boolean;
};

const SectionDetailSidebar = ({
	id,
	isPending,
	hasSection,
	hasRenderableGraph,
	graphBadge,
	graphTone,
	graphStale,
}: SectionDetailSidebarProps) => {
	const t = useTranslations();

	return (
		<div className='space-y-4 p-4'>
			<SidebarSection separated={false}>
				<SectionInfo id={id} />
			</SidebarSection>
			<SidebarSection>
				<SectionMedia section_id={id} />
			</SidebarSection>

			{isPending && !hasSection ? (
				<SectionGraphCardSkeleton />
			) : (
				<SidebarSection>
						<SidebarTaskNode
							icon={GitBranch}
							status={graphBadge}
							title={t('section_graph')}
							description={t('section_graph_description')}
							tone={graphTone}
							hint={graphStale ? t('section_graph_stale_hint') : undefined}
							result={
								hasRenderableGraph ? (
								<div className='relative aspect-square overflow-hidden rounded-[20px] border border-border/35 bg-background/20'>
									<SectionGraph section_id={id} showStaleHint={false} />
									<Dialog>
										<DialogTrigger asChild>
											<Button
												className='pointer-events-auto absolute right-3 top-3 z-20 size-8 shrink-0 rounded-2xl border-border/70 bg-background/80 shadow-none hover:bg-background'
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
								</div>
								) : null
							}
						/>
				</SidebarSection>
			)}
		</div>
	);
};

export default SectionDetailSidebar;
