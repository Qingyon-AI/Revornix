'use client';

import { Mermaid } from '@ant-design/x';
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown';
import React from 'react';
import { normalizeMermaidDiagram } from '@/lib/mermaid';

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

const CustomMarkdown = ({ content }: { content: string }) => {
	return (
		<XMarkdown components={{ code: Code }} paragraphTag='p'>
			{normalizeStandaloneDataImageLines(content)}
		</XMarkdown>
	);
};

export default CustomMarkdown;
