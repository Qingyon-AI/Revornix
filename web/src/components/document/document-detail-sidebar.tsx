'use client';

import { Expand, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import GraphTaskCard from '@/components/graph/graph-task-card';
import { DocumentCategory, DocumentGraphStatus } from '@/enums/document';
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

import DocumentAudio from './document-audio';
import DocumentGraph from './document-graph';
import DocumentInfo from './document-info';
import DocumentPodcast from './document-podcast';

const DocumentSidebarSkeleton = ({
	surfaceCardClassName,
}: {
	surfaceCardClassName: string;
}) => {
	return (
		<div className='space-y-5'>
			<Card
				className={`relative overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
				<div className='space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5'>
					<div className='space-y-3'>
						<div className='h-8 w-[72%] rounded-2xl bg-muted/70' />
						<div className='h-4 w-full rounded-full bg-muted/60' />
						<div className='h-4 w-5/6 rounded-full bg-muted/60' />
					</div>
					<div className='flex items-center gap-3 rounded-2xl border border-border/50 bg-background/45 px-3 py-2.5'>
						<div className='size-10 rounded-full bg-muted/70' />
						<div className='min-w-0 flex-1 space-y-2'>
							<div className='h-4 w-28 rounded-full bg-muted/60' />
							<div className='h-3 w-24 rounded-full bg-muted/50' />
						</div>
					</div>
					<div className='flex flex-wrap gap-1.5'>
						<div className='h-7 w-20 rounded-full bg-muted/60' />
						<div className='h-7 w-24 rounded-full bg-muted/60' />
					</div>
					<div className='grid grid-cols-2 gap-3'>
						{Array.from({ length: 2 }).map((_, index) => (
							<div
								key={index}
								className='rounded-2xl border border-border/50 bg-background/20 px-3 py-2.5'>
								<div className='flex items-start gap-2.5'>
									<div className='size-6 shrink-0 rounded-lg bg-muted/70' />
									<div className='min-w-0 flex-1 space-y-1.5'>
										<div className='h-3 w-18 rounded-full bg-muted/50' />
										<div className='h-4 w-24 rounded-full bg-muted/60' />
										<div className='h-3 w-28 rounded-full bg-muted/50' />
									</div>
								</div>
							</div>
						))}
					</div>
					<div className='flex flex-wrap gap-2 rounded-[24px] border border-border/60 bg-background/35 p-4'>
						<div className='h-9 w-32 rounded-full bg-muted/60' />
						<div className='h-9 w-36 rounded-full bg-muted/60' />
						<div className='h-9 w-32 rounded-full bg-muted/60' />
					</div>
				</div>
			</Card>

			<Card className={`overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
				<div className='flex items-start justify-between gap-4 border-b border-border/60 px-4 pb-4 pt-4 sm:px-5 sm:pt-5'>
					<div className='space-y-2'>
						<div className='h-6 w-32 rounded-xl bg-muted/70' />
						<div className='h-4 w-48 rounded-full bg-muted/60' />
					</div>
					<div className='size-10 rounded-2xl bg-muted/70' />
				</div>

				<div className='px-4 pb-4 pt-4 sm:px-5 sm:pb-5'>
					<div className='h-[300px] w-full rounded-[24px] bg-muted/60' />
				</div>
			</Card>

			<Card
				className={`overflow-hidden gap-0 rounded-[26px] py-0 ${surfaceCardClassName}`}>
				<div className='space-y-4 p-4'>
					<div className='flex items-center gap-3'>
						<div className='size-12 rounded-2xl bg-muted/70' />
						<div className='min-w-0 flex-1 space-y-2'>
							<div className='h-5 w-32 rounded-full bg-muted/60' />
							<div className='h-4 w-24 rounded-full bg-muted/50' />
						</div>
					</div>
					<div className='h-24 w-full rounded-[22px] bg-muted/60' />
					<div className='flex gap-2'>
						<div className='h-9 flex-1 rounded-full bg-muted/60' />
						<div className='h-9 w-24 rounded-full bg-muted/60' />
					</div>
				</div>
			</Card>
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
	surfaceCardClassName: string;
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
	surfaceCardClassName,
	onGraphGenerate,
}: DocumentDetailSidebarProps) => {
	const t = useTranslations();

	return (
		<div className='space-y-5 p-4'>
			{isPending && !hasDocument ? (
				<DocumentSidebarSkeleton surfaceCardClassName={surfaceCardClassName} />
			) : (
				<>
					<DocumentInfo id={id} />

					<GraphTaskCard
						title={t('document_graph')}
						description={t('document_graph_description')}
						badge={graphBadge}
						hint={graphStale ? t('document_graph_stale_hint') : undefined}
						tone={graphTone}
						className={`gap-0 overflow-hidden py-0 ${surfaceCardClassName}`}
						action={
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
						}>
						{hasRenderableGraph ? (
							<div className='relative h-[300px] overflow-hidden rounded-[20px] border border-border/60 bg-background/35'>
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
						) : null}
					</GraphTaskCard>

					{documentCategory === DocumentCategory.AUDIO ? (
						<DocumentAudio document_id={id} className={surfaceCardClassName} />
					) : (
						<DocumentPodcast
							document_id={id}
							className={surfaceCardClassName}
						/>
					)}
				</>
			)}
		</div>
	);
};

export default DocumentDetailSidebar;
