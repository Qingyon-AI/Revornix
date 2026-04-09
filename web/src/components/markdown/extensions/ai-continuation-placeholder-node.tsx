'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { Sparkles } from 'lucide-react';

const AiContinuationPlaceholderView = ({ node }: NodeViewProps) => {
	const message =
		typeof node.attrs.message === 'string' && node.attrs.message.trim()
			? node.attrs.message
			: 'AI 正在续写这一段，内容返回后会自动补到这里……';

	return (
		<NodeViewWrapper
			className='my-2'
			contentEditable={false}
			data-ai-continuation-placeholder='true'>
			<div className='flex items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground'>
				<div className='flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
					<Sparkles className='size-3.5' />
				</div>
				<span>{message}</span>
			</div>
		</NodeViewWrapper>
	);
};

const AiContinuationPlaceholderNode = Node.create({
	name: 'aiContinuationPlaceholder',
	group: 'block',
	atom: true,
	selectable: false,
	draggable: false,

	addAttributes() {
		return {
			message: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-message') ?? '',
				renderHTML: (attributes) => ({
					'data-message': attributes.message ?? '',
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
