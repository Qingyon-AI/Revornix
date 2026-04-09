'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import katex from 'katex';
import { AlertCircle, ChevronDown, Grid3X3, Sigma, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { extractBlockMath, findBlockMathStart } from '@/lib/math';

const MATH_PANEL_MAX_HEIGHT = 320;
const MATH_SOURCE_MAX_HEIGHT = 320;

const MathBlockView = ({
	node,
	editor,
	updateAttributes,
	selected,
}: NodeViewProps) => {
	const formula = typeof node.attrs.formula === 'string' ? node.attrs.formula : '';
	const isEditable = editor.isEditable;
	const [isCodeHidden, setIsCodeHidden] = useState(!isEditable);
	const sourceLines = (() => {
		const lines = formula.split('\n');
		return lines.length > 0 ? lines : [''];
	})();

	let rendered = '';
	let renderError = '';

	try {
		rendered = katex.renderToString(formula || '\\int_0^1 x^2 dx', {
			throwOnError: true,
			displayMode: true,
		});
	} catch (error) {
		renderError = error instanceof Error ? error.message : 'Invalid formula';
	}

	return (
		<NodeViewWrapper className='my-2.5 overflow-hidden rounded-[0.9rem] border border-border/70 bg-gradient-to-b from-card via-card to-muted/20 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.24)]'>
			<div
				className='flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-muted/50 via-background to-muted/20 px-3 py-2'
				contentEditable={false}>
				<div className='min-w-0'>
					<div className='flex items-center gap-2'>
						<div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600'>
							Live
						</div>
						<div className='truncate text-sm font-medium text-foreground'>Math Preview</div>
					</div>
					<div className='mt-0.5 truncate text-[11px] text-muted-foreground'>
						Inline preview synced with the source panel.
					</div>
				</div>
				<div className='flex items-center gap-2'>
					{isEditable ? (
						<button
							type='button'
							className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
							contentEditable={false}
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => setIsCodeHidden((value) => !value)}>
							{isCodeHidden ? 'Show code' : 'Hide code'}
							<ChevronDown
								className={`size-3.5 transition-transform ${isCodeHidden ? '-rotate-90' : 'rotate-0'}`}
							/>
						</button>
					) : null}
					<div
						className='rounded-md border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground'
						contentEditable={false}>
						KaTeX
					</div>
				</div>
			</div>
			<div
				className={`grid gap-2.5 p-2.5 ${isCodeHidden ? '' : 'md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)]'} md:items-stretch`}>
				<div
					className='overflow-hidden rounded-[0.8rem] border border-sky-200/70 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px),radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] bg-[size:18px_18px,18px_18px,auto,auto] shadow-inner'
					style={{ maxHeight: `${MATH_PANEL_MAX_HEIGHT}px` }}
					contentEditable={false}>
					<div className='flex items-center justify-between border-b border-border/50 p-1.5'>
						<div className='inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700'>
							<Grid3X3 className='size-3.5' />
							Canvas
						</div>
						<div className='text-[10px] text-muted-foreground'>
							{renderError
								? 'Fix the source below to recover the preview'
								: formula.trim()
									? 'Inspect the rendered equation'
									: 'Start typing LaTeX'}
						</div>
					</div>
					<div className='overflow-auto p-1.5 pt-0' style={{ maxHeight: `${MATH_PANEL_MAX_HEIGHT - 44}px` }}>
						{!formula.trim() ? (
							<div className='flex min-h-[116px] flex-col items-center justify-center rounded-[0.65rem] border border-dashed border-sky-300/70 bg-background/70 px-3 text-center'>
								<div className='flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600'>
									<Sparkles className='size-4.5' />
								</div>
								<div className='mt-2.5 text-sm font-semibold text-foreground'>
									Preview appears here
								</div>
								<div className='mt-1 max-w-sm text-[11px] leading-4.5 text-muted-foreground'>
									Try entering <code className='rounded bg-sky-500/10 px-1.5 py-0.5 text-sky-700'>\int_0^1 x^2 \\, dx</code> in the source panel.
								</div>
							</div>
						) : renderError ? (
							<div className='flex min-h-[116px] flex-col items-center justify-center rounded-[0.65rem] border border-dashed border-rose-300 bg-rose-50/80 px-3 text-center'>
								<div className='flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600'>
									<AlertCircle className='size-4.5' />
								</div>
								<div className='mt-2.5 text-sm font-semibold text-rose-700'>
									Syntax needs attention
								</div>
								<div className='mt-1 max-w-md text-[11px] leading-4.5 text-rose-700/80'>
									{renderError}
								</div>
							</div>
						) : (
							<div
								className='flex min-h-[116px] items-center justify-center rounded-[0.65rem] border border-background/80 bg-background/70 px-4 py-6 text-center text-slate-900 [&_.katex-display]:my-0 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1'
								contentEditable={false}
								dangerouslySetInnerHTML={{
									__html: rendered,
								}}
							/>
						)}
					</div>
				</div>
				{isEditable && !isCodeHidden ? (
					<div
						className='flex h-full min-h-[172px] flex-col overflow-hidden rounded-[0.75rem] border border-zinc-800/80 bg-zinc-950 text-zinc-100'
						style={{ maxHeight: `${MATH_SOURCE_MAX_HEIGHT}px` }}>
						<div
							className='flex items-center justify-between border-b border-white/10 px-3 py-1.5'
							contentEditable={false}>
							<div className='flex items-center gap-2'>
								<div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400'>
									Source
								</div>
								<div className='text-[11px] text-zinc-500'>
									Edit LaTeX syntax inline
								</div>
							</div>
							<div className='rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300'>
								$$
							</div>
						</div>
						<div className='flex min-h-[112px] flex-1 items-stretch overflow-hidden'>
							<div
								className='flex h-full w-9 shrink-0 flex-col border-r border-white/10 bg-white/[0.03] px-1.5 py-2 text-right font-mono text-[10px] leading-5 text-zinc-500'
								contentEditable={false}>
								{sourceLines.map((_, index) => (
									<div key={index}>{index + 1}</div>
								))}
							</div>
							<div className='flex flex-1 overflow-auto bg-white/[0.02]'>
								<textarea
									value={formula}
									onChange={(event) =>
										updateAttributes({ formula: event.target.value })
									}
									onMouseDown={(event) => event.stopPropagation()}
									className='block h-full min-h-[112px] w-full flex-1 resize-none overflow-auto bg-transparent px-3 py-2.5 font-mono text-[12.5px] leading-5 text-zinc-100 outline-none placeholder:text-zinc-500'
									placeholder={'\\int_0^1 x^2 \\, dx'}
								/>
							</div>
						</div>
					</div>
				) : null}
			</div>
		</NodeViewWrapper>
	);
};

const MathBlockNode = Node.create({
	name: 'mathBlock',
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,

	addAttributes() {
		return {
			formula: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-formula') ?? '',
				renderHTML: (attributes) => ({
					'data-formula': attributes.formula ?? '',
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'math-block' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['math-block', mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(MathBlockView);
	},

	markdownTokenName: 'mathBlock',

	markdownTokenizer: {
		name: 'mathBlock',
		level: 'block',
		start: findBlockMathStart,
		tokenize(src) {
			const parsed = extractBlockMath(src);
			if (!parsed) {
				return undefined;
			}

			return {
				type: 'mathBlock',
				raw: parsed.raw,
				text: parsed.formula,
				tokens: [],
			};
		},
	},

	parseMarkdown(token, helpers) {
		return helpers.createNode('mathBlock', {
			formula: (token as { text?: string }).text ?? '',
		});
	},

	renderMarkdown(node) {
		const formula =
			typeof node.attrs?.formula === 'string' ? node.attrs.formula : '';
		return `\\[\n${formula}\n\\]`;
	},
});

export default MathBlockNode;
