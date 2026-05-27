'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import {
	Download,
	File as FileIcon,
	FileArchive,
	FileAudio,
	FileCode,
	FileImage,
	FileSpreadsheet,
	FileText,
	FileVideo,
	Loader2,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

import { cn, replacePath } from '@/lib/utils';
import { formatHumanFileSize } from '@/lib/upload';
import {
	extractCustomBlockTag,
	findCustomBlockTagStart,
} from '@/lib/markdown-custom-block';

type FileAttachmentOptions = {
	ownerId?: number;
};

const TAG_NAME = 'gh-file';

type FileKind = 'image' | 'audio' | 'video' | 'archive' | 'code' | 'sheet' | 'document' | 'generic';

type FileVisual = {
	kind: FileKind;
	icon: ComponentType<{ className?: string }>;
	iconClassName: string;
	containerClassName: string;
};

const FILE_KIND_VISUALS: Record<FileKind, FileVisual> = {
	image: {
		kind: 'image',
		icon: FileImage,
		iconClassName: 'text-rose-600 dark:text-rose-300',
		containerClassName: 'bg-rose-500/10 dark:bg-rose-400/15',
	},
	audio: {
		kind: 'audio',
		icon: FileAudio,
		iconClassName: 'text-amber-600 dark:text-amber-300',
		containerClassName: 'bg-amber-500/10 dark:bg-amber-400/15',
	},
	video: {
		kind: 'video',
		icon: FileVideo,
		iconClassName: 'text-violet-600 dark:text-violet-300',
		containerClassName: 'bg-violet-500/10 dark:bg-violet-400/15',
	},
	archive: {
		kind: 'archive',
		icon: FileArchive,
		iconClassName: 'text-orange-600 dark:text-orange-300',
		containerClassName: 'bg-orange-500/10 dark:bg-orange-400/15',
	},
	code: {
		kind: 'code',
		icon: FileCode,
		iconClassName: 'text-cyan-600 dark:text-cyan-300',
		containerClassName: 'bg-cyan-500/10 dark:bg-cyan-400/15',
	},
	sheet: {
		kind: 'sheet',
		icon: FileSpreadsheet,
		iconClassName: 'text-emerald-600 dark:text-emerald-300',
		containerClassName: 'bg-emerald-500/10 dark:bg-emerald-400/15',
	},
	document: {
		kind: 'document',
		icon: FileText,
		iconClassName: 'text-sky-600 dark:text-sky-300',
		containerClassName: 'bg-sky-500/10 dark:bg-sky-400/15',
	},
	generic: {
		kind: 'generic',
		icon: FileIcon,
		iconClassName: 'text-muted-foreground',
		containerClassName: 'bg-muted',
	},
};

const detectKind = (mime: string, name: string): FileKind => {
	const lowered = (mime || '').toLowerCase();
	if (lowered.startsWith('image/')) return 'image';
	if (lowered.startsWith('audio/')) return 'audio';
	if (lowered.startsWith('video/')) return 'video';
	if (lowered.includes('zip') || lowered.includes('compressed') || lowered.includes('tar') || lowered.includes('rar') || lowered.includes('7z')) {
		return 'archive';
	}
	if (lowered.includes('json') || lowered.includes('javascript') || lowered.includes('typescript') || lowered.includes('xml') || lowered.includes('html')) {
		return 'code';
	}
	if (lowered.includes('sheet') || lowered.includes('excel') || lowered.includes('csv')) {
		return 'sheet';
	}
	if (lowered.includes('text') || lowered.includes('pdf') || lowered.includes('word') || lowered.includes('document')) {
		return 'document';
	}
	const ext = (name.split('.').pop() ?? '').toLowerCase();
	if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
	if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'audio';
	if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext)) return 'video';
	if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return 'archive';
	if (['json', 'js', 'ts', 'tsx', 'jsx', 'py', 'go', 'java', 'rs', 'c', 'cpp', 'h', 'css', 'html', 'xml', 'yaml', 'yml', 'toml', 'sh'].includes(ext)) return 'code';
	if (['xlsx', 'xls', 'csv'].includes(ext)) return 'sheet';
	if (['md', 'txt', 'pdf', 'doc', 'docx', 'rtf'].includes(ext)) return 'document';
	return 'generic';
};

