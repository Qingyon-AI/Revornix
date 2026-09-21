'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	AlertTriangleIcon,
	BotIcon,
	CheckIcon,
	ChevronDownIcon,
	CopyIcon,
	FileTextIcon,
	Loader2Icon,
	WrenchIcon,
	XCircleIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { replacePath } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import CustomMarkdown from '../ui/custom-markdown';
import ImagePreview from '../ui/image-preview';
import { ReferenceRow } from './reference-chip';
import type {
	AgentCitation,
	AgentMessage,
	AgentReference,
	AgentTimelineItem,
	AgentToolCall,
} from '@/types/agent';

const QUICK_NOTE_IMPORT_STORAGE_KEY = 'revornix.quick-note.import';

const ToolStatusIcon = ({ status }: { status: AgentToolCall['status'] }) => {
	if (status === 'running')
		return <Loader2Icon className='size-3 animate-spin text-muted-foreground' />;
	if (status === 'error') return <XCircleIcon className='size-3 text-destructive' />;
	return <CheckIcon className='size-3 text-green-600' />;
};

/** 结果太长时给预览;全文还在(details),展开可看。 */
const previewText = (value: unknown, limit = 600): string => {
	if (value === undefined || value === null) return '';
	const text =
		typeof value === 'string' ? value : JSON.stringify(value, null, 2);
	return text.length > limit ? text.slice(0, limit) + '…' : text;
};

