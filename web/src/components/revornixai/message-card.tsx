'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/ai';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	ChevronDownIcon,
	CheckCircle2Icon,
	CopyIcon,
	FileTextIcon,
	PenLineIcon,
	SparkleIcon,
	WrenchIcon,
	XCircleIcon,
} from 'lucide-react';
import { isEmpty } from 'lodash-es';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import CustomMarkdown from '../ui/custom-markdown';

const MessageCard = ({ message }: { message: Message }) => {
	const t = useTranslations();
	const ai_workflow = message.ai_workflow;
	const ai_state = message.ai_state;
	const documentSources =
		message.document_sources ?? message.document_references;
	const chunkCitations = message.chunk_citations ?? message.references;
	const [sourcesOpen, setSourcesOpen] = useState(false);
	const [citationsOpen, setCitationsOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const copyResetTimerRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (copyResetTimerRef.current) {
				window.clearTimeout(copyResetTimerRef.current);
			}
		};
	}, []);

	const resolvePhaseLabel = (label?: string) => {
		if (!label) return '';
		if (t.has(label as any)) {
			return t(label as any);
		}
		return label;
	};

	const copyMarkdownToClipboard = async (content: string) => {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(content);
			return;
		}

		const textarea = document.createElement('textarea');
		textarea.value = content;
		textarea.setAttribute('readonly', 'true');
		textarea.style.position = 'absolute';
		textarea.style.left = '-9999px';
		document.body.appendChild(textarea);
		textarea.select();
		document.execCommand('copy');
		document.body.removeChild(textarea);
	};

	const handleCopyMarkdown = async () => {
		if (!message.content?.trim()) {
			toast.error(t('copy_failed'));
			return;
		}

		try {
			await copyMarkdownToClipboard(message.content);
			setCopied(true);
			if (copyResetTimerRef.current) {
				window.clearTimeout(copyResetTimerRef.current);
			}
			copyResetTimerRef.current = window.setTimeout(() => {
				setCopied(false);
			}, 1600);
			toast.success(t('copy_successfully'));
		} catch (_error) {
			toast.error(t('copy_failed'));
		}
	};

	const cleanReferenceExcerpt = (text: string) => {
		return text.replace(/\s+/g, ' ').trim();
	};

	const buildChunkCitationSummary = () => {
		return (chunkCitations ?? [])
			.slice(0, 2)
			.map((citation) => citation.document_title)
			.filter(Boolean)
			.join(' · ');
	};

	const renderChunkCitations = () => {
		if (!chunkCitations || chunkCitations.length === 0) {
			return null;
		}

		const summary = buildChunkCitationSummary();

		return (
			<Collapsible
				open={citationsOpen}
				onOpenChange={setCitationsOpen}
				className='mt-3'>
				<div className='rounded-xl border border-border/50 bg-muted/30 px-3 py-2'>
					<div className='flex items-center justify-between gap-3'>
						<div className='min-w-0 flex-1'>
							<div className='flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground'>
								<span>{t('section_ai_references')}</span>
								<span className='rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] leading-none'>
									{chunkCitations.length}
								</span>
							</div>
							{summary && (
								<div className='mt-1 line-clamp-1 text-xs text-muted-foreground/90'>
									{summary}
								</div>
							)}
						</div>
						<CollapsibleTrigger asChild>
							<button
								type='button'
								className='inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground'>
								<span>
									{citationsOpen
										? t('section_ai_references_hide')
										: t('section_ai_references_show')}
								</span>
								<ChevronDownIcon
									className={cn(
										'size-3.5 transition-transform',
										citationsOpen && 'rotate-180',
									)}
								/>
							</button>
						</CollapsibleTrigger>
					</div>
					<CollapsibleContent className='pt-2'>
						<div className='flex max-h-44 flex-col gap-2 overflow-auto pr-1'>
							{chunkCitations.map((citation) => (
								<div
									key={citation.chunk_id}
									className='rounded-lg border border-border/50 bg-background p-2.5'>
									<div className='flex min-w-0 items-start gap-2'>
										<div className='mt-0.5 rounded-md border border-border/50 bg-muted p-1'>
											<FileTextIcon className='size-3 text-muted-foreground' />
										</div>
										<div className='min-w-0 flex-1'>
											<div className='line-clamp-1 text-xs font-medium text-foreground'>
												{citation.document_title}
											</div>
											<div className='mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/80'>
												Document #{citation.document_id}
											</div>
										</div>
									</div>
									<p className='mt-1.5 line-clamp-2 break-words text-[11px] leading-5 text-muted-foreground'>
										{cleanReferenceExcerpt(citation.excerpt)}
									</p>
								</div>
							))}
						</div>
					</CollapsibleContent>
				</div>
			</Collapsible>
		);
	};

	const renderDocumentSources = () => {
		if (!documentSources || documentSources.length === 0) {
			return null;
		}

		return (
			<Collapsible
				open={sourcesOpen}
				onOpenChange={setSourcesOpen}
				className='mt-3'>
				<div className='rounded-xl border border-border/50 bg-muted/30 px-3 py-2'>
					<div className='flex items-center justify-between gap-3'>
						<div className='min-w-0 flex-1'>
							<div className='flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground'>
								<span>{t('revornix_ai_sources')}</span>
								<span className='rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] leading-none'>
									{documentSources.length}
								</span>
							</div>
							<div className='mt-1 line-clamp-1 text-xs text-muted-foreground/90'>
								{documentSources
									.slice(0, 2)
									.map((source) => source.document_title)
									.join(' · ')}
							</div>
						</div>
						<CollapsibleTrigger asChild>
							<button
								type='button'
								className='inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground'>
								<span>
									{sourcesOpen
										? t('revornix_ai_sources_hide')
										: t('revornix_ai_sources_show')}
								</span>
								<ChevronDownIcon
									className={cn(
										'size-3.5 transition-transform',
										sourcesOpen && 'rotate-180',
									)}
								/>
							</button>
						</CollapsibleTrigger>
					</div>
					<CollapsibleContent className='pt-2'>
						<div className='flex max-h-44 flex-col gap-2 overflow-auto pr-1'>
							{documentSources.map((source) => (
								<div
									key={`${source.document_id}-${source.source_tool ?? 'source'}`}
									className='rounded-lg border border-border/50 bg-background p-2.5'>
									<div className='flex min-w-0 items-start gap-2'>
										<div className='mt-0.5 rounded-md border border-border/50 bg-muted p-1'>
											<FileTextIcon className='size-3 text-muted-foreground' />
										</div>
										<div className='min-w-0 flex-1'>
											<div className='line-clamp-1 text-xs font-medium text-foreground'>
												{source.document_title}
											</div>
											<div className='mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/80'>
												Document #{source.document_id}
											</div>
											{source.section_titles &&
												source.section_titles.length > 0 && (
													<div className='mt-1 line-clamp-1 text-[11px] text-muted-foreground'>
														{source.section_titles.join(' · ')}
													</div>
												)}
										</div>
									</div>
									{source.description && (
										<p className='mt-1.5 line-clamp-2 break-words text-[11px] leading-5 text-muted-foreground'>
											{source.description}
										</p>
									)}
								</div>
							))}
						</div>
					</CollapsibleContent>
				</div>
			</Collapsible>
		);
	};
	return (
		<div
			className={cn('flex w-full', {
				'justify-end': message.role === 'user',
			})}>
			<div
				className={cn(
					'min-w-0 rounded-xl border px-3 py-2.5 md:px-4 md:py-3',
					message.role === 'user'
						? 'max-w-[min(82%,760px)] border-border/60 bg-muted/60'
						: 'max-w-[min(92%,1080px)] border-border/60 bg-card shadow-sm',
				)}>
				{ai_state && (
					<Alert className='mb-3 border-border/60 bg-muted/40'>
						<AlertDescription>
							<Accordion type='multiple' className='w-full'>
								<AccordionItem value='state'>
									<AccordionTrigger className='py-0'>
										<div className='flex flex-row gap-2 items-center'>
											{ai_state.phase === 'thinking' && (
												<SparkleIcon size={12} />
											)}
											{ai_state.phase === 'writing' && (
												<PenLineIcon size={12} />
											)}
											{ai_state.phase === 'tool' && <WrenchIcon size={12} />}
											{ai_state.phase === 'done' && (
												<CheckCircle2Icon size={12} />
											)}
											{ai_state.phase === 'error' && (
												<XCircleIcon size={12} />
											)}
											<AlertTitle className='font-bold text-primary'>
												{resolvePhaseLabel(ai_state?.label)}
											</AlertTitle>
										</div>
									</AccordionTrigger>
									<AccordionContent className='pb-0 mt-2'>
										{ai_workflow && (
											<div className='space-y-1'>
												<div className='relative pl-5'>
													<div className='absolute left-1.5 top-0 bottom-0 w-px bg-border' />

													<div className='space-y-2'>
														{ai_workflow.map((step, index) => {
															return (
																<div
																	className='flex flex-col text-xs'
																	key={index}>
																	<div className='flex flex-row items-center gap-2'>
																		{step.phase === 'thinking' && (
																			<SparkleIcon size={12} />
																		)}
																		{step.phase === 'writing' && (
																			<PenLineIcon size={12} />
																		)}
																		{step.phase === 'tool' && (
																			<WrenchIcon size={12} />
																		)}
																		{step.phase === 'tool_result' && (
																			<WrenchIcon size={12} />
																		)}
																		{step.phase === 'done' && (
																			<CheckCircle2Icon size={12} />
																		)}
																		{step.phase === 'error' && (
																			<XCircleIcon size={12} />
																		)}
																		<span>{resolvePhaseLabel(step.label)}</span>
																	</div>

																	{!isEmpty(step.meta) && (
																		<div className='pl-5 mt-1 w-fit'>
																			{(step.phase === 'tool' ||
																				step.phase === 'tool_result') &&
																			step.meta?.tool && (
																					<div className='break-all rounded border border-border/50 bg-background px-1.5 py-0.5'>
																						{step.meta.tool}
																					</div>
																				)}
																		</div>
																	)}
																</div>
															);
														})}
													</div>
												</div>
											</div>
										)}
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</AlertDescription>
					</Alert>
				)}

				<div className='prose max-w-none break-words dark:prose-invert'>
					<CustomMarkdown content={message.content} />
				</div>
				{message.role === 'assistant' && renderChunkCitations()}
				{message.role === 'assistant' && renderDocumentSources()}
				<div
					className={cn(
						'mt-2.5 flex items-center justify-end border-t pt-1.5',
						message.role === 'user'
							? 'border-border/40'
							: 'border-border/40',
					)}>
					<Button
						type='button'
						size='sm'
						variant='ghost'
						className='h-8 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground'
						aria-label={t('copy')}
						onClick={handleCopyMarkdown}>
						<CopyIcon className='size-3.5' />
						<span>{copied ? t('copied') : t('copy')}</span>
					</Button>
				</div>
			</div>
		</div>
	);
};
export default MessageCard;
