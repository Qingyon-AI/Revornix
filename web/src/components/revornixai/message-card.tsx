'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/ai';
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
	CheckIcon,
	CopyIcon,
	FileTextIcon,
	NotebookPenIcon,
	PenLineIcon,
	SparkleIcon,
	WrenchIcon,
	XCircleIcon,
} from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { isEmpty } from 'lodash-es';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { replacePath } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import CustomMarkdown from '../ui/custom-markdown';
import ImagePreview from '../ui/image-preview';

const legacyPhaseLabelMap: Record<string, string> = {
	正在理解你的问题: 'revornix_ai_phase_thinking',
	'工具返回结果，继续思考': 'revornix_ai_phase_thinking',
	正在生成回答: 'revornix_ai_phase_writing',
	'服务处理失败，请稍后重试。': 'revornix_ai_error_server_failed',
	'The server failed to complete the request.':
		'revornix_ai_error_server_failed',
	'MCP 工具调用达到步骤上限，未能在限制内完成。':
		'revornix_ai_error_mcp_recursion_limit',
	'The MCP tool-calling workflow hit its step limit before completion.':
		'revornix_ai_error_mcp_recursion_limit',
};

const PhaseIcon = ({ phase, size = 12 }: { phase?: string; size?: number }) => {
	switch (phase) {
		case 'thinking':
			return <SparkleIcon size={size} />;
		case 'writing':
			return <PenLineIcon size={size} />;
		case 'tool':
		case 'tool_result':
			return <WrenchIcon size={size} />;
		case 'done':
			return <CheckCircle2Icon size={size} />;
		case 'error':
			return <XCircleIcon size={size} />;
		default:
			return null;
	}
};

const QUICK_NOTE_IMPORT_STORAGE_KEY = 'revornix.quick-note.import';

