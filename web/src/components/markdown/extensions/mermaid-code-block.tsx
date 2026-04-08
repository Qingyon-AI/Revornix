'use client';

import { Mermaid } from '@ant-design/x';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import {
	NodeViewContent,
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { normalizeMermaidDiagram } from '@/lib/mermaid';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

const MermaidCodeBlockView = ({ node, editor }: NodeViewProps) => {
	const language = String(node.attrs.language ?? '').toLowerCase();
	const isMermaid = language === 'mermaid';

	if (!isMermaid) {
		return (
			<NodeViewWrapper className='my-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'>
				<NodeViewContent className='whitespace-pre p-3 font-mono text-[0.95em] leading-7' />
			</NodeViewWrapper>
		);
	}

	const diagram = normalizeMermaidDiagram(node.textContent ?? '');

	return (
		<NodeViewWrapper className='my-3 overflow-hidden rounded-xl border border-border/60 bg-card'>
			<div className='overflow-auto p-4' contentEditable={false}>
				<Mermaid
					className='rev-mermaid'
					styles={{
						header: {
							paddingTop: 0,
							paddingLeft: 0,
							paddingRight: 0,
						},
					}}>
					{diagram}
				</Mermaid>
			</div>
			{editor.isEditable ? (
				<div className='border-t border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'>
					<NodeViewContent className='whitespace-pre p-3 font-mono text-[0.95em] leading-7' />
				</div>
			) : null}
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
