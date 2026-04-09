'use client';

import { useEffect, useRef, useState } from 'react';
import { mergeAttributes, Node } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import katex from 'katex';
import { extractInlineMath } from '@/lib/math';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';

const MathInlineView = ({
	node,
	editor,
	updateAttributes,
	selected,
}: NodeViewProps) => {
	const formula = typeof node.attrs.formula === 'string' ? node.attrs.formula : '';
	const isEditable = editor.isEditable;
	const [isEditing, setIsEditing] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	let rendered = '';
	let renderError = '';

	try {
		rendered = katex.renderToString(formula || '\\placeholder{}', {
			throwOnError: true,
			displayMode: false,
		});
	} catch (error) {
		renderError = error instanceof Error ? error.message : 'Invalid formula';
	}

	useEffect(() => {
		if (selected && isEditable) {
			setIsEditing(true);
		}
	}, [isEditable, selected]);

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [isEditing]);

	return (
		<NodeViewWrapper as='span' className='mx-1 inline-block max-w-full align-middle'>
			<Popover open={isEditable ? isEditing : false} onOpenChange={setIsEditing}>
				<PopoverTrigger asChild>
					<button
						type='button'
						className={`inline-flex max-w-full items-center rounded-md border px-2 py-[0.12rem] align-baseline leading-none transition-all ${
							selected ? 'ring-2 ring-ring/30' : ''
						} ${
							renderError
								? 'border-rose-300 bg-rose-50/90 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-200'
								: 'border-sky-200/70 bg-sky-50/60 text-slate-900 dark:border-sky-500/30 dark:bg-sky-950/20 dark:text-slate-50'
						}`}
						onMouseDown={(event) => event.stopPropagation()}>
						<span
							className='max-w-[10rem] overflow-x-auto whitespace-nowrap text-[0.95em] leading-none'
							contentEditable={false}
							dangerouslySetInnerHTML={{
								__html:
									renderError || !rendered
										? `<span class="text-xs text-rose-600 dark:text-rose-300">${renderError || 'Formula'}</span>`
										: rendered,
							}}
						/>
					</button>
				</PopoverTrigger>
				{isEditable ? (
					<PopoverContent
						align='start'
						sideOffset={8}
						className='w-[22rem] rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur'
						onOpenAutoFocus={(event) => event.preventDefault()}>
						<div className='space-y-3' onMouseDown={(event) => event.stopPropagation()}>
							<div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
								Inline Equation
							</div>
							<div className='rounded-xl border border-sky-200/70 bg-sky-50/60 px-3 py-3 text-slate-900 dark:border-sky-500/20 dark:bg-sky-950/20 dark:text-slate-50'>
								<div
									className='overflow-x-auto text-[15px]'
									contentEditable={false}
									dangerouslySetInnerHTML={{
										__html:
											renderError || !rendered
												? `<span class="text-xs text-rose-600 dark:text-rose-300">${renderError || 'Formula'}</span>`
												: rendered,
									}}
								/>
							</div>
							<div className='space-y-1.5'>
								<div className='text-[11px] font-medium text-muted-foreground'>LaTeX</div>
								<input
									ref={inputRef}
									value={formula}
									onChange={(event) => updateAttributes({ formula: event.target.value })}
									onMouseDown={(event) => event.stopPropagation()}
									onClick={(event) => event.stopPropagation()}
									onKeyDown={(event) => {
										if (event.key === 'Enter' || event.key === 'Escape') {
											event.preventDefault();
											setIsEditing(false);
										}
									}}
									className='h-10 w-full rounded-xl border border-border/60 bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground'
									placeholder='a^2+b^2=c^2'
								/>
							</div>
						</div>
					</PopoverContent>
				) : null}
			</Popover>
		</NodeViewWrapper>
	);
};

const MathInlineNode = Node.create({
	name: 'mathInline',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

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
		return [{ tag: 'math-inline' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['math-inline', mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(MathInlineView);
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					handlePaste: (view, event) => {
						const text = event.clipboardData?.getData('text/plain')?.trim();
						if (!text) {
							return false;
						}

						const parsed = extractInlineMath(text);
						if (!parsed || parsed.raw !== text) {
							return false;
						}

						const { state, dispatch } = view;
						const node = this.type.create({ formula: parsed.formula });
						dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
						return true;
					},
				},
			}),
		];
	},

	markdownTokenName: 'mathInline',

	markdownTokenizer: {
		name: 'mathInline',
		level: 'inline',
		start: '$',
		tokenize(src) {
			const parsed = extractInlineMath(src);
			if (!parsed) {
				return undefined;
			}

			return {
				type: 'mathInline',
				raw: parsed.raw,
				text: parsed.formula,
			};
		},
	},

	parseMarkdown(token, helpers) {
		return helpers.createNode('mathInline', {
			formula: (token as { text?: string }).text ?? '',
		});
	},

	renderMarkdown(node) {
		const formula =
			typeof node.attrs?.formula === 'string' ? node.attrs.formula : '';
		return `$${formula}$`;
	},
});

export default MathInlineNode;
