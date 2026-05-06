'use client';

import { cn } from '@/lib/utils';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import MermaidCodeBlock from './extensions/mermaid-code-block';
import ImageNode from './extensions/image-node';
import DrawingNode from './extensions/drawing-node';
import TableNode from './extensions/table-node';
import VideoEmbedNode from './extensions/video-embed-node';
import MathBlockNode from './extensions/math-block-node';
import TextColorMark from './extensions/text-color-mark';
import TextHighlightMark from './extensions/text-highlight-mark';
import { ImagePreviewGroup } from '../ui/image-with-fallback';

const TipTapMarkdownViewer = ({
	content,
	className,
	ownerId,
}: {
	content: string;
	className?: string;
	ownerId?: number;
}) => {
	const editor = useEditor(
		{
			immediatelyRender: false,
			editable: false,
			extensions: [
				StarterKit.configure({ codeBlock: false }),
				ImageNode.configure({
					ownerId,
				}),
				DrawingNode,
				TableNode,
				VideoEmbedNode,
				MathBlockNode,
				TextColorMark,
				TextHighlightMark,
				MermaidCodeBlock,
				Markdown,
			],
			content,
			contentType: 'markdown',
		},
		[content, ownerId],
	);

	return (
		<div className={cn('w-full', className)}>
			<ImagePreviewGroup>
				<EditorContent
					editor={editor}
					className='[&_.ProseMirror]:mx-auto [&_.ProseMirror]:w-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-7 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:my-2 [&_.ProseMirror_p:has(>_.react-renderer)]:my-0 [&_.ProseMirror_p:has(>_.react-renderer)]:text-[0] [&_.ProseMirror_p:has(>_.react-renderer)]:leading-none [&_.ProseMirror_p>.ProseMirror-separator]:hidden [&_.ProseMirror_p>.ProseMirror-trailingBreak]:hidden [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:border [&_.ProseMirror_code]:border-zinc-200 [&_.ProseMirror_code]:bg-zinc-100 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-zinc-900 dark:[&_.ProseMirror_code]:border-zinc-700 dark:[&_.ProseMirror_code]:bg-zinc-800 dark:[&_.ProseMirror_code]:text-zinc-100 [&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:border [&_.ProseMirror_pre]:border-zinc-200 [&_.ProseMirror_pre]:bg-zinc-100 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-zinc-900 dark:[&_.ProseMirror_pre]:border-zinc-700 dark:[&_.ProseMirror_pre]:bg-zinc-900 dark:[&_.ProseMirror_pre]:text-zinc-100 [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:text-inherit [&_.ProseMirror_pre_code]:leading-5 [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-4 [&_.ProseMirror_u]:underline [&_.ProseMirror_mark]:rounded-[0.2rem] [&_.ProseMirror_mark]:px-0.5 [&_.ProseMirror_s]:text-muted-foreground [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:w-full [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-2xl [&_.ProseMirror_img]:object-cover'
				/>
			</ImagePreviewGroup>
		</div>
	);
};

export default TipTapMarkdownViewer;