const FileAttachmentView = ({ node, editor, extension, selected }: NodeViewProps) => {
	const src = typeof node.attrs.src === 'string' ? node.attrs.src : '';
	const name =
		typeof node.attrs.name === 'string' && node.attrs.name.length
			? node.attrs.name
			: src.split('/').pop() || 'attachment';
	const mime = typeof node.attrs.mime === 'string' ? node.attrs.mime : '';
	const sizeAttr = node.attrs.size;
	const size = typeof sizeAttr === 'number' ? sizeAttr : Number(sizeAttr) || 0;

	const ownerId = extension.options.ownerId as number | undefined;
	const resolvedSrc = src && ownerId ? replacePath(src, ownerId) : src;
	const visual = FILE_KIND_VISUALS[detectKind(mime, name)];
	const Icon = visual.icon;
	const [isDownloading, setIsDownloading] = useState(false);

	const extension_label = (() => {
		const dot = name.lastIndexOf('.');
		if (dot <= 0 || dot >= name.length - 1) return '';
		return name.slice(dot + 1).toUpperCase().slice(0, 8);
	})();

	const subtitleParts = [
		extension_label || null,
		size > 0 ? formatHumanFileSize(size) : null,
	].filter((part): part is string => Boolean(part));

	const triggerDownload = () => {
		if (!resolvedSrc) return;
		setIsDownloading(true);
		try {
			const a = document.createElement('a');
			a.href = resolvedSrc;
			a.download = name;
			a.rel = 'noopener noreferrer';
			a.target = '_blank';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} finally {
			window.setTimeout(() => setIsDownloading(false), 400);
		}
	};

	const handleCardClick = (event: React.MouseEvent) => {
		event.stopPropagation();
		triggerDownload();
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		triggerDownload();
	};

	const disabled = !resolvedSrc || isDownloading;

	return (
		<NodeViewWrapper className='my-2.5'>
			<div
				role='button'
				tabIndex={disabled ? -1 : 0}
				aria-disabled={disabled || undefined}
				onClick={disabled ? undefined : handleCardClick}
				onKeyDown={disabled ? undefined : handleKeyDown}
				onMouseDown={(event) => event.preventDefault()}
				title={resolvedSrc ? `Download ${name}` : 'No source'}
				className={cn(
					'group relative flex items-center gap-3 rounded-[12px] border border-border/60 bg-card/80 px-3 py-2.5 text-left shadow-[0_2px_10px_-10px_rgba(15,23,42,0.18)] transition-[border-color,background-color,box-shadow]',
					!disabled && 'cursor-pointer hover:border-border hover:bg-card hover:shadow-[0_6px_18px_-14px_rgba(15,23,42,0.22)]',
					disabled && 'cursor-not-allowed opacity-60',
					selected && editor.isEditable
						? 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background'
						: '',
				)}
				contentEditable={false}>
				<div
					className={cn(
						'relative flex size-10 shrink-0 items-center justify-center rounded-[10px]',
						visual.containerClassName,
					)}>
					<Icon className={cn('size-[18px]', visual.iconClassName)} />
					{extension_label ? (
						<span
							className={cn(
								'absolute -bottom-1 -right-1 rounded-md border border-background bg-background px-1 text-[9px] font-semibold uppercase leading-[1.1] tracking-wide text-muted-foreground',
							)}>
							{extension_label}
						</span>
					) : null}
				</div>
				<div className='min-w-0 flex-1'>
					<div className='truncate text-sm font-medium text-foreground'>
						{name}
					</div>
					{subtitleParts.length > 0 ? (
						<div className='mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground'>
							{subtitleParts.map((part, index) => (
								<span key={part} className='inline-flex items-center gap-1.5'>
									{index > 0 ? <span aria-hidden>·</span> : null}
									<span>{part}</span>
								</span>
							))}
						</div>
					) : null}
				</div>
				<span
					className={cn(
						'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors',
						!disabled &&
							'group-hover:bg-accent group-hover:text-accent-foreground',
					)}
					aria-hidden>
					{isDownloading ? (
						<Loader2 className='size-4 animate-spin' />
					) : (
						<Download className='size-4' />
					)}
				</span>
			</div>
		</NodeViewWrapper>
	);
};

const sanitiseAttribute = (value: unknown) => {
	if (value == null) return '';
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
};

const FileAttachmentNode = Node.create<FileAttachmentOptions>({
	name: 'fileAttachment',
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,

	addOptions() {
		return {
			ownerId: undefined,
		};
	},

	addAttributes() {
		return {
			src: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-src') ?? '',
				renderHTML: (attributes) => ({
					'data-src':
						typeof attributes.src === 'string' ? attributes.src : '',
				}),
			},
			name: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-name') ?? '',
				renderHTML: (attributes) => ({
					'data-name':
						typeof attributes.name === 'string' ? attributes.name : '',
				}),
			},
			mime: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-mime') ?? '',
				renderHTML: (attributes) => ({
					'data-mime':
						typeof attributes.mime === 'string' ? attributes.mime : '',
				}),
			},
			size: {
				default: 0,
				parseHTML: (element) => {
					const raw = element.getAttribute('data-size');
					if (!raw) return 0;
					const parsed = Number(raw);
					return Number.isFinite(parsed) ? parsed : 0;
				},
				renderHTML: (attributes) => ({
					'data-size':
						typeof attributes.size === 'number' ? String(attributes.size) : '0',
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: TAG_NAME }];
	},

	renderHTML({ HTMLAttributes }) {
		return [TAG_NAME, mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(FileAttachmentView);
	},

	markdownTokenName: 'fileAttachment',

	markdownTokenizer: {
		name: 'fileAttachment',
		level: 'block',
		start: findCustomBlockTagStart(TAG_NAME),
		tokenize(src) {
			const parsed = extractCustomBlockTag(src, TAG_NAME);
			if (!parsed) return undefined;
			return {
				type: 'fileAttachment',
				raw: parsed.raw,
				attrs: parsed.attributes,
				tokens: [],
			};
		},
	},

	parseMarkdown(token, helpers) {
		const attrs = (token as { attrs?: Record<string, string> }).attrs ?? {};
		const parsedSize = Number(attrs['data-size']);
		return helpers.createNode('fileAttachment', {
			src: attrs['data-src'] ?? '',
			name: attrs['data-name'] ?? '',
			mime: attrs['data-mime'] ?? '',
			size: Number.isFinite(parsedSize) ? parsedSize : 0,
		});
	},

	renderMarkdown(node) {
		const src = sanitiseAttribute(node.attrs?.src);
		if (!src) return '';
		const name = sanitiseAttribute(node.attrs?.name);
		const mime = sanitiseAttribute(node.attrs?.mime);
		const sizeAttr = node.attrs?.size;
		const size =
			typeof sizeAttr === 'number'
				? String(sizeAttr)
				: typeof sizeAttr === 'string'
					? sizeAttr
					: '0';
		return `<${TAG_NAME} data-src="${src}" data-name="${name}" data-mime="${mime}" data-size="${size}"></${TAG_NAME}>`;
	},
});

export default FileAttachmentNode;
