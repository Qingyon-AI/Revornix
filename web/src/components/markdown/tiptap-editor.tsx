'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import {
	Highlighter,
	Bold,
	Code2,
	Italic,
	Heading1,
	Heading2,
	ImagePlus,
	List,
	ListOrdered,
	Loader2,
	MessageSquarePlus,
	PencilRuler,
	Sparkles,
	Square,
	Strikethrough,
	Sigma,
	Table2,
	Type,
	Underline,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';

import MermaidCodeBlock from './extensions/mermaid-code-block';
import ImageNode from './extensions/image-node';
import DrawingNode from './extensions/drawing-node';
import TableNode from './extensions/table-node';
import VideoEmbedNode from './extensions/video-embed-node';
import MathInlineNode from './extensions/math-inline-node';
import MathBlockNode from './extensions/math-block-node';
import TextColorMark from './extensions/text-color-mark';
import TextHighlightMark from './extensions/text-highlight-mark';
import aiApi from '@/api/ai';
import { getUserTimeZone } from '@/lib/time';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { generateImageWithDefaultEngine } from '@/service/engine';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import { FileService } from '@/lib/file';
import type { AIEvent } from '@/types/ai';

type TipTapEditorProps = {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	enableImageUpload?: boolean;
	enableDrawing?: boolean;
	ownerId?: number;
};

type ContinuePreset = 'rewrite' | 'expand' | 'summarize' | 'formalize';
type ContinueSelectionSnapshot = {
	from: number;
	to: number;
	context: string;
};

const AI_CONTINUATION_TIMEOUT_MS = 45_000;
const AI_ILLUSTRATION_TIMEOUT_MS = 60_000;
const AI_CONTINUATION_MAX_CHARS = 600;

const CONTINUE_WRITING_SYSTEM_PROMPT = `你是一个专业的中文写作助手。

请基于用户提供的上下文继续撰写文案。

严格遵守：
1. 只输出最终续写内容本身。
2. 不要输出解释、标题、引号、代码块或“当然可以”这类前言。
3. 保持原有语气、语言和叙述视角自然衔接。
4. 默认输出 1 到 3 个自然段。
5. 不使用 Markdown 列表，除非上下文本身明显要求。`;

const parseSSEPayloads = (buffer: string) =>
	buffer
		.split('\n\n')
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) => (chunk.startsWith('data:') ? chunk.slice(5).trim() : chunk));

const buildParagraphNodesFromText = (text: string) => {
	const normalizedParagraphs = text
		.replace(/\r\n/g, '\n')
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.replace(/\n+/g, ' ').trim())
		.filter(Boolean);

	if (normalizedParagraphs.length === 0) {
		return [];
	}

	return normalizedParagraphs.map((paragraph) => ({
		type: 'paragraph' as const,
		content: [
			{
				type: 'text' as const,
				text: paragraph,
			},
		],
	}));
};

const clampContinuationText = (text: string, maxChars: number) => {
	const normalized = text.trim();
	if (normalized.length <= maxChars) {
		return normalized;
	}

	return `${normalized.slice(0, maxChars).trimEnd()}...`;
};

const decodeDataUrlToFile = async (dataUrl: string, fileName: string) => {
	const response = await fetch(dataUrl);
	const blob = await response.blob();
	return new File([blob], fileName, {
		type: blob.type || 'image/png',
	});
};

