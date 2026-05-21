'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const AiContinuationPlaceholderView = ({ node }: NodeViewProps) => {
	const message =
		typeof node.attrs.message === 'string' && node.attrs.message.trim()
			? node.attrs.message
			: 'AI is writting...';
	const preview =
		typeof node.attrs.preview === 'string' ? node.attrs.preview.trim() : '';
	const status = node.attrs.status === 'error' ? 'error' : 'loading';
	const isError = status === 'error';

	return (
		<NodeViewWrapper
			className='my-2'
			contentEditable={false}
			data-ai-continuation-placeholder='true'>
			<div
				className={cn(
					'flex items-start gap-3 rounded-xl border border-dashed px-3 py-2 text-sm',
					isError
						? 'border-destructive/40 bg-destructive/5 text-destructive'
						: 'border-primary/30 bg-primary/5 text-muted-foreground',
				)}>
				<div
					className={cn(
						'relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
						isError
							? 'bg-destructive/10 text-destructive'
							: 'bg-primary/10 text-primary',
					)}>
					{isError ? (
						<AlertTriangle className='size-3.5' />
					) : (
						<Sparkles className='size-3.5' />
					)}
					{!isError && !preview ? (
						<Loader2 className='absolute -right-1 -top-1 size-3 animate-spin text-primary/70' />
					) : null}
				</div>
				<div className='min-w-0 flex-1'>
					<div>{message}</div>
					{preview ? (
						<div
							className={cn(
								'mt-2 whitespace-pre-wrap border-l-2 pl-3',
								isError
									? 'border-destructive/20 text-foreground'
									: 'border-primary/20 text-foreground',
							)}>
							{preview}
						</div>
					) : null}
				</div>
			</div>
		</NodeViewWrapper>
	);
};

const AiContinuationPlaceholderNode = Node.create({
	name: 'aiContinuationPlaceholder',
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
			preview: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-preview') ?? '',
				renderHTML: (attributes) => ({
					'data-preview': attributes.preview ?? '',
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
		return [{ tag: 'ai-continuation-placeholder' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['ai-continuation-placeholder', mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(AiContinuationPlaceholderView);
	},

	renderMarkdown() {
		return '';
	},
});

export default AiContinuationPlaceholderNode;
