'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { AudioLines, Loader2, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn, replacePath } from '@/lib/utils';
import { formatHumanFileSize } from '@/lib/upload';
import {
	formatAudioTime,
	getAudioTrackKey,
	resolveAudioDuration,
} from '@/lib/audio';
import { useAudioPlayer } from '@/provider/audio-player-provider';
import {
	extractCustomBlockTag,
	findCustomBlockTagStart,
} from '@/lib/markdown-custom-block';

type AudioNodeOptions = {
	ownerId?: number;
};

const TAG_NAME = 'gh-audio';

const stripExtension = (name: string) => {
	const dot = name.lastIndexOf('.');
	if (dot <= 0) return name;
	return name.slice(0, dot);
};

const AudioAttachmentView = ({
	node,
	editor,
	extension,
	selected,
}: NodeViewProps) => {
	const src = typeof node.attrs.src === 'string' ? node.attrs.src : '';
	const name =
		typeof node.attrs.name === 'string' && node.attrs.name.length
			? node.attrs.name
			: src.split('/').pop() || 'audio';
	const sizeAttr = node.attrs.size;
	const size = typeof sizeAttr === 'number' ? sizeAttr : Number(sizeAttr) || 0;

	const ownerId = extension.options.ownerId as number | undefined;
	const resolvedSrc = src && ownerId ? replacePath(src, ownerId) : src;
	const trackKey = getAudioTrackKey(resolvedSrc);

	const { track, isPlaying, currentTime, duration, toggleTrack } =
		useAudioPlayer();
	const isCurrentTrack = Boolean(trackKey) && track?.key === trackKey;
	const isCurrentPlaying = isCurrentTrack && isPlaying;

	const [metadataDuration, setMetadataDuration] = useState(0);

	useEffect(() => {
		if (!resolvedSrc || !trackKey) {
			return;
		}
		let cancelled = false;
		resolveAudioDuration({ key: trackKey, src: resolvedSrc }).then(
			(resolvedDuration) => {
				if (!cancelled) {
					setMetadataDuration(resolvedDuration);
				}
			},
		);
		return () => {
			cancelled = true;
		};
	}, [resolvedSrc, trackKey]);

	const totalDuration = isCurrentTrack && duration > 0 ? duration : metadataDuration;
	const progressRatio =
		isCurrentTrack && totalDuration > 0
			? Math.min(1, Math.max(0, currentTime / totalDuration))
			: 0;

	const subtitleParts = [
		totalDuration > 0
			? isCurrentTrack
				? `${formatAudioTime(currentTime)} / ${formatAudioTime(totalDuration)}`
				: formatAudioTime(totalDuration)
			: null,
		size > 0 ? formatHumanFileSize(size) : null,
	].filter((part): part is string => Boolean(part));

	const disabled = !resolvedSrc;

	const handleToggle = (event: React.MouseEvent) => {
		event.stopPropagation();
		if (disabled) {
			return;
		}
		void toggleTrack({
			src: resolvedSrc,
			title: stripExtension(name),
		});
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		if (disabled) {
			return;
		}
		void toggleTrack({
			src: resolvedSrc,
			title: stripExtension(name),
		});
	};

	return (
		<NodeViewWrapper className='my-2.5'>
			<div
				role='button'
				tabIndex={disabled ? -1 : 0}
				aria-disabled={disabled || undefined}
				onClick={disabled ? undefined : handleToggle}
				onKeyDown={disabled ? undefined : handleKeyDown}
				onMouseDown={(event) => event.preventDefault()}
				title={name}
				className={cn(
					'group relative flex items-center gap-3 overflow-hidden rounded-[12px] border border-border/60 bg-card/80 px-3 py-2.5 text-left shadow-[0_2px_10px_-10px_rgba(15,23,42,0.18)] transition-[border-color,background-color,box-shadow]',
					!disabled &&
						'cursor-pointer hover:border-border hover:bg-card hover:shadow-[0_6px_18px_-14px_rgba(15,23,42,0.22)]',
					disabled && 'cursor-not-allowed opacity-60',
					selected && editor.isEditable
						? 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background'
						: '',
				)}
				contentEditable={false}>
				<div
					className={cn(
						'relative flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-amber-500/10 dark:bg-amber-400/15',
					)}>
					<AudioLines
						className={cn(
							'size-[18px] text-amber-600 dark:text-amber-300',
							isCurrentPlaying && 'animate-pulse',
						)}
					/>
				</div>
				<div className='min-w-0 flex-1'>
					<div className='truncate text-sm font-medium text-foreground'>
						{stripExtension(name)}
					</div>
					{subtitleParts.length > 0 ? (
						<div className='mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground'>
							{subtitleParts.map((part, index) => (
								<span key={part} className='inline-flex items-center gap-1.5'>
									{index > 0 ? <span aria-hidden>·</span> : null}
									<span className='tabular-nums'>{part}</span>
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
						isCurrentPlaying && 'bg-accent text-accent-foreground',
					)}
					aria-hidden>
					{disabled ? (
						<Loader2 className='size-4 animate-spin' />
					) : isCurrentPlaying ? (
						<Pause className='size-4 fill-current' />
					) : (
						<Play className='size-4 fill-current' />
					)}
				</span>
				{isCurrentTrack && totalDuration > 0 ? (
					<span
						aria-hidden
						className='absolute inset-x-0 bottom-0 h-0.5 bg-border/60'>
						<span
							className='block h-full bg-primary transition-[width] duration-300 ease-linear'
							style={{ width: `${progressRatio * 100}%` }}
						/>
					</span>
				) : null}
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

const AudioNode = Node.create<AudioNodeOptions>({
	name: 'audioAttachment',
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
		return ReactNodeViewRenderer(AudioAttachmentView);
	},

	markdownTokenName: 'audioAttachment',

	markdownTokenizer: {
		name: 'audioAttachment',
		level: 'block',
		start: findCustomBlockTagStart(TAG_NAME),
		tokenize(src) {
			const parsed = extractCustomBlockTag(src, TAG_NAME);
			if (!parsed) return undefined;
			return {
				type: 'audioAttachment',
				raw: parsed.raw,
				attrs: parsed.attributes,
				tokens: [],
			};
		},
	},

	parseMarkdown(token, helpers) {
		const attrs = (token as { attrs?: Record<string, string> }).attrs ?? {};
		const parsedSize = Number(attrs['data-size']);
		return helpers.createNode('audioAttachment', {
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

export default AudioNode;
