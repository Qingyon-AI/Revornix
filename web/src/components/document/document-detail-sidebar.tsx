'use client';

import type { ReactNode } from 'react';

import { Expand, GitBranch, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DocumentCategory, DocumentGraphStatus } from '@/enums/document';
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

import DocumentAudio from './document-audio';
import DocumentGraph from './document-graph';
import DocumentInfo from './document-info';
import DocumentPodcast from './document-podcast';
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

const DocumentSidebarSkeleton = () => {
	return (
			<div className='space-y-5'>
				<div className='space-y-4'>
				<div className='h-8 w-[72%] rounded-2xl bg-muted/70' />
				<div className='h-4 w-full rounded-full bg-muted/60' />
				<div className='h-4 w-5/6 rounded-full bg-muted/60' />
				<div className='h-12 rounded-2xl bg-muted/55' />
				<div className='grid grid-cols-2 gap-3'>
					{Array.from({ length: 2 }).map((_, index) => (
						<div key={index} className='h-18 rounded-2xl bg-muted/45' />
					))}
				</div>
				<div className='h-28 rounded-[22px] bg-muted/50' />
				</div>

			<div className='space-y-5'>
				<Separator className='bg-border/50' />
				<div className='h-24 rounded-[22px] bg-muted/45' />
			</div>

			<div className='space-y-5'>
				<Separator className='bg-border/50' />
				<div className='h-[300px] rounded-[22px] bg-muted/45' />
			</div>
		</div>
	);
};

type DocumentDetailSidebarProps = {
	id: number;
	isPending: boolean;
	hasDocument: boolean;
	hasRenderableGraph: boolean;
	graphBadge: string;
	graphTone: 'default' | 'success' | 'warning' | 'danger';
	graphStale: boolean;
	graphActionLabel: string;
	graphGenerating: boolean;
	documentCategory?: DocumentCategory;
	graphStatus?: DocumentGraphStatus;
	onGraphGenerate: () => void;
};

const DocumentDetailSidebar = ({
	id,
	isPending,
	hasDocument,
	hasRenderableGraph,
	graphBadge,
	graphTone,
	graphStale,
	graphActionLabel,
	graphGenerating,
	documentCategory,
	graphStatus,
	onGraphGenerate,
}: DocumentDetailSidebarProps) => {
	const t = useTranslations();

	return (
		<div className='space-y-4 p-4'>
			{isPending && !hasDocument ? (
				<DocumentSidebarSkeleton />
			) : (
				<>
					<SidebarSection separated={false}>
						<DocumentInfo id={id} />
					</SidebarSection>

					<SidebarSection>
						{documentCategory === DocumentCategory.AUDIO ? (
							<DocumentAudio document_id={id} />
						) : (
							<DocumentPodcast document_id={id} />
						)}
					</SidebarSection>

					<SidebarSection
						>
							<SidebarTaskNode
								icon={GitBranch}
								status={graphBadge}
								title={t('document_graph')}
								description={t('document_graph_description')}
								tone={graphTone}
								hint={graphStale ? t('document_graph_stale_hint') : undefined}
								action={
									<div className='flex items-center gap-2'>
										<Button
											variant='outline'
											className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
											onClick={onGraphGenerate}
											disabled={
												graphStatus === DocumentGraphStatus.BUILDING ||
												graphGenerating
											}>
											{graphStatus === DocumentGraphStatus.BUILDING ||
											graphGenerating ? (
												<Loader2 className='size-4 animate-spin' />
											) : null}
											{graphActionLabel}
										</Button>
									</div>
								}
								result={
									hasRenderableGraph ? (
										<div className='relative aspect-square overflow-hidden rounded-[20px] border border-border/35 bg-background/20'>
											<DocumentGraph document_id={id} hideStatePanels />
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
														<DialogTitle>{t('document_graph')}</DialogTitle>
														<DialogDescription>
															{t('document_graph_description')}
														</DialogDescription>
													</DialogHeader>
													<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
														<div className='h-full min-h-[360px] overflow-hidden rounded-2xl border border-border/60 bg-background/45'>
															<DocumentGraph document_id={id} showSearch />
														</div>
													</div>
												</DialogContent>
											</Dialog>
										</div>
									) : null
								}
							/>
					</SidebarSection>
				</>
			)}
		</div>
	);
};

export default DocumentDetailSidebar;
