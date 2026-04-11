'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { Eraser, PencilRuler } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	extractCustomBlockTag,
	findCustomBlockTagStart,
} from '@/lib/markdown-custom-block';
import BlockNodeShell from './block-node-shell';

const DEFAULT_DRAWING_WIDTH = 960;
const DEFAULT_DRAWING_HEIGHT = 420;

const encodeDataUrl = (value: string) => encodeURIComponent(value);
const decodeDataUrl = (value: string | null) => {
	if (!value) {
		return '';
	}

	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

const DrawingNodeView = ({
	node,
	editor,
	updateAttributes,
	selected,
	getPos,
}: NodeViewProps) => {
	const t = useTranslations();
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDrawingRef = useRef(false);
	const hasPendingStrokeRef = useRef(false);
	const previousPointRef = useRef<{ x: number; y: number } | null>(null);

	const width =
		typeof node.attrs.width === 'number'
			? node.attrs.width
			: DEFAULT_DRAWING_WIDTH;
	const height =
		typeof node.attrs.height === 'number'
			? node.attrs.height
			: DEFAULT_DRAWING_HEIGHT;
	const dataUrl =
		typeof node.attrs.dataUrl === 'string' ? node.attrs.dataUrl : '';
	const isEditable = editor.isEditable;

	const selectNode = () => {
		const position = typeof getPos === 'function' ? getPos() : null;
		if (typeof position !== 'number') {
			return;
		}
		editor.chain().focus().setNodeSelection(position).run();
	};

	const prepareCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return null;
		}

		const ratio = window.devicePixelRatio || 1;
		canvas.width = width * ratio;
		canvas.height = height * ratio;
		canvas.style.width = '100%';
		canvas.style.height = '100%';

		const context = canvas.getContext('2d');
		if (!context) {
			return null;
		}

		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.clearRect(0, 0, width, height);
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, width, height);
		context.lineCap = 'round';
		context.lineJoin = 'round';
		context.lineWidth = 3;
		context.strokeStyle = '#0f172a';
		return context;
	};

	useEffect(() => {
		const context = prepareCanvas();
		if (!context || !dataUrl) {
			return;
		}

		const image = new Image();
		image.onload = () => {
			context.drawImage(image, 0, 0, width, height);
		};
		image.src = dataUrl;
	}, [dataUrl, height, width]);

	const getCanvasCoordinates = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return null;
		}

		const rect = canvas.getBoundingClientRect();
		return {
			x: ((event.clientX - rect.left) / rect.width) * width,
			y: ((event.clientY - rect.top) / rect.height) * height,
		};
	};

	const persistDrawing = () => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		hasPendingStrokeRef.current = false;
		updateAttributes({
			dataUrl: canvas.toDataURL('image/png'),
		});
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isEditable) {
			return;
		}

		const context = canvasRef.current?.getContext('2d');
		const point = getCanvasCoordinates(event);
		if (!context || !point) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		isDrawingRef.current = true;
		hasPendingStrokeRef.current = true;
		previousPointRef.current = point;
		context.beginPath();
		context.moveTo(point.x, point.y);
		context.lineTo(point.x, point.y);
		context.stroke();
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isEditable || !isDrawingRef.current) {
			return;
		}

		const context = canvasRef.current?.getContext('2d');
		const point = getCanvasCoordinates(event);
		if (!context || !point) {
			return;
		}

		const previousPoint = previousPointRef.current ?? point;
		context.beginPath();
		context.moveTo(previousPoint.x, previousPoint.y);
		context.lineTo(point.x, point.y);
		context.stroke();
		previousPointRef.current = point;
	};

	const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isEditable || !isDrawingRef.current) {
			return;
		}

		event.preventDefault();
		isDrawingRef.current = false;
		previousPointRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		if (hasPendingStrokeRef.current) {
			persistDrawing();
		}
	};

	const handleClear = () => {
		if (!isEditable) {
			return;
		}

		prepareCanvas();
		hasPendingStrokeRef.current = false;
		previousPointRef.current = null;
		updateAttributes({
			dataUrl: '',
		});
	};

	return (
		<NodeViewWrapper>
			<BlockNodeShell
				selected={selected && isEditable}
				contentClassName='p-3'>
			<div className='mb-3 flex items-center justify-between gap-3'>
				<div className='flex items-center gap-2 text-sm font-medium text-foreground'>
					<PencilRuler className='size-4' />
					<span>{t('document_create_drawing_node')}</span>
				</div>
				{isEditable && (
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={handleClear}>
						<Eraser className='size-4' />
						{t('document_create_drawing_clear')}
					</Button>
				)}
			</div>
			<div
				className={cn(
					'relative overflow-hidden rounded-xl border border-dashed border-border/70 bg-white shadow-inner',
					isEditable ? 'cursor-crosshair' : 'cursor-default',
				)}
				style={{ aspectRatio: `${width} / ${height}` }}>
				<canvas
					ref={canvasRef}
					className='block h-full w-full touch-none'
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerLeave={handlePointerUp}
				/>
				{!dataUrl && (
					<div className='pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground'>
						{t('document_create_drawing_placeholder')}
					</div>
				)}
			</div>
			</BlockNodeShell>
		</NodeViewWrapper>
	);
};