const TipTapEditor = ({
	value = '',
	onChange,
	placeholder,
	className,
	enableImageUpload = false,
	enableDrawing = false,
	ownerId,
}: TipTapEditorProps) => {
	const TEXT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
	const HIGHLIGHT_COLORS = ['#fef08a', '#fed7aa', '#bfdbfe', '#bbf7d0', '#fecdd3', '#e9d5ff'];
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { revornixModel, imageGenerateEngine } = useDefaultResourceAccess();
	const imageInputRef = useRef<HTMLInputElement | null>(null);
	const aiSelectionRef = useRef<ContinueSelectionSnapshot | null>(null);
	const continueAbortControllerRef = useRef<AbortController | null>(null);
	const continueAbortReasonRef = useRef<'user' | 'timeout' | null>(null);
	const streamingInsertRangeRef = useRef<{ from: number; to: number } | null>(null);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [isContinueDialogOpen, setIsContinueDialogOpen] = useState(false);
	const [isIllustrationDialogOpen, setIsIllustrationDialogOpen] = useState(false);
	const [continuePreset, setContinuePreset] = useState<ContinuePreset>('expand');
	const [continueInstruction, setContinueInstruction] = useState('');
	const [, setContinuePreview] = useState('');
	const [illustrationPrompt, setIllustrationPrompt] = useState('');
	const [isContinuing, setIsContinuing] = useState(false);
	const [isGeneratingIllustration, setIsGeneratingIllustration] = useState(false);
	const resolvedOwnerId = ownerId ?? mainUserInfo?.id;

	const syncPlaceholderState = (editorInstance: {
		isEmpty: boolean;
		view: { dom: HTMLElement };
	}) => {
		const dom = editorInstance.view.dom;
		dom.classList.toggle('is-empty', editorInstance.isEmpty);
		if (placeholder) {
			dom.setAttribute('data-placeholder', placeholder);
		} else {
			dom.removeAttribute('data-placeholder');
		}
	};

	const { data: userFileSystemDetail } = useQuery({
		queryKey: [
			'getUserFileSystemDetail',
			mainUserInfo?.id,
			mainUserInfo?.default_user_file_system,
		],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			enableImageUpload &&
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({ codeBlock: false }),
			ImageNode.configure({
				ownerId: resolvedOwnerId,
			}),
			DrawingNode,
			TableNode,
			VideoEmbedNode,
			MathInlineNode,
			MathBlockNode,
			TextColorMark,
			TextHighlightMark,
			MermaidCodeBlock,
			Markdown,
		],
		content: value,
		contentType: 'markdown',
		onCreate: ({ editor }) => {
			syncPlaceholderState(editor);
		},
		onUpdate: ({ editor }) => {
			onChange?.(editor.getMarkdown());
			syncPlaceholderState(editor);
		},
	}, [resolvedOwnerId]);

	const toolbarState = useEditorState({
		editor,
		selector: ({ editor: currentEditor }) => ({
			isBoldActive: currentEditor?.isActive('bold') ?? false,
			isItalicActive: currentEditor?.isActive('italic') ?? false,
			isStrikeActive: currentEditor?.isActive('strike') ?? false,
			isUnderlineActive: currentEditor?.isActive('underline') ?? false,
			isHeading1Active:
				currentEditor?.isActive('heading', { level: 1 }) ?? false,
			isHeading2Active:
				currentEditor?.isActive('heading', { level: 2 }) ?? false,
			isBulletListActive: currentEditor?.isActive('bulletList') ?? false,
			isOrderedListActive: currentEditor?.isActive('orderedList') ?? false,
			isCodeBlockActive: currentEditor?.isActive('codeBlock') ?? false,
			activeTextColor:
				typeof currentEditor?.getAttributes('textColor')?.color === 'string'
					? currentEditor.getAttributes('textColor').color
					: null,
			activeHighlightColor:
				typeof currentEditor?.getAttributes('textHighlight')?.color === 'string'
					? currentEditor.getAttributes('textHighlight').color
					: null,
		}),
	});
	const resolvedToolbarState = toolbarState ?? {
		isBoldActive: false,
		isItalicActive: false,
		isStrikeActive: false,
		isUnderlineActive: false,
		isHeading1Active: false,
		isHeading2Active: false,
		isBulletListActive: false,
		isOrderedListActive: false,
		isCodeBlockActive: false,
		activeTextColor: null,
		activeHighlightColor: null,
	};

	const openImagePicker = () => {
		if (isUploadingImage) {
			return;
		}
		imageInputRef.current?.click();
	};

	const insertDrawingNode = () => {
		editor
			?.chain()
			.focus()
			.insertContent([
				{
					type: 'drawing',
				},
				{
					type: 'paragraph',
				},
			])
			.run();
	};

	const insertTableNode = () => {
		editor
			?.chain()
			.focus()
			.insertContent([
				{
					type: 'tableNode',
				},
				{
					type: 'paragraph',
				},
			])
			.run();
	};

	const rememberSelection = () => {
		if (!editor) {
			return;
		}
		const { from, to } = editor.state.selection;
		aiSelectionRef.current = {
			from,
			to,
			context: getSelectedContext(),
		};
	};

	const getSelectedContext = () => {
		if (!editor) {
			return '';
		}
		const { from, to, empty, $from } = editor.state.selection;
		if (!empty) {
			return editor.state.doc.textBetween(from, to, '\n').trim();
		}
		return $from.parent.textContent.trim();
	};

	const openContinueDialog = () => {
		rememberSelection();
		setContinuePreset('expand');
		setContinueInstruction('');
		setContinuePreview('');
		setIsContinueDialogOpen(true);
	};

	const openIllustrationDialog = () => {
		rememberSelection();
		const context = getSelectedContext();
		setIllustrationPrompt(
			context
				? `为下面这段文档内容生成一张风格统一、适合作为插图的图片：\n\n${context}`
				: '生成一张适合插入当前文档的插图，风格简洁、现代、编辑风友好。'
		);
		setIsIllustrationDialogOpen(true);
	};

	const preserveEditorSelection = (
		event: React.MouseEvent<HTMLButtonElement>,
	) => {
		event.preventDefault();
	};

	const getToolbarButtonClassName = (isActive?: boolean) =>
		cn(
			'size-8',
			isActive && 'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground'
		);

	const getColorTriggerClassName = (isActive?: boolean) =>
		cn(
			'h-8 gap-2 rounded-md border border-border/60 px-2 text-xs',
			isActive && 'border-foreground/30 bg-accent text-accent-foreground',
		);

	const applyTextColor = (color: string) => {
		editor?.chain().focus().setMark('textColor', { color }).run();
	};

	const clearTextColor = () => {
		editor?.chain().focus().unsetMark('textColor').run();
	};

	const applyHighlightColor = (color: string) => {
		editor?.chain().focus().setMark('textHighlight', { color }).run();
	};

	const clearHighlightColor = () => {
		editor?.chain().focus().unsetMark('textHighlight').run();
	};

	const replaceStreamingContinuation = (text: string) => {
		if (!editor || !streamingInsertRangeRef.current) {
			return;
		}

		const { from, to } = streamingInsertRangeRef.current;
		const clampedText = clampContinuationText(text, AI_CONTINUATION_MAX_CHARS);
		const paragraphNodes = buildParagraphNodesFromText(clampedText);
		const replacementContent =
			paragraphNodes.length > 0 ? paragraphNodes : [{ type: 'paragraph' as const }];

		editor.commands.insertContentAt({ from, to }, replacementContent);

		const replacementLength = replacementContent.reduce((size, node) => {
			if (node.type !== 'paragraph') {
				return size;
			}
			const paragraphContent =
				'content' in node && Array.isArray(node.content) ? node.content : [];
			const textLength = paragraphContent.reduce(
				(total: number, child: { type: string; text?: string }) =>
					total + (child.type === 'text' ? child.text?.length ?? 0 : 0),
				0,
			);
			return size + textLength + 2;
		}, 0);

		streamingInsertRangeRef.current = {
			from,
			to: from + replacementLength,
		};
	};

	const stopAiContinuation = () => {
		continueAbortReasonRef.current = 'user';
		continueAbortControllerRef.current?.abort();
	};

	const readAiTextResponse = async (
		response: Response,
		options?: {
			onStreamText?: (text: string) => void;
		},
	) => {
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error(t('something_wrong'));
		}

		const decoder = new TextDecoder();
		let buffer = '';
		let output = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split('\n\n');
			buffer = parts.pop() || '';

			for (const rawChunk of parts) {
				for (const payload of parseSSEPayloads(rawChunk)) {
					try {
						const event = JSON.parse(payload) as AIEvent;
						if (event.type === 'output') {
							if (event.payload.kind === 'token') {
								output += event.payload.content;
								options?.onStreamText?.(output);
							}
							if (event.payload.kind === 'system_text') {
								output += `${event.payload.paragraph_break ? '\n\n' : ''}${event.payload.message}`;
								options?.onStreamText?.(output);
							}
							if (output.length >= AI_CONTINUATION_MAX_CHARS) {
								reader.cancel().catch(() => undefined);
								return clampContinuationText(output, AI_CONTINUATION_MAX_CHARS);
							}
						}
						if (event.type === 'error') {
							throw new Error(event.payload.message || t('something_wrong'));
						}
					} catch (error) {
						if (error instanceof Error) {
							throw error;
						}
						console.error('Invalid SSE chunk', payload, error);
					}
				}
			}
		}

		return output.trim();
	};

	const withTimeout = async <T,>(
		task: (signal: AbortSignal) => Promise<T>,
		timeoutMs: number,
		timeoutMessage: string,
	) => {
		const controller = new AbortController();
		const timer = window.setTimeout(() => controller.abort(), timeoutMs);

		try {
			return await task(controller.signal);
		} catch (error) {
			if ((error as DOMException)?.name === 'AbortError') {
				throw new Error(timeoutMessage);
			}
			throw error;
		} finally {
			window.clearTimeout(timer);
		}
	};

	const continuePresetOptions: Array<{
		id: ContinuePreset;
		label: string;
		instruction: string;
	}> = [
		{
			id: 'rewrite',
			label: '改写',
			instruction:
				'请在保持原意的前提下重新表达这段内容，让表达更顺滑自然，但不要明显改变信息重点。',
		},
		{
			id: 'expand',
			label: '扩写',
			instruction:
				'请顺着这段内容继续展开，补充细节、语境和表达层次，让内容更丰满完整。',
		},
		{
			id: 'summarize',
			label: '总结',
			instruction:
				'请把这段内容提炼成更短、更清晰的总结版本，保留核心信息，语气自然。',
		},
		{
			id: 'formalize',
			label: '更正式',
			instruction:
				'请把这段内容调整成更正式、更专业的表达，适合文档、方案或对外说明场景。',
		},
	];

	const requestAiContinuation = async () => {
		const selectionContext =
			aiSelectionRef.current?.context?.trim() || getSelectedContext();
		if (!selectionContext) {
			toast.error('请先选中文案，或把光标放在要续写的段落里');
			return;
		}
		if (!mainUserInfo?.default_revornix_model_id) {
			toast.error(t('revornix_ai_model_not_set'));
			return;
		}
		if (!revornixModel.accessible) {
			toast.error(
				revornixModel.subscriptionLocked
					? t('revornix_ai_access_hint')
					: '当前默认聊天模型不可用',
			);
			return;
		}

		setIsContinuing(true);
		setContinuePreview('');
		setIsContinueDialogOpen(false);
		try {
			const insertionTarget =
				aiSelectionRef.current?.to ?? editor?.state.selection.to ?? null;
			if (!editor || insertionTarget === null) {
				throw new Error('无法插入续写内容');
			}

			streamingInsertRangeRef.current = {
				from: insertionTarget,
				to: insertionTarget,
			};

			const headers = new Headers();
			headers.append('Content-Type', 'application/json');
			const accessToken = Cookies.get('access_token');
			if (accessToken) {
				headers.append('Authorization', `Bearer ${accessToken}`);
			}
			const userTimeZone = getUserTimeZone();
			if (userTimeZone) {
				headers.append('X-User-Timezone', userTimeZone);
			}

			const presetInstruction =
				continuePresetOptions.find((option) => option.id === continuePreset)
					?.instruction ?? continuePresetOptions[1].instruction;
			const guidance = continueInstruction.trim();
			const prompt = [
				CONTINUE_WRITING_SYSTEM_PROMPT,
				presetInstruction,
				`输出长度请控制在 ${AI_CONTINUATION_MAX_CHARS} 个中文字符以内，最多 3 段。`,
				'上下文：',
				selectionContext,
				guidance ? `额外要求：${guidance}` : null,
			]
				.filter(Boolean)
				.join('\n\n');

			continueAbortControllerRef.current = new AbortController();
			continueAbortReasonRef.current = null;
			const timeoutId = window.setTimeout(() => {
				continueAbortReasonRef.current = 'timeout';
				continueAbortControllerRef.current?.abort();
			}, AI_CONTINUATION_TIMEOUT_MS);

			let response: Response;
			try {
				response = await fetch(aiApi.askAi, {
					headers,
					method: 'POST',
					mode: 'cors',
					credentials: 'same-origin',
					redirect: 'follow',
					referrerPolicy: 'no-referrer',
					signal: continueAbortControllerRef.current.signal,
					body: JSON.stringify({
						enable_mcp: false,
						messages: [
							{
								chat_id: crypto.randomUUID(),
								role: 'user',
								content: prompt,
							},
						],
					}),
				});
			} finally {
				window.clearTimeout(timeoutId);
			}

			if (response.status !== 200) {
				let errorMessage = 'AI 续写失败';
				try {
					errorMessage = (await response.json()).message || errorMessage;
				} catch (error) {
					console.error(error);
				}
				throw new Error(errorMessage);
			}

			const continuation = clampContinuationText(
				await readAiTextResponse(response, {
					onStreamText: (text) => {
						setContinuePreview(text);
						replaceStreamingContinuation(text);
					},
				}),
				AI_CONTINUATION_MAX_CHARS,
			);
			if (!continuation) {
				throw new Error('模型没有返回可插入的内容');
			}

			replaceStreamingContinuation(continuation);
			setContinueInstruction('');
			setContinuePreview('');
		} catch (error: any) {
			if ((error as DOMException)?.name === 'AbortError') {
				if (continueAbortReasonRef.current === 'timeout') {
					toast.error('AI 续写请求超时，请检查默认模型配置后重试');
				}
				return;
			}
			console.error(error);
			toast.error(error?.message || 'AI 续写失败');
		} finally {
			continueAbortControllerRef.current = null;
			continueAbortReasonRef.current = null;
			streamingInsertRangeRef.current = null;
			setIsContinuing(false);
		}
	};

	const generateIllustration = async () => {
		const prompt = illustrationPrompt.trim();
		if (!prompt) {
			toast.error('请先填写插图提示词');
			return;
		}
		if (!imageGenerateEngine.accessible) {
			toast.error(
				imageGenerateEngine.subscriptionLocked
					? t('section_form_auto_illustration_engine_unset')
					: '当前默认插图生成引擎不可用',
			);
			return;
		}
		if (!mainUserInfo?.default_user_file_system || !userFileSystemDetail?.file_system_id) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}

		setIsGeneratingIllustration(true);
		try {
			const image = await withTimeout(
				() => generateImageWithDefaultEngine({ prompt }),
				AI_ILLUSTRATION_TIMEOUT_MS,
				'插图生成请求超时，请检查默认图片引擎配置后重试',
			);
			const extension =
				image.data_url.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/)?.[1] ??
				'png';
			const normalizedExtension = extension === 'svg+xml' ? 'svg' : extension;
			const file = await decodeDataUrlToFile(
				image.data_url,
				`illustration-${crypto.randomUUID()}.${normalizedExtension}`,
			);
			const filePath = `images/quick-note/${crypto.randomUUID()}.${normalizedExtension}`;
			const fileService = new FileService(userFileSystemDetail.file_system_id);
			await fileService.uploadFile(filePath, file);

			const insertionTarget =
				aiSelectionRef.current?.to ?? editor?.state.selection.to ?? null;
			if (!editor || insertionTarget === null) {
				throw new Error('无法插入生成图片');
			}

			editor
				.chain()
				.focus()
				.insertContentAt(insertionTarget, [
					{
						type: 'image',
						attrs: {
							src: filePath,
							alt: prompt.slice(0, 80),
						},
					},
					{
						type: 'paragraph',
					},
				])
				.run();

			setIsIllustrationDialogOpen(false);
		} catch (error: any) {
			console.error(error);
			toast.error(error?.message || '插图生成失败');
		} finally {
			setIsGeneratingIllustration(false);
		}
	};

	const handleImageUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		if (!file.type.startsWith('image/')) {
			toast.error(t('error_upload_image_failed'));
			event.target.value = '';
			return;
		}

		if (!mainUserInfo?.default_user_file_system || !userFileSystemDetail?.file_system_id) {
			toast.error(t('error_default_file_system_not_found'));
			event.target.value = '';
			return;
		}

		setIsUploadingImage(true);
		try {
			const suffix = file.name.split('.').pop();
			const filePath = suffix
				? `images/quick-note/${crypto.randomUUID()}.${suffix}`
				: `images/quick-note/${crypto.randomUUID()}`;
			const fileService = new FileService(userFileSystemDetail.file_system_id);
			await fileService.uploadFile(filePath, file);
			editor
				?.chain()
				.focus()
				.insertContent([
					{
						type: 'image',
						attrs: {
							src: filePath,
							alt: file.name,
						},
					},
					{
						type: 'paragraph',
					},
				])
				.run();
		} catch (error) {
			console.error(error);
			toast.error(t('error_upload_image_failed'));
		} finally {
			setIsUploadingImage(false);
			event.target.value = '';
		}
	};

	return (
		<div
			className={cn(
				'relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background',
				className
			)}>
			<div className='flex items-center gap-1 border-b border-border/60 bg-muted/30 px-2 py-1.5'>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isBoldActive)}
					title='加粗'
					aria-pressed={resolvedToolbarState.isBoldActive}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleBold().run()}>
					<Bold className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isItalicActive)}
					title='斜体'
					aria-pressed={resolvedToolbarState.isItalicActive}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleItalic().run()}>
					<Italic className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isUnderlineActive)}
					title='下划线'
					aria-pressed={resolvedToolbarState.isUnderlineActive}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleUnderline().run()}>
					<Underline className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isStrikeActive)}
					title='删除线'
					aria-pressed={resolvedToolbarState.isStrikeActive}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleStrike().run()}>
					<Strikethrough className='size-4' />
				</Button>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type='button'
							variant='ghost'
							className={getColorTriggerClassName(
								Boolean(resolvedToolbarState.activeTextColor),
							)}
							title='文字颜色'
							onMouseDown={preserveEditorSelection}>
							<Type className='size-3.5' />
							<span>文字色</span>
							<span
								className='size-3 rounded-full border border-border/70'
								style={{
									backgroundColor:
										resolvedToolbarState.activeTextColor ?? 'transparent',
								}}
							/>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						align='start'
						className='w-52 space-y-3 p-3'
						onOpenAutoFocus={(event) => event.preventDefault()}>
						<div className='space-y-2'>
							<p className='text-xs font-medium text-muted-foreground'>文字颜色</p>
							<div className='flex flex-wrap gap-2'>
								{TEXT_COLORS.map((color) => (
									<button
										key={color}
										type='button'
										className={cn(
											'size-6 rounded-full border transition-transform hover:scale-110',
											resolvedToolbarState.activeTextColor === color
												? 'border-foreground ring-2 ring-ring/40'
												: 'border-border/60'
										)}
										style={{ backgroundColor: color }}
										title={`文字颜色 ${color}`}
										aria-label={`Set text color ${color}`}
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => applyTextColor(color)}
									/>
								))}
							</div>
						</div>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='w-full'
							title='清除文字颜色'
							onMouseDown={(event) => event.preventDefault()}
							onClick={clearTextColor}>
							清除文字颜色
						</Button>
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type='button'
							variant='ghost'
							className={getColorTriggerClassName(
								Boolean(resolvedToolbarState.activeHighlightColor),
							)}
							title='文字高亮'
							onMouseDown={preserveEditorSelection}>
							<Highlighter className='size-3.5' />
							<span>高亮</span>
							<span
								className='size-3 rounded-sm border border-border/70'
								style={{
									backgroundColor:
										resolvedToolbarState.activeHighlightColor ?? 'transparent',
								}}
							/>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						align='start'
						className='w-52 space-y-3 p-3'
						onOpenAutoFocus={(event) => event.preventDefault()}>
						<div className='space-y-2'>
							<p className='text-xs font-medium text-muted-foreground'>高亮颜色</p>
							<div className='flex flex-wrap gap-2'>
								{HIGHLIGHT_COLORS.map((color) => (
									<button
										key={color}
										type='button'
										className={cn(
											'size-6 rounded-md border transition-transform hover:scale-110',
											resolvedToolbarState.activeHighlightColor === color
												? 'border-foreground ring-2 ring-ring/40'
												: 'border-border/60'
										)}
										style={{ backgroundColor: color }}
										title={`高亮颜色 ${color}`}
										aria-label={`Set highlight color ${color}`}
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => applyHighlightColor(color)}
									/>
								))}
							</div>
						</div>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='w-full'
							title='清除高亮颜色'
							onMouseDown={(event) => event.preventDefault()}
							onClick={clearHighlightColor}>
							清除高亮颜色
						</Button>
					</PopoverContent>
				</Popover>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isHeading1Active)}
					title='一级标题'
					aria-pressed={resolvedToolbarState.isHeading1Active}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
					<Heading1 className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isHeading2Active)}
					title='二级标题'
					aria-pressed={resolvedToolbarState.isHeading2Active}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
					<Heading2 className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isBulletListActive)}
					title='无序列表'
					aria-pressed={resolvedToolbarState.isBulletListActive}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleBulletList().run()}>
					<List className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isOrderedListActive)}
					title='有序列表'
					aria-pressed={resolvedToolbarState.isOrderedListActive}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
					<ListOrdered className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName(resolvedToolbarState.isCodeBlockActive)}
					title='代码块'
					aria-pressed={resolvedToolbarState.isCodeBlockActive}
					onMouseDown={preserveEditorSelection}
					onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
					<Code2 className='size-4' />
				</Button>
				{enableImageUpload && (
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className={getToolbarButtonClassName()}
						title='上传图片'
						onMouseDown={preserveEditorSelection}
						onClick={openImagePicker}
						disabled={isUploadingImage}>
						{isUploadingImage ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<ImagePlus className='size-4' />
						)}
					</Button>
				)}
				{enableDrawing && (
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className={getToolbarButtonClassName()}
						title='插入手绘'
						onMouseDown={preserveEditorSelection}
						onClick={insertDrawingNode}>
						<PencilRuler className='size-4' />
					</Button>
				)}
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName()}
					title={isContinuing ? '停止 AI 续写' : 'AI 续写'}
					onMouseDown={preserveEditorSelection}
					onClick={isContinuing ? stopAiContinuation : openContinueDialog}>
					{isContinuing ? (
						<Square className='size-3.5 fill-current' />
					) : (
						<MessageSquarePlus className='size-4' />
					)}
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName()}
					title='AI 插图'
					onMouseDown={preserveEditorSelection}
					onClick={openIllustrationDialog}
					disabled={isGeneratingIllustration}>
					{isGeneratingIllustration ? (
						<Loader2 className='size-4 animate-spin' />
					) : (
						<Sparkles className='size-4' />
					)}
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName()}
					title='插入表格'
					onMouseDown={preserveEditorSelection}
					onClick={insertTableNode}>
					<Table2 className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName()}
					title='插入行内公式'
					onMouseDown={preserveEditorSelection}
					onClick={() =>
						editor
							?.chain()
							.focus()
							.insertContent({
								type: 'mathInline',
								attrs: { formula: 'a^2+b^2=c^2' },
							})
							.run()
					}>
					<Sigma className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className={getToolbarButtonClassName()}
					title='插入块级公式'
					onMouseDown={preserveEditorSelection}
					onClick={() =>
						editor
							?.chain()
							.focus()
							.insertContent([
								{
									type: 'mathBlock',
									attrs: { formula: '\\int_0^1 x^2 \\\\, dx' },
								},
								{ type: 'paragraph' },
							])
							.run()
					}>
					<Sigma className='size-4 rotate-180' />
				</Button>
				{enableImageUpload && (
					<input
						ref={imageInputRef}
						type='file'
						accept='image/*'
						className='hidden'
						onChange={handleImageUpload}
					/>
				)}
			</div>
			<EditorContent
				editor={editor}
				className='min-h-0 flex-1 overflow-auto p-5 [&_.ProseMirror]:mx-auto [&_.ProseMirror]:min-h-full [&_.ProseMirror]:w-full [&_.ProseMirror]:max-w-[52rem] [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-7 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p]:mt-0 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:border [&_.ProseMirror_code]:border-zinc-200 [&_.ProseMirror_code]:bg-zinc-100 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-zinc-900 dark:[&_.ProseMirror_code]:border-zinc-700 dark:[&_.ProseMirror_code]:bg-zinc-800 dark:[&_.ProseMirror_code]:text-zinc-100 [&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:border [&_.ProseMirror_pre]:border-zinc-200 [&_.ProseMirror_pre]:bg-zinc-100 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-zinc-900 dark:[&_.ProseMirror_pre]:border-zinc-700 dark:[&_.ProseMirror_pre]:bg-zinc-900 dark:[&_.ProseMirror_pre]:text-zinc-100 [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:text-inherit [&_.ProseMirror_u]:underline [&_.ProseMirror_mark]:rounded-[0.2rem] [&_.ProseMirror_mark]:px-0.5 [&_.ProseMirror_s]:text-muted-foreground [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:max-h-[32rem] [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-xl [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-border/60 [&_.ProseMirror_img]:object-contain [&_.ProseMirror.is-empty_p:first-child::before]:pointer-events-none [&_.ProseMirror.is-empty_p:first-child::before]:float-left [&_.ProseMirror.is-empty_p:first-child::before]:h-0 [&_.ProseMirror.is-empty_p:first-child::before]:text-muted-foreground [&_.ProseMirror.is-empty_p:first-child::before]:content-[attr(data-placeholder)]'
			/>
			<Dialog
				open={isContinueDialogOpen}
				onOpenChange={(open) => {
					setIsContinueDialogOpen(open);
					if (!open) {
						setContinuePreset('expand');
						setContinueInstruction('');
						setContinuePreview('');
					}
				}}>
				<DialogContent className='sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>AI 续写文案</DialogTitle>
						<DialogDescription>
							会基于当前选中文案或光标所在段落继续往下写。
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-3'>
						<div className='rounded-xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground'>
							{getSelectedContext() || '当前没有可用上下文，请先选中文案或把光标放到目标段落中。'}
						</div>
						<div className='space-y-2'>
							<p className='text-sm font-medium text-foreground'>预设动作</p>
							<div className='flex flex-wrap gap-2'>
								{continuePresetOptions.map((option) => (
									<Button
										key={option.id}
										type='button'
										variant='ghost'
										size='sm'
										className={cn(
											'h-8 rounded-full border px-3 text-xs',
											continuePreset === option.id
												? 'border-foreground/20 bg-accent text-accent-foreground'
												: 'border-border/60 bg-background text-muted-foreground'
										)}
										onClick={() => setContinuePreset(option.id)}>
										{option.label}
									</Button>
								))}
							</div>
						</div>
						<Textarea
							value={continueInstruction}
							onChange={(event) => setContinueInstruction(event.target.value)}
							placeholder='补充要求，例如：更有故事感、适合产品文档、控制在两段内'
							className='min-h-28'
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setIsContinueDialogOpen(false)}
							disabled={isContinuing}>
							取消
						</Button>
						<Button
							type='button'
							onClick={requestAiContinuation}
							disabled={isContinuing}>
							{isContinuing ? (
								<>
									<Loader2 className='mr-2 size-4 animate-spin' />
									续写中
								</>
							) : (
								'生成续写'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				open={isIllustrationDialogOpen}
				onOpenChange={(open) => {
					setIsIllustrationDialogOpen(open);
					if (!open) {
						setIllustrationPrompt('');
					}
				}}>
				<DialogContent className='sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>AI 文档插图</DialogTitle>
						<DialogDescription>
							使用默认插图生成引擎生成一张图片，并直接插入当前文档。
						</DialogDescription>
					</DialogHeader>
					<Textarea
						value={illustrationPrompt}
						onChange={(event) => setIllustrationPrompt(event.target.value)}
						placeholder='描述想要的插图内容、风格、构图和氛围'
						className='min-h-40'
					/>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setIsIllustrationDialogOpen(false)}
							disabled={isGeneratingIllustration}>
							取消
						</Button>
						<Button
							type='button'
							onClick={generateIllustration}
							disabled={isGeneratingIllustration}>
							{isGeneratingIllustration ? (
								<>
									<Loader2 className='mr-2 size-4 animate-spin' />
									生成中
								</>
							) : (
								'生成插图'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default TipTapEditor;
