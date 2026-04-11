'use client';

import { Mermaid } from '@ant-design/x';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { AlertCircle, ChevronDown, Grid3X3, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
	NodeViewContent,
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { normalizeMermaidDiagram } from '@/lib/mermaid';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);
const DIAGRAM_PANEL_MAX_HEIGHT = 360;
const DIAGRAM_SOURCE_MAX_HEIGHT = 360;

const CODE_BLOCK_LANGUAGES = [
	{ value: 'plaintext', label: 'Plain Text' },
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'typescript', label: 'TypeScript' },
	{ value: 'jsx', label: 'JSX' },
	{ value: 'tsx', label: 'TSX' },
	{ value: 'python', label: 'Python' },
	{ value: 'json', label: 'JSON' },
	{ value: 'bash', label: 'Bash' },
	{ value: 'sql', label: 'SQL' },
	{ value: 'html', label: 'HTML' },
	{ value: 'css', label: 'CSS' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'yaml', label: 'YAML' },
	{ value: 'mermaid', label: 'Mermaid' },
] as const;

const getLanguageLabel = (language: string) =>
	CODE_BLOCK_LANGUAGES.find((item) => item.value === language)?.label ??
	language.toUpperCase();

const MERMAID_DIAGRAM_PREFIXES = [
	'flowchart',
	'graph',
	'sequenceDiagram',
	'classDiagram',
	'stateDiagram',
	'erDiagram',
	'journey',
	'gantt',
	'pie',
	'mindmap',
	'timeline',
	'gitGraph',
	'quadrantChart',
	'requirementDiagram',
	'zenuml',
	'block-beta',
	'architecture-beta',
];

const getMermaidDiagramHintError = (diagram: string) => {
	const trimmed = diagram.trim();
	if (!trimmed) {
		return null;
	}

	const [firstLine = ''] = trimmed.split('\n');
	const hasKnownPrefix = MERMAID_DIAGRAM_PREFIXES.some((prefix) =>
		firstLine.startsWith(prefix),
	);

	if (!hasKnownPrefix) {
		return 'Start the first line with a Mermaid diagram type such as "flowchart TD" or "sequenceDiagram".';
	}

	const squareBracketBalance =
		(diagram.match(/\[/g)?.length ?? 0) - (diagram.match(/\]/g)?.length ?? 0);
	const roundBracketBalance =
		(diagram.match(/\(/g)?.length ?? 0) - (diagram.match(/\)/g)?.length ?? 0);
	const curlyBracketBalance =
		(diagram.match(/\{/g)?.length ?? 0) - (diagram.match(/\}/g)?.length ?? 0);

	if (squareBracketBalance !== 0 || roundBracketBalance !== 0 || curlyBracketBalance !== 0) {
		return 'Some brackets look unbalanced. Check (), [] and {} pairs in the source below.';
	}

	return null;
};

