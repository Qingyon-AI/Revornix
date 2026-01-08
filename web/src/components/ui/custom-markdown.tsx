'use client';

import { Mermaid } from '@ant-design/x';
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown';
import React from 'react';

const Code: React.FC<ComponentProps> = (props) => {
	const { className, children } = props;
	const lang = className?.match(/language-(\w+)/)?.[1] || '';

	if (typeof children !== 'string') return null;
	if (lang === 'mermaid') {
		return (
			<Mermaid
				styles={{
					header: {
						paddingTop: 0,
						paddingLeft: 0,
						paddingRight: 0,
					},
				}}>
				{children}
			</Mermaid>
		);
	}
	return <code>{children}</code>;
};

const CustomMarkdown = ({ content }: { content: string }) => {
	return (
		<XMarkdown components={{ code: Code }} paragraphTag='p'>
			{content}
		</XMarkdown>
	);
};

export default CustomMarkdown;
