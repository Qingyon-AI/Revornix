'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { AlertTriangle, ImagePlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const AiIllustrationPlaceholderView = ({ node }: NodeViewProps) => {
	const message =
		typeof node.attrs.message === 'string' && node.attrs.message.trim()
			? node.attrs.message
			: 'Generating illustration...';
	const status = node.attrs.status === 'error' ? 'error' : 'loading';
	const isError = status === 'error';

	return (
		<NodeViewWrapper
			className='my-3'
			contentEditable={false}
			data-ai-illustration-placeholder='true'>
			<div
				className={cn(
					'flex items-center gap-3 rounded-xl border border-dashed px-3 py-3 text-sm',
					isError
						? 'border-destructive/40 bg-destructive/5 text-destructive'
						: 'border-sky-300/60 bg-sky-50/70 text-sky-800 dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-200',
				)}>
				<div
					className={cn(
						'flex size-8 shrink-0 items-center justify-center rounded-full',
						isError
							? 'bg-destructive/10 text-destructive'
							: 'bg-sky-100 text-sky-700 dark:bg-sky-900/70 dark:text-sky-200',
					)}>
					{isError ? (
						<AlertTriangle className='size-4' />
					) : (
						<ImagePlus className='size-4' />
					)}
				</div>
				<span className='min-w-0 flex-1'>{message}</span>
				{isError ? null : (
					<Loader2 className='size-4 shrink-0 animate-spin text-sky-500' />
				)}
			</div>
		</NodeViewWrapper>
	);
};

const AiIllustrationPlaceholderNode = Node.create({
	name: 'aiIllustrationPlaceholder',
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,

	addAttributes() {
		return {
			id: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-id') ?? '',
				renderHTML: (attributes) => ({
					'data-id': attributes.id ?? '',
				}),
			},
			message: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-message') ?? '',
				renderHTML: (attributes) => ({
					'data-message': attributes.message ?? '',
				}),
			},
			status: {
				default: 'loading',
				parseHTML: (element) => element.getAttribute('data-status') ?? 'loading',
				renderHTML: (attributes) => ({
					'data-status': attributes.status ?? 'loading',
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'ai-illustration-placeholder' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['ai-illustration-placeholder', mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(AiIllustrationPlaceholderView);
	},

	renderMarkdown() {
		return '';
	},
});

export default AiIllustrationPlaceholderNode;
