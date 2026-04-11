'use client';

import { Mermaid } from '@ant-design/x';
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown';
import React from 'react';
import { normalizeMermaidDiagram } from '@/lib/mermaid';
import { cn } from '@/lib/utils';

import ImagePreview from './image-preview';

const normalizeStandaloneDataImageLines = (content: string) => {
	return content
		.split('\n')
		.map((line) => {
			const trimmed = line.trim();
			if (
				trimmed.startsWith('data:image/') &&
				trimmed.includes(';base64,') &&
				!trimmed.startsWith('![')
			) {
				return `![image](${trimmed})`;
			}
			return line;
		})
		.join('\n');
};

const Code: React.FC<ComponentProps> = (props) => {
	const { className, children } = props;
	const lang = className?.match(/language-(\w+)/)?.[1] || '';

	if (typeof children !== 'string') return null;
	if (lang === 'mermaid') {
		const diagram = normalizeMermaidDiagram(children);
		return (
			<Mermaid
				styles={{
					header: {
						paddingTop: 0,
						paddingLeft: 0,
						paddingRight: 0,
					},
				}}>
				{diagram}
			</Mermaid>
		);
	}
	return <code>{children}</code>;
};

const MarkdownImage = (props: any) => {
	const src = typeof props?.src === 'string' ? props.src : '';
	if (!src) return null;

	return (
		<ImagePreview
			src={src}
			alt={typeof props?.alt === 'string' ? props.alt : 'markdown image'}
			className='my-4'
			imageClassName={cn(
				'max-w-full rounded-xl border border-border/60 shadow-sm',
				props?.className,
			)}
		/>
	);
};

const CustomMarkdown = ({ content }: { content: string }) => {
	return (
		<div className='max-w-none break-words text-[15px] leading-7 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:border [&_code]:border-zinc-200 [&_code]:bg-zinc-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-zinc-900 dark:[&_code]:border-zinc-700 dark:[&_code]:bg-zinc-800 dark:[&_code]:text-zinc-100 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_img]:my-4 [&_li]:my-1 [&_li]:break-words [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p]:leading-7 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-zinc-200 [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_pre]:text-zinc-900 dark:[&_pre]:border-zinc-700 dark:[&_pre]:bg-zinc-900 dark:[&_pre]:text-zinc-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_strong]:text-foreground [&_table]:my-3 [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6'>
			<XMarkdown components={{ code: Code, img: MarkdownImage }} paragraphTag='p'>
				{normalizeStandaloneDataImageLines(content)}
			</XMarkdown>
		</div>
	);
};

export default CustomMarkdown;
