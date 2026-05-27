'use client';

import { mergeAttributes, Node, type MarkdownToken } from '@tiptap/core';
import {
	NodeViewContent,
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import {
	AlertTriangle,
	Info,
	Lightbulb,
	OctagonAlert,
	Siren,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

import { cn } from '@/lib/utils';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';

const CALLOUT_TYPES = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const;
type CalloutType = (typeof CALLOUT_TYPES)[number];

const CALLOUT_TYPE_SET = new Set<string>(CALLOUT_TYPES);

const normalizeType = (raw: string | null | undefined): CalloutType => {
	if (!raw) return 'NOTE';
	const upper = raw.trim().toUpperCase();
	return CALLOUT_TYPE_SET.has(upper) ? (upper as CalloutType) : 'NOTE';
};

type CalloutVisual = {
	icon: ComponentType<{ className?: string }>;
	label: string;
	containerClassName: string;
	accentClassName: string;
};

const CALLOUT_VISUALS: Record<CalloutType, CalloutVisual> = {
	NOTE: {
		icon: Info,
		label: 'Note',
		containerClassName:
			'border-sky-500/30 bg-sky-500/[0.06] dark:bg-sky-400/10',
		accentClassName: 'text-sky-600 dark:text-sky-300',
	},
	TIP: {
		icon: Lightbulb,
		label: 'Tip',
		containerClassName:
			'border-emerald-500/30 bg-emerald-500/[0.06] dark:bg-emerald-400/10',
		accentClassName: 'text-emerald-600 dark:text-emerald-300',
	},
	IMPORTANT: {
		icon: Siren,
		label: 'Important',
		containerClassName:
			'border-violet-500/30 bg-violet-500/[0.06] dark:bg-violet-400/10',
		accentClassName: 'text-violet-600 dark:text-violet-300',
	},
	WARNING: {
		icon: AlertTriangle,
		label: 'Warning',
		containerClassName:
			'border-amber-500/30 bg-amber-500/[0.06] dark:bg-amber-400/10',
		accentClassName: 'text-amber-600 dark:text-amber-300',
	},
	CAUTION: {
		icon: OctagonAlert,
		label: 'Caution',
		containerClassName:
			'border-rose-500/30 bg-rose-500/[0.06] dark:bg-rose-400/10',
		accentClassName: 'text-rose-600 dark:text-rose-300',
	},
};

const TYPE_PATTERN = new RegExp(
	`^>\\s*\\[!(${CALLOUT_TYPES.join('|')})\\]\\s*$`,
	'i',
);
const BLOCKQUOTE_LINE_PATTERN = /^>\s?(.*)$/;

type ParsedCallout = {
	raw: string;
	type: CalloutType;
	body: string;
};

const parseCalloutFromSource = (src: string): ParsedCallout | null => {
	if (src.charCodeAt(0) !== 0x3e /* '>' */) {
		return null;
	}
	const blankMatch = src.search(/\r?\n\r?\n/);
	const chunk = blankMatch === -1 ? src : src.slice(0, blankMatch);
	const lines = chunk.split(/\r?\n/);
	const headerMatch = lines[0].match(TYPE_PATTERN);
	if (!headerMatch) {
		return null;
	}
	const type = normalizeType(headerMatch[1]);

	const bodyLines: string[] = [];
	let consumed = 1;
	for (let i = 1; i < lines.length; i += 1) {
		const line = lines[i];
		const bodyMatch = line.match(BLOCKQUOTE_LINE_PATTERN);
		if (bodyMatch === null) {
			break;
		}
		bodyLines.push(bodyMatch[1]);
		consumed = i + 1;
	}

	const consumedText = lines.slice(0, consumed).join('\n');
	const trailingNewline =
		blankMatch === -1
			? ''
			: src.slice(consumedText.length).match(/^\r?\n?/)?.[0] ?? '';

	return {
		raw: consumedText + trailingNewline,
		type,
		body: bodyLines.join('\n').trim(),
	};
};

const CalloutView = ({ node, editor, updateAttributes }: NodeViewProps) => {
	const type = normalizeType(node.attrs.type as string | null | undefined);
	const visual = CALLOUT_VISUALS[type];
	const Icon = visual.icon;
	const isEditable = editor.isEditable;
	const [typePickerOpen, setTypePickerOpen] = useState(false);

	const handleSelectType = (next: CalloutType) => {
		updateAttributes({ type: next });
		setTypePickerOpen(false);
	};

	return (
		<NodeViewWrapper>
			<div
				className={cn(
					'callout-shell my-3 flex items-start gap-2.5 rounded-[12px] border px-3 py-2.5 transition-colors',
					visual.containerClassName,
				)}>
				{isEditable ? (
					<Popover open={typePickerOpen} onOpenChange={setTypePickerOpen}>
						<PopoverTrigger asChild>
							<button
								type='button'
								contentEditable={false}
								onMouseDown={(event) => event.preventDefault()}
								className={cn(
									'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-foreground/5',
									visual.accentClassName,
								)}
								title='Change callout type'>
								<Icon className='size-[18px]' aria-hidden />
							</button>
						</PopoverTrigger>
						<PopoverContent
							align='start'
							className='w-[180px] p-1'
							onMouseDown={(event) => event.stopPropagation()}>
							<div className='flex flex-col'>
								{CALLOUT_TYPES.map((option) => {
									const optionVisual = CALLOUT_VISUALS[option];
									const OptionIcon = optionVisual.icon;
									const active = option === type;
									return (
										<button
											key={option}
											type='button'
											onClick={() => handleSelectType(option)}
											className={cn(
												'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
												active && 'bg-accent/60',
											)}>
											<OptionIcon
												className={cn('size-4', optionVisual.accentClassName)}
												aria-hidden
											/>
											<span className='flex-1 font-medium'>
												{optionVisual.label}
											</span>
										</button>
									);
								})}
							</div>
						</PopoverContent>
					</Popover>
				) : (
					<span
						className={cn(
							'inline-flex h-7 w-7 shrink-0 items-center justify-center',
							visual.accentClassName,
						)}>
						<Icon className='size-[18px]' aria-hidden />
					</span>
				)}

				<NodeViewContent
					className='callout-body min-w-0 flex-1 text-[0.95rem] leading-7 [&_p]:!my-0 [&_p+p]:!mt-2'
				/>
			</div>
		</NodeViewWrapper>
	);
};

const CalloutNode = Node.create({
	name: 'callout',
	group: 'block',
	content: 'block+',
	defining: true,
	selectable: true,

	addAttributes() {
		return {
			type: {
				default: 'NOTE',
				parseHTML: (element) =>
					normalizeType(element.getAttribute('data-type')),
				renderHTML: (attributes) => ({
					'data-type': normalizeType(attributes.type as string),
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'gh-callout' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['gh-callout', mergeAttributes(HTMLAttributes), 0];
	},

	addNodeView() {
		return ReactNodeViewRenderer(CalloutView);
	},

	markdownTokenName: 'callout',

	markdownTokenizer: {
		name: 'callout',
		level: 'block',
		start(src: string) {
			return src.search(/>\s*\[!/i);
		},
		tokenize(src, _tokens, lexer) {
			const parsed = parseCalloutFromSource(src);
			if (!parsed) {
				return undefined;
			}
			const innerSource = parsed.body.length > 0 ? `${parsed.body}\n` : '';
			const innerTokens: MarkdownToken[] = innerSource
				? lexer?.blockTokens?.(innerSource) ?? []
				: [];
			return {
				type: 'callout',
				raw: parsed.raw,
				attrs: { type: parsed.type },
				tokens: innerTokens,
			};
		},
	},

	parseMarkdown(token, helpers) {
		const attrs =
			(token as { attrs?: { type?: string } }).attrs ?? {};
		const innerTokens = (token.tokens ?? []) as MarkdownToken[];
		// Strip trailing whitespace-only "space" tokens that marked emits for the
		// blank line between the callout and what follows — otherwise
		// parseChildren happily turns them into an empty trailing paragraph and
		// the callout grows by an extra line.
		while (
			innerTokens.length > 0 &&
			innerTokens[innerTokens.length - 1]?.type === 'space'
		) {
			innerTokens.pop();
		}
		const parsedChildren =
			innerTokens.length > 0 ? helpers.parseChildren(innerTokens) : [];
		const finalContent =
			parsedChildren.length > 0 ? parsedChildren : [{ type: 'paragraph' }];
		return helpers.createNode(
			'callout',
			{ type: normalizeType(attrs.type) },
			finalContent,
		);
	},

	renderMarkdown(node, helpers) {
		const type = normalizeType(node.attrs?.type as string | undefined);
		const inner = helpers.renderChildren(node, '\n\n') ?? '';
		const normalizedInner = inner.replace(/\s+$/u, '');
		const bodyLines =
			normalizedInner.length === 0 ? [''] : normalizedInner.split('\n');
		const rendered = bodyLines
			.map((line) => (line.length ? `> ${line}` : '>'))
			.join('\n');
		return `> [!${type}]\n${rendered}`;
	},
});

export default CalloutNode;