const MessageCard = ({ message }: { message: Message }) => {
	const t = useTranslations();
	const router = useRouter();
	const { mainUserInfo } = useUserContext();
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
		if (legacyPhaseLabelMap[label]) {
			return t(legacyPhaseLabelMap[label] as any);
		}
		if (
			label.startsWith('正在调用工具：') ||
			label.startsWith('Calling tool:')
		) {
			return t('revornix_ai_phase_tool');
		}
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

	const handleSaveAsQuickNote = () => {
		const content = message.content?.trim();
		if (!content) {
			toast.error(t('copy_failed'));
			return;
		}
		try {
			window.localStorage.setItem(
				QUICK_NOTE_IMPORT_STORAGE_KEY,
				JSON.stringify({ content: message.content }),
			);
		} catch (error) {
			console.error(error);
		}
		router.push('/document/create');
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

	const renderMessageImages = () => {
		if (!message.images || message.images.length === 0 || !mainUserInfo?.id) {
			return null;
		}

		const singleImage = message.images.length === 1;

		return (
			<div
				className={cn(
					'grid gap-2',
					singleImage ? 'grid-cols-1' : 'grid-cols-2',
				)}>
				{message.images.map((imagePath) => (
					<ImagePreview
						key={imagePath}
						src={replacePath(imagePath, mainUserInfo.id)}
						alt='uploaded image'
						className={cn(
							'rounded-lg bg-muted/40',
							singleImage ? 'max-w-[320px]' : 'aspect-square min-h-[140px]',
						)}
						imageClassName={cn(
							'h-full w-full object-cover',
							singleImage ? 'max-h-[280px] min-h-[180px]' : 'aspect-square',
						)}
					/>
				))}
			</div>
		);
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
				<CollapsibleTrigger asChild>
					<button
						type='button'
						className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'>
						<span>
							{t('section_ai_references')} · {chunkCitations.length}
						</span>
						{summary && (
							<span className='line-clamp-1 max-w-[280px]'>{summary}</span>
						)}
						<ChevronDownIcon
							className={cn(
								'size-3 transition-transform',
								citationsOpen && 'rotate-180',
							)}
						/>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent className='pt-2'>
					<div className='flex max-h-44 flex-col gap-1.5 overflow-auto'>
						{chunkCitations.map((citation) => (
							<div
								key={citation.chunk_id}
								className='rounded-lg bg-muted/40 p-2'>
								<div className='flex min-w-0 items-start gap-2'>
									<FileTextIcon className='size-3 mt-0.5 shrink-0 text-muted-foreground' />
									<div className='min-w-0 flex-1'>
										<div className='line-clamp-1 text-xs font-medium'>
											{citation.document_title}
										</div>
										<p className='mt-0.5 line-clamp-2 break-words text-[11px] leading-5 text-muted-foreground'>
											{cleanReferenceExcerpt(citation.excerpt)}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</CollapsibleContent>
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
				className='mt-2'>
				<CollapsibleTrigger asChild>
					<button
						type='button'
						className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'>
						<span>
							{t('revornix_ai_sources')} · {documentSources.length}
						</span>
						<span className='line-clamp-1 max-w-[280px]'>
							{documentSources
								.slice(0, 2)
								.map((source) => source.document_title)
								.join(' · ')}
						</span>
						<ChevronDownIcon
							className={cn(
								'size-3 transition-transform',
								sourcesOpen && 'rotate-180',
							)}
						/>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent className='pt-2'>
					<div className='flex max-h-44 flex-col gap-1.5 overflow-auto'>
						{documentSources.map((source) => (
							<div
								key={`${source.document_id}-${source.source_tool ?? 'source'}`}
								className='rounded-lg bg-muted/40 p-2'>
								<div className='flex min-w-0 items-start gap-2'>
									<FileTextIcon className='size-3 mt-0.5 shrink-0 text-muted-foreground' />
									<div className='min-w-0 flex-1'>
										<div className='line-clamp-1 text-xs font-medium'>
											{source.document_title}
										</div>
										{source.section_titles &&
											source.section_titles.length > 0 && (
												<div className='mt-0.5 line-clamp-1 text-[11px] text-muted-foreground'>
													{source.section_titles.join(' · ')}
												</div>
											)}
										{source.description && (
											<p className='mt-0.5 line-clamp-2 break-words text-[11px] leading-5 text-muted-foreground'>
												{source.description}
											</p>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</CollapsibleContent>
			</Collapsible>
		);
	};

	if (message.role === 'user') {
		return (
			<div className='flex w-full justify-end'>
				<div className='min-w-0 flex flex-col items-end gap-2 max-w-[min(82%,640px)]'>
					{renderMessageImages()}
					{message.content?.trim() && (
						<div className='rounded-2xl bg-muted px-3.5 py-2 text-sm break-words'>
							<CustomMarkdown content={message.content} />
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className='flex w-full'>
			<div className='min-w-0 w-full'>
				{ai_state && (
					<Accordion type='multiple' className='w-full mb-1'>
						<AccordionItem value='state' className='border-none'>
							<AccordionTrigger className='py-1 hover:no-underline'>
								<div className='flex flex-row gap-2 items-center text-xs text-muted-foreground'>
									<PhaseIcon phase={ai_state.phase} />
									<span>{resolvePhaseLabel(ai_state?.label)}</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className='pb-1 pt-1'>
								{ai_workflow && (
									<div className='relative pl-4 ml-1'>
										<div className='absolute left-0 top-1 bottom-1 w-px bg-border' />
										<div className='space-y-1.5'>
											{ai_workflow.map((step, index) => (
												<div
													className='flex flex-col text-xs text-muted-foreground'
													key={index}>
													<div className='flex flex-row items-center gap-2'>
														<PhaseIcon phase={step.phase} />
														<span>{resolvePhaseLabel(step.label)}</span>
													</div>
													{!isEmpty(step.meta) &&
														(step.phase === 'tool' ||
															step.phase === 'tool_result') &&
														step.meta?.tool && (
															<div className='mt-1 ml-5 w-fit break-all rounded-md bg-muted px-1.5 py-0.5 text-[11px]'>
																{step.meta.tool}
															</div>
														)}
												</div>
											))}
										</div>
									</div>
								)}
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				)}

				<div className='max-w-none break-words text-sm leading-relaxed'>
					<CustomMarkdown content={message.content} />
				</div>
				{renderMessageImages()}
				{renderChunkCitations()}
				{renderDocumentSources()}

				{message.content?.trim() && (
					<div className='mt-1.5 flex items-center gap-0.5 -ml-2'>
						<Button
							type='button'
							size='sm'
							variant='ghost'
							className='h-7 w-7 p-0 text-muted-foreground hover:text-foreground'
							aria-label={t('copy')}
							title={copied ? t('copied') : t('copy')}
							onClick={handleCopyMarkdown}>
							{copied ? (
								<CheckIcon className='size-3.5' />
							) : (
								<CopyIcon className='size-3.5' />
							)}
						</Button>
						<Button
							type='button'
							size='sm'
							variant='ghost'
							className='h-7 w-7 p-0 text-muted-foreground hover:text-foreground'
							aria-label={t('revornix_ai_save_as_quick_note')}
							title={t('revornix_ai_save_as_quick_note')}
							onClick={handleSaveAsQuickNote}>
							<NotebookPenIcon className='size-3.5' />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
export default MessageCard;
