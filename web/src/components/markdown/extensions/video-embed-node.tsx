'use client';

import { useEffect, useState } from 'react';
import { mergeAttributes, Node } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { Check, PlayCircle } from 'lucide-react';

import BlockNodeShell from './block-node-shell';
import {
	extractCustomBlockTag,
	findCustomBlockTagStart,
} from '@/lib/markdown-custom-block';
import {
	ensureVideoEmbedDefaults,
	parseVideoEmbedUrl,
	type VideoEmbedProvider,
} from '@/lib/video-embed';

const VideoEmbedNodeView = ({
	node,
	selected,
	editor,
	updateAttributes,
}: NodeViewProps) => {
	const provider =
		typeof node.attrs.provider === 'string' ? node.attrs.provider : 'youtube';
	const embedUrl = ensureVideoEmbedDefaults(
		typeof node.attrs.embedUrl === 'string' ? node.attrs.embedUrl : '',
		provider as VideoEmbedProvider,
	);
	const url = typeof node.attrs.url === 'string' ? node.attrs.url : '';
	const videoId = typeof node.attrs.videoId === 'string' ? node.attrs.videoId : '';
	const isEditable = editor.isEditable;
	const providerLabel = provider === 'bilibili' ? 'Bilibili' : 'YouTube';
	const [draftUrl, setDraftUrl] = useState(url);
	const [inputError, setInputError] = useState('');

	useEffect(() => {
		setDraftUrl(url);
		setInputError('');
	}, [url]);

	const applyUrl = () => {
		const parsed = parseVideoEmbedUrl(draftUrl);
		if (!parsed) {
			setInputError('请输入有效的 YouTube 或 Bilibili 视频地址');
			return;
		}

		setInputError('');
		updateAttributes({
			provider: parsed.provider,
			videoId: parsed.videoId,
			url: parsed.url,
			embedUrl: parsed.embedUrl,
		});
	};

	return (
		<NodeViewWrapper>
			<BlockNodeShell
				selected={selected && isEditable}
				className='max-w-full'
				contentClassName='overflow-hidden bg-background p-3'>
				<div className='mb-3 flex items-center gap-2 text-sm font-medium text-foreground'>
					<PlayCircle className='size-4 text-primary' />
					<span>{providerLabel} Video</span>
					<span className='text-xs font-normal text-muted-foreground'>{videoId}</span>
				</div>
				<div className='overflow-hidden rounded-xl border border-border/60 bg-black/95 shadow-sm'>
					<div className='aspect-video w-full'>
						{embedUrl ? (
							<iframe
								src={embedUrl}
								title={`${providerLabel} video`}
								className='h-full w-full border-0'
								allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
								allowFullScreen
								referrerPolicy='strict-origin-when-cross-origin'
							/>
						) : (
							<div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
								Video unavailable
							</div>
						)}
					</div>
				</div>
				{isEditable ? (
					<div className='mt-3 space-y-2'>
						<div className='flex items-center gap-2'>
							<input
								value={draftUrl}
								onChange={(event) => {
									setDraftUrl(event.target.value);
									if (inputError) {
										setInputError('');
									}
								}}
								onMouseDown={(event) => event.stopPropagation()}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										applyUrl();
									}
								}}
								className='h-9 flex-1 rounded-lg border border-border/60 bg-background px-3 text-sm outline-none'
								placeholder='粘贴 YouTube 或 Bilibili 视频地址'
							/>
							<button
								type='button'
								onMouseDown={(event) => event.stopPropagation()}
								onClick={applyUrl}
								className='inline-flex h-9 items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-3 text-sm text-foreground transition-colors hover:bg-muted'>
								<Check className='size-4' />
								<span>应用</span>
							</button>
						</div>
						{inputError ? (
							<div className='text-xs text-rose-500'>{inputError}</div>
						) : url ? (
							<div className='truncate text-xs text-muted-foreground'>{url}</div>
						) : null}
					</div>
				) : url ? (
					<div className='mt-2 truncate text-xs text-muted-foreground'>{url}</div>
				) : null}
			</BlockNodeShell>
		</NodeViewWrapper>
	);
};

const VideoEmbedNode = Node.create({
	name: 'videoEmbed',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			provider: {
				default: 'youtube' as VideoEmbedProvider,
				parseHTML: (element) => element.getAttribute('data-provider') ?? 'youtube',
				renderHTML: (attributes) => ({
					'data-provider': attributes.provider ?? 'youtube',
				}),
			},
			videoId: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-video-id') ?? '',
				renderHTML: (attributes) => ({
					'data-video-id': attributes.videoId ?? '',
				}),
			},
			url: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-url') ?? '',
				renderHTML: (attributes) => ({
					'data-url': attributes.url ?? '',
				}),
			},
			embedUrl: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-embed-url') ?? '',
				renderHTML: (attributes) => ({
					'data-embed-url': attributes.embedUrl ?? '',
				}),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'video-embed',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'video-embed',
			mergeAttributes(HTMLAttributes, {
				class: 'video-embed',
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(VideoEmbedNodeView);
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					handlePaste: (view, event) => {
						const text = event.clipboardData?.getData('text/plain')?.trim();
						if (!text) {
							return false;
						}

						const parsed = parseVideoEmbedUrl(text);
						if (!parsed) {
							return false;
						}

						const { state, dispatch } = view;
						const node = this.type.create({
							provider: parsed.provider,
							videoId: parsed.videoId,
							url: parsed.url,
							embedUrl: parsed.embedUrl,
						});
						dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
						return true;
					},
				},
			}),
		];
	},

	markdownTokenName: 'videoEmbed',

	markdownTokenizer: {
		name: 'videoEmbed',
		level: 'block',
		start: findCustomBlockTagStart('video-embed'),
		tokenize(src) {
			const parsed = extractCustomBlockTag(src, 'video-embed');
			if (!parsed) {
				return undefined;
			}

			return {
				type: 'videoEmbed',
				raw: parsed.raw,
				attrs: parsed.attributes,
				tokens: [],
			};
		},
	},

	parseMarkdown(token, helpers) {
		const attrs = (token as { attrs?: Record<string, string> }).attrs ?? {};
		return helpers.createNode('videoEmbed', {
			provider: attrs['data-provider'] ?? 'youtube',
			videoId: attrs['data-video-id'] ?? '',
			url: attrs['data-url'] ?? '',
			embedUrl: attrs['data-embed-url'] ?? '',
		});
	},

	renderMarkdown(node) {
		const provider =
			typeof node.attrs?.provider === 'string' ? node.attrs.provider : 'youtube';
		const videoId =
			typeof node.attrs?.videoId === 'string' ? node.attrs.videoId : '';
		const url = typeof node.attrs?.url === 'string' ? node.attrs.url : '';
		const embedUrl =
			typeof node.attrs?.embedUrl === 'string' ? node.attrs.embedUrl : '';

		return `<video-embed data-provider="${provider}" data-video-id="${videoId}" data-url="${url}" data-embed-url="${embedUrl}"></video-embed>`;
	},
});

export default VideoEmbedNode;
