'use client';

import { Mermaid } from '@ant-design/x';
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown';
import React, { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
	oneDark,
	oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { normalizeMermaidDiagram } from '@/lib/mermaid';
import { cn } from '@/lib/utils';

import ImagePreview from './image-preview';
import { Separator } from './separator';

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

const extractText = (node: React.ReactNode): string => {
	if (node == null || typeof node === 'boolean') return '';
	if (typeof node === 'string' || typeof node === 'number') return String(node);
	if (Array.isArray(node)) return node.map(extractText).join('');
	if (React.isValidElement(node)) {
		return extractText((node.props as any)?.children);
	}
	return '';
};

const CodeBlock: React.FC<{ lang: string; code: string }> = ({
	lang,
	code,
}) => {
	const [copied, setCopied] = useState(false);
	const timerRef = useRef<number | null>(null);
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === 'dark';

	const handleCopy = async () => {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(code);
			} else {
				const ta = document.createElement('textarea');
				ta.value = code;
				ta.style.position = 'absolute';
				ta.style.left = '-9999px';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
			}
			setCopied(true);
			if (timerRef.current) window.clearTimeout(timerRef.current);
			timerRef.current = window.setTimeout(() => setCopied(false), 1500);
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<div className='group my-3 overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-900/60'>
			<div className='flex items-center justify-between px-3 py-1.5 text-[11px] text-muted-foreground'>
				<span className='font-mono lowercase tracking-wide'>
					{lang || 'text'}
				</span>
				<button
					type='button'
					onClick={handleCopy}
					className='inline-flex items-center gap-1 rounded px-1.5 py-0.5 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100'>
					{copied ? <Check className='size-3' /> : <Copy className='size-3' />}
					<span>{copied ? 'Copied' : 'Copy'}</span>
				</button>
			</div>
			<Separator className='opacity-50' />
			<SyntaxHighlighter
				language={lang || 'text'}
				style={isDark ? oneDark : oneLight}
				PreTag='pre'
				wrapLongLines={false}
				customStyle={{
					margin: 0,
					padding: '0.5rem 0.875rem 0.75rem',
					background: 'transparent',
					fontSize: '13px',
					lineHeight: '1.5rem',
					border: 'none',
				}}
				codeTagProps={{
					style: {
						background: 'transparent',
						padding: 0,
						border: 'none',
						fontFamily:
							'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
					},
				}}>
				{code}
			</SyntaxHighlighter>
		</div>
	);
};

const Code: React.FC<ComponentProps> = (props) => {
	const { className, children } = props;
	const lang = className?.match(/language-(\w+)/)?.[1] || '';

	if (lang === 'mermaid' && typeof children === 'string') {
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

	if (lang) {
		const code = extractText(children).replace(/\n$/, '');
		return <CodeBlock lang={lang} code={code} />;
	}

	return (
		<code className='rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground'>
			{children}
		</code>
	);
};

const Pre: React.FC<any> = ({ children }) => <>{children}</>;

const MarkdownImage = (props: any) => {
	const src = typeof props?.src === 'string' ? props.src : '';
	if (!src) return null;

	return (
		<ImagePreview
			src={src}
			alt={typeof props?.alt === 'string' ? props.alt : 'markdown image'}
			className='my-4'
			imageClassName={cn(
				'h-auto w-full max-w-full rounded-xl border border-border/60 object-cover shadow-sm',
				props?.className,
			)}
		/>
	);
};

const CustomMarkdown = ({ content }: { content: string }) => {
	return (
		<div className='max-w-none break-words text-[15px] leading-7 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_img]:my-4 [&_li]:my-1 [&_li]:break-words [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p]:leading-7 [&_strong]:text-foreground [&_table]:my-3 [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6'>
			<XMarkdown
				components={{ code: Code, pre: Pre, img: MarkdownImage }}
				paragraphTag='p'>
				{normalizeStandaloneDataImageLines(content)}
			</XMarkdown>
		</div>
	);
};

export default CustomMarkdown;
