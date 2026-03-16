'use client';

import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { ArrowUpRight, FileText, Network, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type GraphNodeSource = {
	doc_id: number;
	doc_title?: string;
	chunk_id?: string;
};

export type GraphNodeWithSource = {
	id: string;
	label: string;
	sources?: GraphNodeSource[];
};

type NodeSourceDialogProps = {
	node: GraphNodeWithSource | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const NodeSourceDialog = ({
	node,
	open,
	onOpenChange,
}: NodeSourceDialogProps) => {
	const t = useTranslations();
	const sources = (node?.sources ?? []).filter(
		(source) => source.doc_id != null,
	);
	const groupedSources = Array.from(
		sources.reduce((map, source) => {
			const key = `${source.doc_id}`;
			const existing = map.get(key);
			if (existing) {
				existing.occurrences += 1;
				if (source.chunk_id) {
					existing.chunkIds.add(source.chunk_id);
				}
				return map;
			}
			map.set(key, {
				doc_id: source.doc_id,
				doc_title: source.doc_title,
				occurrences: 1,
				chunkIds: new Set(source.chunk_id ? [source.chunk_id] : []),
			});
			return map;
		}, new Map<string, {
			doc_id: number;
			doc_title?: string;
			occurrences: number;
			chunkIds: Set<string>;
		}>()).values(),
	).map((source) => ({
		...source,
		chunkCount: source.chunkIds.size,
	}));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='overflow-hidden border border-border/70 bg-background/98 p-0 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.4)] sm:max-w-xl'>
				<DialogHeader className='border-b border-border/60 bg-gradient-to-br from-background via-background to-sky-500/5 px-6 py-5 text-left'>
					<div className='flex items-start justify-between gap-4'>
						<div className='flex min-w-0 items-start gap-3'>
							<div className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm'>
								<Network className='size-5' />
							</div>
							<div className='min-w-0 space-y-2'>
								<div className='flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
									<Sparkles className='size-3.5' />
									<span>{t('graph_node_source_title')}</span>
								</div>
								<DialogTitle className='text-xl font-semibold tracking-tight'>
									{node?.label ?? t('graph_node_source_entity')}
								</DialogTitle>
								<p className='max-w-md text-sm text-muted-foreground'>
									{t('graph_node_source_entity')}: {node?.label ?? '-'}
								</p>
							</div>
						</div>
					</div>
				</DialogHeader>
				{node && (
					<div className='space-y-5 px-6 pb-5'>
						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm'>
								<div className='mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground'>
									<Network className='size-3.5' />
									<span>{t('graph_node_source_entity')}</span>
								</div>
								<div className='break-words text-sm font-semibold text-foreground'>
									{node.label}
								</div>
							</div>
							<div className='rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm'>
								<div className='mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground'>
									<FileText className='size-3.5' />
									<span>{t('graph_node_source_sources')}</span>
								</div>
								<div className='text-sm font-semibold text-foreground'>
									{groupedSources.length}
								</div>
								<div className='mt-1 text-xs text-muted-foreground'>
									{sources.length} references
								</div>
							</div>
						</div>

						<Separator />

						<div className='space-y-3'>
							<div className='flex items-center justify-between gap-3'>
								<div>
									<div className='text-sm font-semibold text-foreground'>
										{t('graph_node_source_sources')}
									</div>
									<div className='text-xs text-muted-foreground'>
										{groupedSources.length === 0
											? t('graph_node_source_empty')
											: `${groupedSources.length} linked documents`}
									</div>
								</div>
							</div>

							{groupedSources.length > 0 ? (
								<div className='max-h-[22rem] space-y-2 overflow-y-auto overflow-x-hidden pr-2 [scrollbar-gutter:stable]'>
									{groupedSources.map((source) => {
										const href = `/document/detail/${source.doc_id}`;
										return (
											<Link
												key={`${source.doc_id}`}
												href={href}
												className='block w-full overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 transition-all'
												onClick={() => onOpenChange(false)}>
												<div className='grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3'>
													<div className='min-w-0 space-y-2'>
														<div className='truncate text-sm font-semibold text-foreground transition-colors'>
															{source.doc_title ||
																`${t('graph_node_source_doc_id')}: ${source.doc_id}`}
														</div>
														<div className='flex flex-wrap items-center gap-2'>
															<Badge
																variant='outline'
																className='rounded-full border-border/70 bg-background/80'>
																{t('graph_node_source_doc_id')}: {source.doc_id}
															</Badge>
															<Badge
																variant='outline'
																className='rounded-full px-2.5'>
																{source.occurrences} refs
															</Badge>
															{source.chunkCount > 0 ? (
																<Badge
																	variant='outline'
																	className='rounded-full border-border/70 bg-background/80'>
																	{source.chunkCount} chunks
																</Badge>
															) : null}
														</div>
													</div>
													<div className='flex size-9 shrink-0 self-center items-center justify-center rounded-xl border border-border/60 bg-background/90 text-muted-foreground transition-colors'>
														<ArrowUpRight className='size-4' />
													</div>
												</div>
											</Link>
										);
									})}
								</div>
							) : (
								<Empty className='rounded-2xl border border-dashed border-border/70 bg-muted/20 py-10'>
									<EmptyHeader>
										<EmptyMedia variant='icon'>
											<FileText className='size-5' />
										</EmptyMedia>
										<EmptyDescription>{t('graph_node_source_empty')}</EmptyDescription>
									</EmptyHeader>
								</Empty>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default NodeSourceDialog;
