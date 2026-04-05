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
		<XMarkdown components={{ code: Code, img: MarkdownImage }} paragraphTag='p'>
			{normalizeStandaloneDataImageLines(content)}
		</XMarkdown>
	);
};

export default CustomMarkdown;
