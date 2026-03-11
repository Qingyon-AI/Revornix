'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/ai';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
	FileTextIcon,
	PenLineIcon,
	SparkleIcon,
	WrenchIcon,
	XCircleIcon,
} from 'lucide-react';
import { isEmpty } from 'lodash-es';
import { useTranslations } from 'next-intl';
import CustomMarkdown from '../ui/custom-markdown';

const MessageCard = ({ message }: { message: Message }) => {
	const t = useTranslations();
	const ai_workflow = message.ai_workflow;
	const ai_state = message.ai_state;
	const documentReferences = message.document_references;
	const [sourcesOpen, setSourcesOpen] = useState(false);
	const resolvePhaseLabel = (label?: string) => {
		if (!label) return '';
		if (t.has(label as any)) {
			return t(label as any);
		}
		return label;
	};
	const renderDocumentReferences = () => {
		if (!documentReferences || documentReferences.length === 0) {
			return null;
		}

		return (
			<Collapsible
				open={sourcesOpen}
				onOpenChange={setSourcesOpen}
				className='mt-3'>
				<div className='rounded-xl border border-border/50 bg-card/60 px-3 py-2'>
					<div className='flex items-center justify-between gap-3'>
						<div className='min-w-0 flex-1'>
							<div className='flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground'>
								<span>{t('revornix_ai_sources')}</span>
								<span className='rounded-full border border-border/60 bg-card/75 px-1.5 py-0.5 text-[10px] leading-none'>
									{documentReferences.length}
								</span>
							</div>
							<div className='mt-1 line-clamp-1 text-xs text-muted-foreground/90'>
								{documentReferences
									.slice(0, 2)
									.map((reference) => reference.document_title)
									.join(' · ')}
							</div>
						</div>
						<CollapsibleTrigger asChild>
							<button
								type='button'
								className='inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground'>
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
							{documentReferences.map((reference) => (
								<div
									key={`${reference.document_id}-${reference.source_tool ?? 'source'}`}
									className='rounded-lg border border-border/50 bg-card/60 p-2.5'>
									<div className='flex min-w-0 items-start gap-2'>
										<div className='mt-0.5 rounded-md border border-border/50 bg-card/75 p-1'>
											<FileTextIcon className='size-3 text-muted-foreground' />
										</div>
										<div className='min-w-0 flex-1'>
											<div className='line-clamp-1 text-xs font-medium text-foreground'>
												{reference.document_title}
											</div>
											<div className='mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/80'>
												Document #{reference.document_id}
											</div>
											{reference.section_titles &&
												reference.section_titles.length > 0 && (
													<div className='mt-1 line-clamp-1 text-[11px] text-muted-foreground'>
														{reference.section_titles.join(' · ')}
													</div>
												)}
										</div>
									</div>
									{reference.description && (
										<p className='mt-1.5 line-clamp-2 break-words text-[11px] leading-5 text-muted-foreground'>
											{reference.description}
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
			className={cn('flex flex-row gap-5', {
				'justify-end': message.role === 'user',
			})}>
			<div className='flex flex-col gap-2'>
				<div
					className={cn(
						'min-w-0 max-w-full rounded-xl border p-3 md:max-w-3xl',
						message.role === 'user'
							? 'w-fit border-primary/15 bg-primary/10'
							: 'w-fit border-border/60 bg-card/80',
					)}>
					{ai_state && (
						<Alert className='mb-4 border-border/60 bg-card/70'>
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
														{/* 竖线 */}
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
																						<div className='break-all rounded border border-border/50 bg-card/75 px-1.5 py-0.5'>
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
					{message.role === 'assistant' && renderDocumentReferences()}
				</div>
			</div>
		</div>
	);
};
export default MessageCard;
