'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';

import { replacePath } from '@/lib/utils';
import BlockNodeShell from './block-node-shell';
import ImageWithFallback from '@/components/ui/image-with-fallback';

const ImageNodeView = ({
	node,
	extension,
	editor,
	selected,
}: NodeViewProps) => {
	const src = typeof node.attrs.src === 'string' ? node.attrs.src : '';
	const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : '';
	const ownerId = extension.options.ownerId as number | undefined;
	const resolvedSrc = src && ownerId ? replacePath(src, ownerId) : src;

	return (
		<NodeViewWrapper>
			<BlockNodeShell
				selected={selected && editor.isEditable}
				className='w-full max-w-full'
				contentClassName='max-w-full overflow-hidden bg-background'>
				{resolvedSrc ? (
					<ImageWithFallback
						src={resolvedSrc}
						alt={alt}
						preview
						className='!my-0 block h-auto max-h-[32rem] w-full max-w-full rounded-2xl object-contain shadow-sm'
						fallbackClassName='min-h-40 rounded-2xl border border-dashed border-border/70'
						fallbackSvgClassName='max-w-[240px] p-5'
					/>
				) : (
					<div className='flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 text-sm text-muted-foreground'>
						Image unavailable
					</div>
				)}
			</BlockNodeShell>
		</NodeViewWrapper>
	);
};

const ImageNode = Node.create<{
	ownerId?: number;
}>({
	name: 'image',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addOptions() {
		return {
			ownerId: undefined,
		};
	},

	addAttributes() {
		return {
			src: {
				default: '',
			},
			alt: {
				default: '',
			},
			title: {
				default: null,
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'img[src]',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		const src = typeof HTMLAttributes.src === 'string' ? HTMLAttributes.src : '';
		const resolvedSrc =
			src && this.options.ownerId ? replacePath(src, this.options.ownerId) : src;

		return [
			'img',
			mergeAttributes(HTMLAttributes, {
				src: resolvedSrc,
				class:
					'max-h-[32rem] w-auto max-w-full rounded-xl border border-border/60 object-contain shadow-sm',
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(ImageNodeView);
	},

	markdownTokenName: 'image',

	parseMarkdown(token, helpers) {
		const imageToken = token as {
			href?: string;
			text?: string;
			title?: string | null;
		};

		return helpers.createNode('image', {
			src: imageToken.href ?? '',
			alt: imageToken.text ?? '',
			title: imageToken.title ?? null,
		});
	},

	renderMarkdown(node) {
		const src =
			typeof node.attrs?.src === 'string' ? node.attrs.src.trim() : '';
		if (!src) {
			return '';
		}

		const alt =
			typeof node.attrs?.alt === 'string'
				? node.attrs.alt.replace(/\]/g, '\\]')
				: '';
		const title =
			typeof node.attrs?.title === 'string' && node.attrs.title.trim().length > 0
				? ` "${String(node.attrs.title).replace(/"/g, '\\"')}"`
				: '';

		return `![${alt}](${src}${title})`;
	},
});

export default ImageNode;