const DrawingNode = Node.create({
	name: 'drawing',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			dataUrl: {
				default: '',
				parseHTML: (element) => decodeDataUrl(element.getAttribute('data-url')),
				renderHTML: (attributes) => ({
					'data-url':
						typeof attributes.dataUrl === 'string' && attributes.dataUrl
							? encodeDataUrl(attributes.dataUrl)
							: null,
				}),
			},
			width: {
				default: DEFAULT_DRAWING_WIDTH,
				parseHTML: (element) =>
					Number(element.getAttribute('data-width') ?? DEFAULT_DRAWING_WIDTH),
				renderHTML: (attributes) => ({
					'data-width': attributes.width ?? DEFAULT_DRAWING_WIDTH,
				}),
			},
			height: {
				default: DEFAULT_DRAWING_HEIGHT,
				parseHTML: (element) =>
					Number(
						element.getAttribute('data-height') ?? DEFAULT_DRAWING_HEIGHT,
					),
				renderHTML: (attributes) => ({
					'data-height': attributes.height ?? DEFAULT_DRAWING_HEIGHT,
				}),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'drawing-node',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'drawing-node',
			mergeAttributes(HTMLAttributes, {
				class: 'drawing-node',
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(DrawingNodeView);
	},

	markdownTokenName: 'drawing',

	markdownTokenizer: {
		name: 'drawing',
		level: 'block',
		start: findCustomBlockTagStart('drawing-node'),
		tokenize(src) {
			const parsed = extractCustomBlockTag(src, 'drawing-node');
			if (!parsed) {
				return undefined;
			}

			return {
				type: 'drawing',
				raw: parsed.raw,
				attrs: parsed.attributes,
				tokens: [],
			};
		},
	},

	parseMarkdown(token, helpers) {
		const attrs = (token as { attrs?: Record<string, string> }).attrs ?? {};
		return helpers.createNode('drawing', {
			dataUrl: decodeDataUrl(attrs['data-url'] ?? ''),
			width: Number(attrs['data-width'] ?? DEFAULT_DRAWING_WIDTH),
			height: Number(attrs['data-height'] ?? DEFAULT_DRAWING_HEIGHT),
		});
	},

	renderMarkdown(node) {
		const dataUrl =
			typeof node.attrs?.dataUrl === 'string' ? node.attrs.dataUrl : '';
		const width =
			typeof node.attrs?.width === 'number'
				? node.attrs.width
				: DEFAULT_DRAWING_WIDTH;
		const height =
			typeof node.attrs?.height === 'number'
				? node.attrs.height
				: DEFAULT_DRAWING_HEIGHT;

		return `<drawing-node data-url="${encodeDataUrl(dataUrl)}" data-width="${width}" data-height="${height}"></drawing-node>`;
	},
});

export default DrawingNode;
