'use client';

import { useEffect, useState } from 'react';
import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { Check, MapPinned } from 'lucide-react';
import { useTranslations } from 'next-intl';

import BlockNodeShell from './block-node-shell';
import {
	extractCustomBlockTag,
	findCustomBlockTagStart,
} from '@/lib/markdown-custom-block';
import {
	buildMapEmbedUrl,
	hasMapEmbedTarget,
	normalizeMapZoom,
} from '@/lib/map-embed';

const escapeHtmlAttribute = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

const MapEmbedNodeView = ({
	node,
	selected,
	editor,
	updateAttributes,
}: NodeViewProps) => {
	const t = useTranslations();
	const query = typeof node.attrs.query === 'string' ? node.attrs.query : '';
	const lat = typeof node.attrs.lat === 'string' ? node.attrs.lat : '';
	const lng = typeof node.attrs.lng === 'string' ? node.attrs.lng : '';
	const zoom = normalizeMapZoom(node.attrs.zoom);
	const isEditable = editor.isEditable;
	const [draftQuery, setDraftQuery] = useState(query);
	const [draftLat, setDraftLat] = useState(lat);
	const [draftLng, setDraftLng] = useState(lng);
	const [draftZoom, setDraftZoom] = useState(String(zoom));

	useEffect(() => {
		setDraftQuery(query);
		setDraftLat(lat);
		setDraftLng(lng);
		setDraftZoom(String(zoom));
	}, [query, lat, lng, zoom]);

	const applyMap = () => {
		updateAttributes({
			query: draftQuery.trim(),
			lat: draftLat.trim(),
			lng: draftLng.trim(),
			zoom: String(normalizeMapZoom(draftZoom)),
		});
	};

	const embedUrl = buildMapEmbedUrl({ query, lat, lng, zoom });
	const label = query || (lat && lng ? `${lat}, ${lng}` : t('editor_map_title'));

	return (
		<NodeViewWrapper>
			<BlockNodeShell
				selected={selected && isEditable}
				className='max-w-full'
				contentClassName='overflow-hidden bg-background p-3'>
				<div className='mb-3 flex min-w-0 items-center gap-2 text-sm font-medium text-foreground'>
					<MapPinned className='size-4 shrink-0 text-primary' />
					<span>{t('editor_map_title')}</span>
					<span className='truncate text-xs font-normal text-muted-foreground'>
						{label}
					</span>
				</div>
				<div className='overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-sm'>
					<div className='aspect-video w-full'>
						{hasMapEmbedTarget({ query, lat, lng }) ? (
							<iframe
								src={embedUrl}
								title={label}
								className='h-full w-full border-0'
								loading='lazy'
								referrerPolicy='no-referrer-when-downgrade'
							/>
						) : (
							<div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
								{t('editor_map_empty')}
							</div>
						)}
					</div>
				</div>
				{isEditable ? (
					<div className='mt-3 space-y-2'>
						<div className='grid gap-2 sm:grid-cols-[1fr_7rem]'>
							<input
								value={draftQuery}
								onChange={(event) => setDraftQuery(event.target.value)}
								onMouseDown={(event) => event.stopPropagation()}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										applyMap();
									}
								}}
								className='h-9 rounded-lg border border-border/60 bg-background px-3 text-sm outline-none'
								placeholder={t('editor_map_query_placeholder')}
							/>
							<input
								value={draftZoom}
								onChange={(event) => setDraftZoom(event.target.value)}
								onMouseDown={(event) => event.stopPropagation()}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										applyMap();
									}
								}}
								className='h-9 rounded-lg border border-border/60 bg-background px-3 text-sm outline-none'
								placeholder={t('editor_map_zoom_placeholder')}
							/>
						</div>
						<div className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'>
							<input
								value={draftLat}
								onChange={(event) => setDraftLat(event.target.value)}
								onMouseDown={(event) => event.stopPropagation()}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										applyMap();
									}
								}}
								className='h-9 rounded-lg border border-border/60 bg-background px-3 text-sm outline-none'
								placeholder={t('editor_map_lat_placeholder')}
							/>
							<input
								value={draftLng}
								onChange={(event) => setDraftLng(event.target.value)}
								onMouseDown={(event) => event.stopPropagation()}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										applyMap();
									}
								}}
								className='h-9 rounded-lg border border-border/60 bg-background px-3 text-sm outline-none'
								placeholder={t('editor_map_lng_placeholder')}
							/>
							<button
								type='button'
								onMouseDown={(event) => event.stopPropagation()}
								onClick={applyMap}
								className='inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-3 text-sm text-foreground transition-colors hover:bg-muted'>
								<Check className='size-4' />
								<span>{t('confirm')}</span>
							</button>
						</div>
					</div>
				) : null}
			</BlockNodeShell>
		</NodeViewWrapper>
	);
};

const MapEmbedNode = Node.create({
	name: 'mapEmbed',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			query: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-query') ?? '',
				renderHTML: (attributes) => ({
					'data-query': attributes.query ?? '',
				}),
			},
			lat: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-lat') ?? '',
				renderHTML: (attributes) => ({
					'data-lat': attributes.lat ?? '',
				}),
			},
			lng: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-lng') ?? '',
				renderHTML: (attributes) => ({
					'data-lng': attributes.lng ?? '',
				}),
			},
			zoom: {
				default: '13',
				parseHTML: (element) => element.getAttribute('data-zoom') ?? '13',
				renderHTML: (attributes) => ({
					'data-zoom': String(normalizeMapZoom(attributes.zoom)),
				}),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'map-embed',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'map-embed',
			mergeAttributes(HTMLAttributes, {
				class: 'map-embed',
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(MapEmbedNodeView);
	},

	markdownTokenName: 'mapEmbed',

	markdownTokenizer: {
		name: 'mapEmbed',
		level: 'block',
		start: findCustomBlockTagStart('map-embed'),
		tokenize(src) {
			const parsed = extractCustomBlockTag(src, 'map-embed');
			if (!parsed) {
				return undefined;
			}

			return {
				type: 'mapEmbed',
				raw: parsed.raw,
				attrs: parsed.attributes,
				tokens: [],
			};
		},
	},

	parseMarkdown(token, helpers) {
		const attrs = (token as { attrs?: Record<string, string> }).attrs ?? {};
		return helpers.createNode('mapEmbed', {
			query: attrs['data-query'] ?? '',
			lat: attrs['data-lat'] ?? '',
			lng: attrs['data-lng'] ?? '',
			zoom: attrs['data-zoom'] ?? '13',
		});
	},

	renderMarkdown(node) {
		const query = typeof node.attrs?.query === 'string' ? node.attrs.query : '';
		const lat = typeof node.attrs?.lat === 'string' ? node.attrs.lat : '';
		const lng = typeof node.attrs?.lng === 'string' ? node.attrs.lng : '';
		const zoom = String(normalizeMapZoom(node.attrs?.zoom));

		return `<map-embed data-query="${escapeHtmlAttribute(query)}" data-lat="${escapeHtmlAttribute(lat)}" data-lng="${escapeHtmlAttribute(lng)}" data-zoom="${zoom}"></map-embed>`;
	},
});

export default MapEmbedNode;