const ToolCard = ({ tool, nested }: { tool: AgentToolCall; nested?: boolean }) => {
	const [open, setOpen] = useState(false);
	const duration = tool.usage?.duration_seconds;
	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger asChild>
				<button
					type='button'
					className={cn(
						'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60',
						nested ? 'bg-transparent' : 'bg-muted/40',
					)}>
					{nested ? (
						<BotIcon className='size-3 shrink-0 text-muted-foreground' />
					) : (
						<WrenchIcon className='size-3 shrink-0 text-muted-foreground' />
					)}
					<span className='min-w-0 flex-1 truncate font-medium'>
						{tool.name ?? 'tool'}
					</span>
					{duration !== undefined && (
						<span className='shrink-0 text-muted-foreground'>{duration}s</span>
					)}
					<ToolStatusIcon status={tool.status} />
					<ChevronDownIcon
						className={cn(
							'size-3 shrink-0 text-muted-foreground transition-transform',
							open && 'rotate-180',
						)}
					/>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent className='pt-1 pb-1'>
				{tool.args !== undefined && (
					<pre className='mb-1 max-h-36 overflow-auto rounded-md bg-muted/60 p-2 text-[11px] leading-4 whitespace-pre-wrap break-all'>
						{previewText(tool.args, 800)}
					</pre>
				)}
				{tool.status !== 'running' && tool.result !== undefined && (
					<pre className='max-h-48 overflow-auto rounded-md bg-muted/60 p-2 text-[11px] leading-4 whitespace-pre-wrap break-all'>
						{previewText(tool.result)}
					</pre>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
};

const ThinkingBlock = ({ text, done }: { text: string; done?: boolean }) => {
	const [open, setOpen] = useState(false);
	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger asChild>
				<button
					type='button'
					className='inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground'>
					{!done && <Loader2Icon className='size-3 animate-spin' />}
					<span>{done ? 'Thinking' : 'Thinking…'}</span>
					<ChevronDownIcon
						className={cn('size-3 transition-transform', open && 'rotate-180')}
					/>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent className='pt-1'>
				<div className='rounded-lg border-l-2 border-muted pl-3 text-xs leading-5 whitespace-pre-wrap text-muted-foreground'>
					{text}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
};

/** 一轮回答的时间线:正文/思考/工具卡按真实发生顺序渲染,subtool 嵌在父卡下面。 */
export const AgentTimeline = ({ timeline }: { timeline: AgentTimelineItem[] }) => {
	const childrenOf = (parentId: string) =>
		timeline.filter(
			(item): item is Extract<AgentTimelineItem, { type: 'subtool' }> =>
				item.type === 'subtool' && item.parent_id === parentId,
		);
	return (
		<div className='flex flex-col gap-1.5'>
			{timeline.map((item, index) => {
				if (item.type === 'text') {
					return (
						<div
							key={index}
							className='max-w-none break-words text-sm leading-relaxed'>
							<CustomMarkdown content={item.text} />
						</div>
					);
				}
				if (item.type === 'thinking') {
					return <ThinkingBlock key={index} text={item.text} done={item.done} />;
				}
				if (item.type === 'tool') {
					const subtools = childrenOf(item.tool.id);
					return (
						<div key={index}>
							<ToolCard tool={item.tool} />
							{subtools.length > 0 && (
								<div className='mt-1 ml-4 flex flex-col gap-1 border-l border-border/60 pl-2'>
									{subtools.map((sub) => (
										<ToolCard key={sub.tool.id} tool={sub.tool} nested />
									))}
								</div>
							)}
						</div>
					);
				}
				return null; // subtool 已由父卡渲染
			})}
		</div>
	);
};

/**
 * 回答用到的来源。
 *
 * **一排胶囊,和输入框里 `@` 出来的那种长得一模一样** —— 对用户来说它们是同一件事:
 * 「这句话牵扯到知识库里的哪几个东西」。一边画成胶囊、另一边画成折叠列表里的灰条,
 * 会让人以为回答里的来源是另一种、点不动的东西。胶囊点得开,摘录仍然收在下面,
 * 想核对再展开。
 *
 * 同一篇文档命中多个分块时只出现一次胶囊 —— 胶囊说的是「牵扯到哪篇」,而摘录说的是
 * 「哪几段」,后者才需要逐条列。
 */
const Citations = ({ citations }: { citations: AgentCitation[] }) => {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	if (citations.length === 0) return null;
	const cited: AgentReference[] = [];
	const seen = new Set<number>();
	for (const one of citations) {
		if (seen.has(one.document_id)) continue;
		seen.add(one.document_id);
		cited.push({ kind: 'document', id: one.document_id, name: one.document_title });
	}
	return (
		<Collapsible open={open} onOpenChange={setOpen} className='mt-2'>
			<ReferenceRow references={cited} className='mb-1.5' />
			<CollapsibleTrigger asChild>
				<button
					type='button'
					className='inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground'>
					<span>
						{t('section_ai_references')} · {citations.length}
					</span>
					<ChevronDownIcon
						className={cn('size-3 transition-transform', open && 'rotate-180')}
					/>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent className='pt-2'>
				<div className='flex max-h-44 flex-col gap-1.5 overflow-auto'>
					{citations.map((citation) => (
						<div key={citation.chunk_id} className='rounded-lg bg-muted/40 p-2'>
							<div className='flex min-w-0 items-start gap-2'>
								<FileTextIcon className='mt-0.5 size-3 shrink-0 text-muted-foreground' />
								<div className='min-w-0 flex-1'>
									<div className='line-clamp-1 text-xs font-medium'>
										{citation.document_title}
									</div>
									<p className='mt-0.5 line-clamp-2 text-[11px] leading-5 break-words text-muted-foreground'>
										{citation.excerpt}
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

const AgentMessageCard = ({
	message,
	streamTimeline,
	streamText,
}: {
	message?: AgentMessage;
	/** 正在跑的那轮:流式快照优先于落库内容。 */
	streamTimeline?: AgentTimelineItem[];
	streamText?: string;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [copied, setCopied] = useState(false);
	const copyResetTimerRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (copyResetTimerRef.current) window.clearTimeout(copyResetTimerRef.current);
		};
	}, []);

	if (!message && !streamTimeline) return null;

	const role = message?.role ?? 'assistant';
	const payload = message?.payload ?? undefined;
	const content = streamText ?? message?.content ?? '';
	const timeline = streamTimeline ?? payload?.timeline;
	const images = payload?.images ?? [];

	const handleCopy = async () => {
		if (!content.trim()) {
			toast.error(t('copy_failed'));
			return;
		}
		try {
			await navigator.clipboard.writeText(content);
			setCopied(true);
			if (copyResetTimerRef.current) window.clearTimeout(copyResetTimerRef.current);
			copyResetTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
			toast.success(t('copy_successfully'));
		} catch {
			toast.error(t('copy_failed'));
		}
	};

	if (role === 'user') {
		return (
			<div className='flex w-full justify-end'>
				<div className='flex max-w-[min(82%,640px)] min-w-0 flex-col items-end gap-2'>
					{images.length > 0 && mainUserInfo?.id && (
						<div
							className={cn(
								'grid gap-2',
								images.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
							)}>
							{images.map((imagePath) => (
								<ImagePreview
									key={imagePath}
									src={replacePath(imagePath, mainUserInfo.id)}
									alt='uploaded image'
									className='rounded-lg bg-muted/40'
									imageClassName='h-full max-h-[280px] w-full object-cover'
								/>
							))}
						</div>
					)}
					{content.trim() && (
						<div className='flex flex-col gap-1.5 rounded-2xl bg-muted px-3.5 py-2 text-sm break-words'>
							<CustomMarkdown content={content} />
							{/* 用户 `@` 过的东西照原样画回来。正文里只有 `@标题`(那是给模型读的句子),
							    胶囊要靠 payload 里的结构化 id 才点得开 —— 所以它画在正文下面一排,
							    而不是去正文里做字符串替换:标题会重、会带空格,替换迟早替错地方。 */}
							<ReferenceRow references={payload?.references ?? []} />
						</div>
					)}
				</div>
			</div>
		);
	}

	// system 消息:目前只有压缩标记一种。
	if (role === 'system') {
		if (!payload?.compaction) return null;
		return (
			<div className='flex w-full justify-center'>
				<div className='rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground'>
					{t('agent_compaction_marker', {
							count: payload.compaction.droppedMessages,
						})}
				</div>
			</div>
		);
	}

	return (
		<div className='flex w-full'>
			<div className='w-full min-w-0'>
				{message?.error && (
					<div className='mb-3 rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-3 text-sm text-destructive'>
						<div className='flex items-start gap-2'>
							<AlertTriangleIcon className='mt-0.5 size-4 shrink-0' />
							<div className='min-w-0 space-y-1'>
								<div className='font-medium'>{t('revornix_ai_error_title')}</div>
								<div className='leading-6 break-words text-destructive/85'>
									{message.error}
								</div>
							</div>
						</div>
					</div>
				)}

				{payload?.compaction && (
					<div className='mb-2 text-xs text-muted-foreground'>
						{t('agent_compaction_marker', {
							count: payload.compaction.droppedMessages,
						})}
					</div>
				)}

				{timeline && timeline.length > 0 ? (
					<AgentTimeline timeline={timeline} />
				) : (
					content.trim() && (
						<div className='max-w-none break-words text-sm leading-relaxed'>
							<CustomMarkdown content={content} />
						</div>
					)
				)}

				{payload?.citations && <Citations citations={payload.citations} />}

				{content.trim() && (
					<div className='mt-1.5 -ml-2 flex items-center gap-0.5'>
						<Button
							type='button'
							size='sm'
							variant='ghost'
							className='h-7 w-7 p-0 text-muted-foreground hover:text-foreground'
							aria-label={t('copy')}
							title={copied ? t('copied') : t('copy')}
							onClick={handleCopy}>
							{copied ? (
								<CheckIcon className='size-3.5' />
							) : (
								<CopyIcon className='size-3.5' />
							)}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};

export default AgentMessageCard;