const MermaidCodeBlockView = ({ node, editor }: NodeViewProps) => {
	const language = String(node.attrs.language ?? 'plaintext').toLowerCase();
	const isMermaid = language === 'mermaid';
	const languageLabel = getLanguageLabel(language);
	const rawSource = node.textContent ?? '';
	const sourceLines = useMemo(() => {
		const lines = rawSource.split('\n');
		return lines.length > 0 ? lines : [''];
	}, [rawSource]);
	const normalizedDiagram = useMemo(
		() => normalizeMermaidDiagram(rawSource),
		[rawSource],
	);
	const hasDiagramContent = normalizedDiagram.trim().length > 0;
	const diagramError = isMermaid
		? getMermaidDiagramHintError(normalizedDiagram)
		: null;
	const [isCodeBlockHidden, setIsCodeBlockHidden] = useState(!editor.isEditable);

	const renderLanguageControl = () => {
		if (!editor.isEditable) {
			return (
				<div
					className='rounded-md border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground'
					contentEditable={false}>
					{languageLabel}
				</div>
			);
		}

		return (
			<Select
				value={language}
				onValueChange={(value) => {
					editor.commands.updateAttributes('codeBlock', {
						language: value,
					});
				}}>
				<SelectTrigger
					size='sm'
					className='h-8 min-w-32 gap-1 border-border/60 bg-background/80 text-xs shadow-none'
					contentEditable={false}
					onMouseDown={(event) => event.preventDefault()}>
					<SelectValue placeholder='Language' />
				</SelectTrigger>
				<SelectContent>
					{CODE_BLOCK_LANGUAGES.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	};

	const renderMermaidSource = () => {
		return (
			<div
				className='flex h-full min-h-[172px] flex-col overflow-hidden rounded-[0.75rem] border border-zinc-800/80 bg-zinc-950 text-zinc-100'
				style={{ maxHeight: `${DIAGRAM_SOURCE_MAX_HEIGHT}px` }}>
				<div
					className='flex items-center justify-between border-b border-white/10 px-3 py-1.5'
					contentEditable={false}>
					<div className='flex items-center gap-2'>
						<div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400'>
							Source
						</div>
						<div className='text-[11px] text-zinc-500'>
							{editor.isEditable
								? 'Edit Mermaid syntax inline'
								: 'View Mermaid source'}
						</div>
					</div>
				</div>
				<div className='flex min-h-[112px] flex-1 items-stretch overflow-auto'>
					<div
						className='flex h-full w-9 shrink-0 flex-col border-r border-white/10 bg-white/[0.03] px-1.5 py-2 text-right font-mono text-[10px] leading-5 text-zinc-500'
						contentEditable={false}>
						{sourceLines.map((_, index) => (
							<div key={index}>{index + 1}</div>
						))}
					</div>
					<div className='flex flex-1 overflow-auto bg-white/[0.02]'>
						<NodeViewContent className='block min-h-[112px] w-full flex-1 whitespace-pre px-3 py-2.5 font-mono text-[12.5px] leading-5 text-zinc-100 [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none' />
					</div>
				</div>
			</div>
		);
	};

	if (!isMermaid) {
		return (
			<NodeViewWrapper className='my-3 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'>
				<div
					className='flex items-center justify-between border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700/80 dark:bg-zinc-950/60'
					contentEditable={false}>
					<div className='text-xs font-medium text-muted-foreground'>Code Block</div>
					{renderLanguageControl()}
				</div>
				<div className='overflow-x-auto'>
					<NodeViewContent className='whitespace-pre p-3 font-mono text-[0.95em] leading-7' />
				</div>
			</NodeViewWrapper>
		);
	}

	return (
		<NodeViewWrapper className='my-2.5 overflow-hidden rounded-[0.9rem] border border-border/70 bg-gradient-to-b from-card via-card to-muted/20 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.24)]'>
			<div
				className='flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-muted/50 via-background to-muted/20 px-3 py-2'
				contentEditable={false}>
				<div className='min-w-0'>
					<div className='flex items-center gap-2'>
						<div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400'>
							Live
						</div>
						<div className='truncate text-sm font-medium text-foreground'>Mermaid Preview</div>
					</div>
					<div className='mt-0.5 truncate text-[11px] text-muted-foreground'>
						Inline preview synced with the source panel.
					</div>
				</div>
				<div className='flex items-center gap-2'>
					<button
						type='button'
						className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
						contentEditable={false}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => setIsCodeBlockHidden((value) => !value)}>
						{isCodeBlockHidden ? 'Show code' : 'Hide code'}
						<ChevronDown
							className={`size-3.5 transition-transform ${isCodeBlockHidden ? '-rotate-90' : 'rotate-0'}`}
						/>
					</button>
					{renderLanguageControl()}
				</div>
			</div>
			<div
				className={`grid gap-2.5 p-2.5 ${isCodeBlockHidden ? '' : 'md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)]'} md:items-stretch`}>
				<div
					className='overflow-hidden rounded-[0.8rem] border border-emerald-200/70 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px),radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] bg-[size:18px_18px,18px_18px,auto,auto] shadow-inner dark:border-emerald-500/20 dark:bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_24%),linear-gradient(180deg,_rgba(9,14,24,0.98),_rgba(15,23,42,0.95))] dark:bg-[size:18px_18px,18px_18px,auto,auto]'
					style={{ maxHeight: `${DIAGRAM_PANEL_MAX_HEIGHT}px` }}
					contentEditable={false}>
					<div className='flex items-center justify-between border-b border-border/50 p-1.5'>
						<div className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300'>
							<Grid3X3 className='size-3.5' />
							Canvas
						</div>
						<div className='text-[10px] text-muted-foreground'>
							{diagramError
								? 'Fix the source below to recover the preview'
								: hasDiagramContent
									? 'Pan to inspect'
									: 'Start typing Mermaid syntax'}
						</div>
					</div>
					<div className='overflow-auto p-1.5 pt-0' style={{ maxHeight: `${DIAGRAM_PANEL_MAX_HEIGHT - 44}px` }}>
						{!hasDiagramContent ? (
							<div className='flex min-h-[116px] flex-col items-center justify-center rounded-[0.65rem] border border-dashed border-emerald-300/70 bg-background/70 px-3 text-center dark:border-emerald-500/30 dark:bg-slate-950/40'>
								<div className='flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'>
									<Sparkles className='size-4.5' />
								</div>
								<div className='mt-2.5 text-sm font-semibold text-foreground'>
									Preview appears here
								</div>
								<div className='mt-1 max-w-sm text-[11px] leading-4.5 text-muted-foreground'>
									Try starting with <code className='rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300'>flowchart TD</code> and define a few connected nodes below.
								</div>
							</div>
						) : diagramError ? (
							<div className='flex min-h-[116px] flex-col items-center justify-center rounded-[0.65rem] border border-dashed border-rose-300 bg-rose-50/80 px-3 text-center dark:border-rose-500/30 dark:bg-rose-950/20'>
								<div className='flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300'>
									<AlertCircle className='size-4.5' />
								</div>
								<div className='mt-2.5 text-sm font-semibold text-rose-700 dark:text-rose-300'>
									Syntax needs attention
								</div>
								<div className='mt-1 max-w-md text-[11px] leading-4.5 text-rose-700/80 dark:text-rose-200/80'>
									{diagramError}
								</div>
							</div>
						) : (
							<Mermaid
								className='rev-mermaid'
								header={null}
								actions={{
									enableZoom: false,
									enableDownload: false,
									enableCopy: false,
								}}
								styles={{
									root: {
										background: 'transparent',
									},
									graph: {
										height: 'auto',
										minHeight: '112px',
										padding: 0,
										border: 'none',
										background: 'transparent',
										borderRadius: 0,
									},
									code: {
										display: 'none',
									},
								}}>
								{normalizedDiagram}
							</Mermaid>
						)}
					</div>
				</div>
				{isCodeBlockHidden ? null : renderMermaidSource()}
			</div>
		</NodeViewWrapper>
	);
};

const MermaidCodeBlock = CodeBlockLowlight.configure({
	lowlight,
}).extend({
	addNodeView() {
		return ReactNodeViewRenderer(MermaidCodeBlockView);
	},
});

export default MermaidCodeBlock;
