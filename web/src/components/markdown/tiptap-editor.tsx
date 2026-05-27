'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import {
	Highlighter,
	Bold,
	Code2,
	FilePenLine,
	Expand,
	Info,
	Italic,
	Heading1,
	Heading2,
	ImagePlus,
	Paperclip,
	List,
	ListOrdered,
	Loader2,
	MapPinned,
	MessageSquarePlus,
	Minus,
	PencilRuler,
	Quote,
	Sparkles,
	Square,
	Strikethrough,
	Shrink,
	Sigma,
	Table2,
	Type,
	Underline,
	type LucideIcon,
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/hybrid-tooltip';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';

import MermaidCodeBlock from './extensions/mermaid-code-block';
import AiContinuationPlaceholderNode from './extensions/ai-continuation-placeholder-node';
import AiIllustrationPlaceholderNode from './extensions/ai-illustration-placeholder-node';
import ImageNode from './extensions/image-node';
import DrawingNode from './extensions/drawing-node';
import TableNode from './extensions/table-node';
import VideoEmbedNode from './extensions/video-embed-node';
import MapEmbedNode from './extensions/map-embed-node';
import MathBlockNode from './extensions/math-block-node';
import MathInlineNode from './extensions/math-inline-node';
import TextColorMark from './extensions/text-color-mark';
import TextHighlightMark from './extensions/text-highlight-mark';
import CalloutNode from './extensions/callout-node';
import FileAttachmentNode from './extensions/file-attachment-node';
import aiApi from '@/api/ai';
import { getUserTimeZone } from '@/lib/time';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { generateImageWithDefaultEngine } from '@/service/engine';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import { FileService } from '@/lib/file';
import { normalizeEditorMarkdown } from '@/lib/editor-markdown';
import { DEFAULT_NEW_MAP_PROVIDER } from '@/lib/map-embed';
import type { AIEvent } from '@/types/ai';
import AIModelSelect from '@/components/ai/model-select';
import ImageEngineSelect from '@/components/ai/image-engine-select';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';
import {
	FILE_ATTACHMENT_MAX_UPLOAD_BYTES,
	formatUploadSize,
	IMAGE_MAX_UPLOAD_BYTES,
} from '@/lib/upload';
import { generateUUID } from '@/lib/uuid';

type TipTapEditorProps = {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	enableImageUpload?: boolean;
	enableDrawing?: boolean;
	creatorId?: number;
	toolbarEnd?: ReactNode;
	fullscreen?: boolean;
	onFullscreenChange?: (fullscreen: boolean) => void;
	onFullscreenSave?: () => void;
	fullscreenSaveDisabled?: boolean;
	fullscreenSaveLoading?: boolean;
	onInitialParse?: (info: { isEmpty: boolean; sourceLength: number }) => void;
};

type ContinuePreset = 'rewrite' | 'expand' | 'summarize' | 'formalize';
type ContinueSelectionSnapshot = {
	from: number;
	to: number;
	context: string;
};
type SlashMenuState = {
	open: boolean;
	query: string;
	range: {
		from: number;
		to: number;
	};
	position: {
		top: number;
		left: number;
	};
	selectedIndex: number;
};
type SlashMenuItem = {
	id: string;
	label: string;
	description: string;
	keywords: string[];
	icon: LucideIcon;
	disabled?: boolean;
	run: (context: { editor: NonNullable<ReturnType<typeof useEditor>>; match: SlashMenuMatch }) => void;
};
type SlashMenuMatch = {
	query: string;
	range: {
		from: number;
		to: number;
	};
};

const AI_CONTINUATION_TIMEOUT_MS = 45_000;
const AI_ILLUSTRATION_TIMEOUT_MS = 90_000;
const AI_IMAGE_PLAN_TIMEOUT_MS = 90_000;
const AI_FULL_DOCUMENT_TIMEOUT_MS = 90_000;
const AI_CONTINUATION_MAX_CHARS = 600;
const AI_OPTIMIZED_MARKDOWN_MAX_CHARS = 60_000;
const AI_IMAGE_PLAN_MAX_CHARS = 80_000;
const AI_FULL_DOCUMENT_MAX_IMAGES = 4;
const FENCED_CODE_BLOCK_ONLY_PATTERN = /^(```|~~~)[^\n]*\n(?:[\s\S]*?\n)?\1[ \t]*$/;

const parseFencedCodeBlock = (text: string) => {
	const match = text.match(/^(```|~~~)([^\n]*)\n(?:([\s\S]*?)\n)?\1[ \t]*$/);
	if (!match) {
		return null;
	}

	return {
		language: match[2]?.trim().toLowerCase() || 'plaintext',
		content: match[3] ?? '',
	};
};

const CONTINUE_WRITING_SYSTEM_PROMPT = `你是一个专业的中文写作助手。

请基于用户提供的上下文继续撰写文案。

严格遵守：
1. 只输出最终续写内容本身。
2. 不要输出解释、标题、引号、代码块或“当然可以”这类前言。
3. 保持原有语气、语言和叙述视角自然衔接。
4. 默认输出 1 到 3 个自然段。
5. 不使用 Markdown 列表，除非上下文本身明显要求。`;

const FULL_DOCUMENT_OPTIMIZE_PROMPT = `你是 Revornix 的资深 Markdown 内容编辑，擅长把一篇草稿优化成结构清晰、表达专业、可直接发布的知识文章。

任务：基于用户提供的整篇 Markdown，输出优化后的完整 Markdown。

必须严格遵守：
1. 只输出完整 Markdown 正文，不要解释、不要包裹代码块、不要说“以下是”。
2. 保留原文事实、数据、专有名词、链接、图片、代码块、表格、数学公式、引用和自定义块，不要编造新事实。
3. 充分利用全文知识点：先理解主题、核心论点、概念关系和段落顺序，再重组表达。
4. 可以优化标题层级、段落顺序、过渡句、列表结构和小标题，让文章更易读。
5. 语言跟随原文；若中英混合，以正文主语言为准。
6. 不删除重要知识点；重复、空泛或口语化内容可以合并精炼。
7. Markdown 必须语法有效，标题层级连续，代码块围栏完整。`;

const FULL_DOCUMENT_IMAGE_PLANNER_PROMPT = `你是 Revornix 的知识文章插图编辑，需要像专栏自动插图流程一样，为一篇 Markdown 文章规划多张真正有价值的正文插图。

你必须只输出合法 JSON，不要解释，不要 Markdown 代码块。JSON schema：
{
  "markdown_with_markers": "<插入图片标记后的完整 Markdown>",
  "plans": [
    {"id": "<唯一 id>", "prompt": "<可直接发送给图片生成模型的自包含提示词>"}
  ]
}

规则：
1. 标记格式必须严格为：[image-id: <id>]。
2. 标记必须单独占一行，放在对应段落、章节或概念解释附近。
3. 除了插入标记，不要改写、删减或重排原 Markdown。
4. 最多插入 ${AI_FULL_DOCUMENT_MAX_IMAGES} 张图；只有在插图能解释复杂机制、架构、流程、时间线、关系、对比或核心概念时才插入。
5. 避免纯装饰、无关人物、照片感摆拍、文字海报和大量可读文字。
6. 技术/知识类内容优先使用信息图、概念图、流程图、架构图、关系图或编辑插画。
7. 每个 prompt 必须自包含，说明画面主体、关键元素、构图、风格、色彩和避免事项。
8. 如果文章不适合配图，返回原 Markdown 且 plans 为空数组。`;

type FullDocumentImagePlan = {
	id: string;
	prompt: string;
};

type FullDocumentImagePlanResult = {
	markdown_with_markers: string;
	plans: FullDocumentImagePlan[];
};

const parseSSEPayloads = (buffer: string) =>
	buffer
		.split('\n\n')
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) =>
			chunk.startsWith('data:') ? chunk.slice(5).trim() : chunk,
		);

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

const extractJsonObjectText = (text: string) => {
	const trimmed = text.trim();
	const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
	const start = candidate.indexOf('{');
	const end = candidate.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start) {
		return candidate;
	}
	return candidate.slice(start, end + 1);
};

const normalizeImagePlanResult = (
	rawText: string,
	fallbackMarkdown: string,
): FullDocumentImagePlanResult => {
	const data = JSON.parse(extractJsonObjectText(rawText));
	if (!data || typeof data !== 'object') {
		throw new Error('Invalid image plan');
	}

	const markdownWithMarkers =
		typeof data.markdown_with_markers === 'string' &&
		data.markdown_with_markers.trim()
			? data.markdown_with_markers
			: fallbackMarkdown;
	const rawPlans = Array.isArray(data.plans)
		? data.plans
		: Array.isArray(data.image_plans)
			? data.image_plans
			: [];
	const seenIds = new Set<string>();
	const plans = rawPlans
		.map((plan: any) => ({
			id: String(plan?.id ?? '').trim(),
			prompt: String(plan?.prompt ?? '').trim(),
		}))
		.filter((plan: FullDocumentImagePlan) => {
			if (!plan.id || !plan.prompt || seenIds.has(plan.id)) {
				return false;
			}
			seenIds.add(plan.id);
			return true;
		})
		.slice(0, AI_FULL_DOCUMENT_MAX_IMAGES);

	return {
		markdown_with_markers: markdownWithMarkers,
		plans,
	};
};

const TipTapEditor = ({
	value = '',
	onChange,
	placeholder,
	className,
	enableImageUpload = false,
	enableDrawing = false,
	creatorId,
	toolbarEnd,
	fullscreen,
	onFullscreenChange,
	onFullscreenSave,
	fullscreenSaveDisabled = false,
	fullscreenSaveLoading = false,
	onInitialParse,
}: TipTapEditorProps) => {
	const TEXT_COLORS = [
		'#ef4444',
		'#f97316',
		'#eab308',
		'#22c55e',
		'#3b82f6',
		'#8b5cf6',
	];
	const HIGHLIGHT_COLORS = [
		'#fef08a',
		'#fed7aa',
		'#bfdbfe',
		'#bbf7d0',
		'#fecdd3',
		'#e9d5ff',
	];
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { revornixModel, imageGenerateEngine } = useDefaultResourceAccess();
	const imageInputRef = useRef<HTMLInputElement | null>(null);
	const fileAttachmentInputRef = useRef<HTMLInputElement | null>(null);
	const aiSelectionRef = useRef<ContinueSelectionSnapshot | null>(null);
	const hasNotifiedInitialParseRef = useRef(false);
	const editorRef = useRef<ReturnType<typeof useEditor>>(null);
	const slashMenuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const slashMenuItemsRef = useRef<SlashMenuItem[]>([]);
	const runSlashMenuItemRef = useRef<(item: SlashMenuItem) => boolean>(
		() => false,
	);
	const continueAbortControllerRef = useRef<AbortController | null>(null);
	const continueAbortReasonRef = useRef<'user' | 'timeout' | null>(null);
	const activeContinuationPlaceholderIdRef = useRef<string | null>(null);
	const hasStreamedContinuationRef = useRef(false);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [isUploadingFileAttachment, setIsUploadingFileAttachment] =
		useState(false);
	const [isContinueDialogOpen, setIsContinueDialogOpen] = useState(false);
	const [isIllustrationDialogOpen, setIsIllustrationDialogOpen] =
		useState(false);
	const [isFullOptimizeDialogOpen, setIsFullOptimizeDialogOpen] =
		useState(false);
	const [isFullIllustrationDialogOpen, setIsFullIllustrationDialogOpen] =
		useState(false);
	const [continuePreset, setContinuePreset] =
		useState<ContinuePreset>('expand');
	const [continueInstruction, setContinueInstruction] = useState('');
	const [, setContinuePreview] = useState('');
	const [illustrationPrompt, setIllustrationPrompt] = useState('');
	const [isContinuing, setIsContinuing] = useState(false);
	const [isGeneratingIllustration, setIsGeneratingIllustration] =
		useState(false);
	const [isOptimizingDocument, setIsOptimizingDocument] = useState(false);
	const [
		isGeneratingDocumentIllustration,
		setIsGeneratingDocumentIllustration,
	] = useState(false);
	const [isFallbackFullscreen, setIsFallbackFullscreen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
		open: false,
		query: '',
		range: {
			from: 0,
			to: 0,
		},
		position: {
			top: 0,
			left: 0,
		},
		selectedIndex: 0,
	});
	const slashMenuRef = useRef(slashMenu);
	const slashMenuSuppressUntilRef = useRef(0);
	const [selectedContinuationModelId, setSelectedContinuationModelId] =
		useState<number | null>(mainUserInfo?.default_revornix_model_id ?? null);
	const [selectedIllustrationEngineId, setSelectedIllustrationEngineId] =
		useState<number | null>(
			mainUserInfo?.default_image_generate_engine_id ?? null,
		);
	const imageFileOwnerId = creatorId ?? mainUserInfo?.id;

	const closeSlashMenu = () => {
		slashMenuRef.current = {
			...slashMenuRef.current,
			open: false,
			query: '',
			selectedIndex: 0,
		};
		setSlashMenu((current) =>
			current.open
				? {
						...current,
						open: false,
						query: '',
						selectedIndex: 0,
					}
				: current,
		);
	};

	const suppressSlashMenu = () => {
		slashMenuSuppressUntilRef.current = Date.now() + 150;
	};

	const getActiveSlashMenuMatch = (): SlashMenuMatch | null => {
		const currentEditor = editorRef.current;
		if (
			!currentEditor ||
			currentEditor.isDestroyed ||
			!currentEditor.isEditable ||
			currentEditor.isActive('codeBlock')
		) {
			return null;
		}

		const { selection } = currentEditor.state;
		if (!selection.empty) {
			return null;
		}

		const { $from } = selection;
		const textBeforeCursor = $from.parent.textBetween(
			0,
			$from.parentOffset,
			undefined,
			'\ufffc',
		);
		const slashIndex = textBeforeCursor.lastIndexOf('/');
		if (
			slashIndex === -1 ||
			/\s/.test(textBeforeCursor.slice(slashIndex + 1))
		) {
			return null;
		}

		return {
			query: textBeforeCursor.slice(slashIndex + 1),
			range: {
				from: selection.from - textBeforeCursor.length + slashIndex,
				to: selection.from,
			},
		};
	};

	useEffect(() => {
		slashMenuRef.current = slashMenu;
	}, [slashMenu]);

	useEffect(() => {
		setSelectedContinuationModelId(
			mainUserInfo?.default_revornix_model_id ?? null,
		);
	}, [mainUserInfo?.default_revornix_model_id]);

	useEffect(() => {
		setSelectedIllustrationEngineId(
			mainUserInfo?.default_image_generate_engine_id ?? null,
		);
	}, [mainUserInfo?.default_image_generate_engine_id]);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (!(fullscreen ?? isFallbackFullscreen)) {
			document.body.style.overflow = '';
			return;
		}

		document.body.style.overflow = 'hidden';

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setFullscreenState(false);
			}
		};

		window.addEventListener('keydown', onKeyDown);
		return () => {
			document.body.style.overflow = '';
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [fullscreen, isFallbackFullscreen]);

	// Placeholder rendering is fully delegated to @tiptap/extension-placeholder
	// (registered above). It applies `is-editor-empty` + `data-placeholder` to
	// the empty paragraph via ProseMirror decorations, which survive doc reconciliation.

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

	const editor = useEditor(
		{
			immediatelyRender: false,
			extensions: [
				StarterKit.configure({ codeBlock: false }),
				Placeholder.configure({
					placeholder: placeholder ?? '',
					// Apply class+attribute to the empty paragraph via ProseMirror
					// decorations so the reconciler can't strip them (manual DOM
					// mutation flashes once then disappears).
					emptyEditorClass: 'is-editor-empty',
					showOnlyWhenEditable: true,
					showOnlyCurrent: false,
				}),
				UnderlineExtension,
				ImageNode.configure({
					ownerId: imageFileOwnerId,
				}),
				AiContinuationPlaceholderNode,
				AiIllustrationPlaceholderNode,
				DrawingNode,
				TableNode,
				VideoEmbedNode,
				MapEmbedNode,
				MathBlockNode,
				MathInlineNode,
				TextColorMark,
				TextHighlightMark,
				MermaidCodeBlock,
				CalloutNode,
				FileAttachmentNode.configure({
					ownerId: imageFileOwnerId,
				}),
				Markdown,
			],
			content: normalizeEditorMarkdown(value),
			contentType: 'markdown',
			editorProps: {
				transformPastedText: (text) => normalizeEditorMarkdown(text),
				handleClick: (_view, _pos, event) => {
					if (!(event.target instanceof Element)) {
						return false;
					}

					closeSlashMenu();
					const anchor = event.target.closest('a[href]');
					if (!anchor) {
						return false;
					}

					event.preventDefault();
					return true;
				},
				handlePaste: (view, event) => {
					const text = event.clipboardData?.getData('text/plain');
					if (!text) {
						return false;
					}

					const normalizedText = normalizeEditorMarkdown(text);
					if (!FENCED_CODE_BLOCK_ONLY_PATTERN.test(normalizedText.trim())) {
						return false;
					}

					const parsed = parseFencedCodeBlock(normalizedText.trim());
					const codeBlockType = view.state.schema.nodes.codeBlock;
					if (!parsed || !codeBlockType) {
						return false;
					}

					event.preventDefault();
					const node = codeBlockType.create(
						{
							language: parsed.language,
						},
						parsed.content ? view.state.schema.text(parsed.content) : undefined,
					);
					view.dispatch(
						view.state.tr.replaceSelectionWith(node).scrollIntoView(),
					);
					return true;
				},
				handleKeyDown: (_view, event) => {
					if (!slashMenuRef.current.open) {
						return false;
					}

					if (event.key === 'ArrowDown') {
						event.preventDefault();
						setSlashMenu((current) => ({
							...current,
							selectedIndex: Math.min(
								current.selectedIndex + 1,
								Math.max(slashMenuItemsRef.current.length - 1, 0),
							),
						}));
						return true;
					}

					if (event.key === 'ArrowUp') {
						event.preventDefault();
						setSlashMenu((current) => ({
							...current,
							selectedIndex: Math.max(0, current.selectedIndex - 1),
						}));
						return true;
					}

					if (event.key === 'Escape') {
						event.preventDefault();
						closeSlashMenu();
						return true;
					}

					if (event.key === 'Enter' || event.key === 'Tab') {
						if (!getActiveSlashMenuMatch()) {
							closeSlashMenu();
							return false;
						}

						event.preventDefault();
						const item =
							slashMenuItemsRef.current[slashMenuRef.current.selectedIndex] ??
							slashMenuItemsRef.current[0];
						if (item) {
							return runSlashMenuItemRef.current(item);
						}
						return true;
					}

					return false;
				},
			},
			onUpdate: ({ editor }) => {
				onChange?.(normalizeEditorMarkdown(editor.getMarkdown()));
			},
		},
		[imageFileOwnerId],
	);

	useEffect(() => {
		editorRef.current = editor;
	}, [editor]);

	// Force the Placeholder plugin to recompute its decoration once the view is
	// mounted. With `immediatelyRender: false`, the first paint can land before
	// the decoration plugin runs, leaving the empty paragraph without its
	// `is-editor-empty` class + `data-placeholder` attribute until the user
	// triggers any transaction (e.g. clicking to focus). Dispatching an empty
	// transaction kicks the decoration cycle without changing document state
	// or moving the selection.
	useEffect(() => {
		if (!editor) {
			return;
		}
		editor.view.dispatch(editor.state.tr);

		if (!hasNotifiedInitialParseRef.current) {
			hasNotifiedInitialParseRef.current = true;
			onInitialParse?.({
				isEmpty: editor.isEmpty,
				sourceLength: (value ?? '').trim().length,
			});
		}
	}, [editor, onInitialParse, value]);

	useEffect(() => {
		if (!editor) {
			return;
		}

		const normalizedValue = normalizeEditorMarkdown(value);
		const currentMarkdown = normalizeEditorMarkdown(editor.getMarkdown());
		if (currentMarkdown === normalizedValue) {
			return;
		}

		const { from, to } = editor.state.selection;
		editor.commands.setContent(normalizedValue, {
			contentType: 'markdown',
		});
		const nextDocSize = editor.state.doc.content.size;
		editor.commands.setTextSelection({
			from: Math.min(from, nextDocSize),
			to: Math.min(to, nextDocSize),
		});
	}, [editor, value, placeholder]);

	useEffect(() => {
		if (!editor) {
			return;
		}

		const updateSlashMenu = () => {
			if (Date.now() < slashMenuSuppressUntilRef.current) {
				closeSlashMenu();
				return;
			}

			if (!editor.isEditable || editor.isActive('codeBlock')) {
				closeSlashMenu();
				return;
			}

			const { selection } = editor.state;
			if (!selection.empty) {
				closeSlashMenu();
				return;
			}

			const { $from } = selection;
			const textBeforeCursor = $from.parent.textBetween(
				0,
				$from.parentOffset,
				undefined,
				'\ufffc',
			);
			const slashIndex = textBeforeCursor.lastIndexOf('/');
			if (
				slashIndex === -1 ||
				/\s/.test(textBeforeCursor.slice(slashIndex + 1))
			) {
				closeSlashMenu();
				return;
			}

			const query = textBeforeCursor.slice(slashIndex + 1);
			const from = selection.from - textBeforeCursor.length + slashIndex;
			const to = selection.from;
			const coords = editor.view.coordsAtPos(to);
			setSlashMenu((current) => ({
				open: true,
				query,
				range: {
					from,
					to,
				},
				position: {
					top: Math.min(coords.bottom + 8, window.innerHeight - 16),
					left: Math.min(Math.max(coords.left, 12), window.innerWidth - 332),
				},
				selectedIndex:
					current.open && current.query === query
						? current.selectedIndex
						: 0,
			}));
		};

		updateSlashMenu();
		editor.on('transaction', updateSlashMenu);
		editor.on('blur', closeSlashMenu);
		return () => {
			editor.off('transaction', updateSlashMenu);
			editor.off('blur', closeSlashMenu);
		};
	}, [editor]);

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
			.insertContent({
				type: 'drawing',
			})
			.run();
	};

	const insertTableNode = () => {
		editor
			?.chain()
			.focus()
			.insertContent({
				type: 'tableNode',
			})
			.run();
	};

	const insertMapNode = () => {
		editor
			?.chain()
			.focus()
			.insertContent({
				type: 'mapEmbed',
				attrs: {
					provider: DEFAULT_NEW_MAP_PROVIDER,
					query: 'Shanghai',
					zoom: '13',
				},
			})
			.run();
	};

	const insertCalloutNode = () => {
		editor
			?.chain()
			.focus()
			.insertContent({
				type: 'callout',
				attrs: { type: 'NOTE' },
				content: [{ type: 'paragraph' }],
			})
			.run();
	};

	const runSlashMenuItem = (item: SlashMenuItem) => {
		if (item.disabled) {
			return false;
		}
		const currentEditor = editorRef.current;
		const match = getActiveSlashMenuMatch();
		if (!currentEditor || currentEditor.isDestroyed || !match) {
			closeSlashMenu();
			return false;
		}

		suppressSlashMenu();
		closeSlashMenu();
		item.run({ editor: currentEditor, match });
		return true;
	};

	useEffect(() => {
		runSlashMenuItemRef.current = runSlashMenuItem;
	});

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
				: '生成一张适合插入当前文档的插图，风格简洁、现代、编辑风友好。',
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
			isActive &&
				'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground',
		);

	const getToolbarActionButtonClassName = (isActive?: boolean) =>
		cn(
			'h-8 gap-1.5 rounded-md px-2 text-xs',
			isActive &&
				'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground',
		);

	const getColorTriggerClassName = (isActive?: boolean) =>
		cn(
			'h-8 gap-2 rounded-md border border-border/60 px-2 text-xs',
			isActive && 'border-foreground/30 bg-accent text-accent-foreground',
		);

	const setFullscreenState = (nextFullscreen: boolean) => {
		setIsFallbackFullscreen(nextFullscreen);
		onFullscreenChange?.(nextFullscreen);
	};

	const handleToggleFullscreen = async () => {
		setFullscreenState(!(fullscreen ?? isFallbackFullscreen));
	};

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

	const getContinuationInsertionTarget = () => {
		if (!editor) {
			return null;
		}

		const targetPosition =
			aiSelectionRef.current?.to ?? editor.state.selection.to;
		const resolvedPosition = editor.state.doc.resolve(targetPosition);
		if (resolvedPosition.depth === 0) {
			return targetPosition;
		}

		return resolvedPosition.after(resolvedPosition.depth);
	};

	const findContinuationPlaceholder = (placeholderId: string) => {
		if (!editor) {
			return null;
		}

		let result: { from: number; to: number } | null = null;
		editor.state.doc.descendants((node, pos) => {
			if (
				node.type.name === 'aiContinuationPlaceholder' &&
				node.attrs.id === placeholderId
			) {
				result = {
					from: pos,
					to: pos + node.nodeSize,
				};
				return false;
			}
			return true;
		});
		return result;
	};

	const insertContinuationPlaceholder = ({
		placeholderId,
		position,
		message,
	}: {
		placeholderId: string;
		position: number;
		message: string;
	}) => {
		if (!editor) {
			return false;
		}

		editor.commands.insertContentAt(position, {
			type: 'aiContinuationPlaceholder',
			attrs: {
				id: placeholderId,
				message,
			},
		});
		return true;
	};

	const updateContinuationPlaceholder = ({
		placeholderId,
		message,
		preview = '',
		status = 'loading',
	}: {
		placeholderId: string;
		message: string;
		preview?: string;
		status?: 'loading' | 'error';
	}) => {
		const range = findContinuationPlaceholder(placeholderId);
		if (!editor || !range) {
			return false;
		}

		editor.commands.insertContentAt(range, {
			type: 'aiContinuationPlaceholder',
			attrs: {
				id: placeholderId,
				message,
				preview,
				status,
			},
		});
		return true;
	};

	const replaceContinuationPlaceholder = (
		placeholderId: string,
		text: string,
	) => {
		const range = findContinuationPlaceholder(placeholderId);
		if (!editor || !range) {
			return false;
		}

		const clampedText = clampContinuationText(text, AI_CONTINUATION_MAX_CHARS);
		const paragraphNodes = buildParagraphNodesFromText(clampedText);
		const replacementContent =
			paragraphNodes.length > 0
				? paragraphNodes
				: [{ type: 'paragraph' as const }];

		editor.chain().focus().insertContentAt(range, replacementContent).run();
		return true;
	};

	const findIllustrationPlaceholder = (placeholderId: string) => {
		if (!editor) {
			return null;
		}

		let result: { from: number; to: number } | null = null;
		editor.state.doc.descendants((node, pos) => {
			if (
				node.type.name === 'aiIllustrationPlaceholder' &&
				node.attrs.id === placeholderId
			) {
				result = {
					from: pos,
					to: pos + node.nodeSize,
				};
				return false;
			}
			return true;
		});
		return result;
	};

	const updateIllustrationPlaceholder = (
		placeholderId: string,
		message: string,
		status: 'loading' | 'error' = 'loading',
	) => {
		const range = findIllustrationPlaceholder(placeholderId);
		if (!editor || !range) {
			return false;
		}

		editor.commands.insertContentAt(range, {
			type: 'aiIllustrationPlaceholder',
			attrs: {
				id: placeholderId,
				message,
				status,
			},
		});
		return true;
	};

	const replaceIllustrationPlaceholder = (
		placeholderId: string,
		content: Record<string, any>,
	) => {
		const range = findIllustrationPlaceholder(placeholderId);
		if (!editor || !range) {
			return false;
		}

		editor.chain().focus().insertContentAt(range, content).run();
		return true;
	};

	const clearStreamingContinuation = () => {
		const placeholderId = activeContinuationPlaceholderIdRef.current;
		if (!editor || !placeholderId) {
			return;
		}

		const range = findContinuationPlaceholder(placeholderId);
		if (range) {
			editor.commands.deleteRange(range);
		}
	};

	const stopAiContinuation = () => {
		continueAbortReasonRef.current = 'user';
		continueAbortControllerRef.current?.abort();
	};

	const readAiTextResponse = async (
		response: Response,
		options?: {
			onStreamText?: (text: string) => void;
			maxChars?: number;
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
							const maxChars = options?.maxChars ?? AI_CONTINUATION_MAX_CHARS;
							if (output.length >= maxChars) {
								reader.cancel().catch(() => undefined);
								return clampContinuationText(output, maxChars);
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

	const buildAiHeaders = () => {
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
		return headers;
	};

	const requestAiText = async ({
		prompt,
		modelId,
		timeoutMs,
		timeoutMessage,
		maxChars,
		onStreamText,
	}: {
		prompt: string;
		modelId: number;
		timeoutMs: number;
		timeoutMessage: string;
		maxChars: number;
		onStreamText?: (text: string) => void;
	}) => {
		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => {
			controller.abort();
		}, timeoutMs);

		try {
			const response = await fetch(aiApi.askAi, {
				headers: buildAiHeaders(),
				method: 'POST',
				mode: 'cors',
				credentials: 'same-origin',
				redirect: 'follow',
				referrerPolicy: 'no-referrer',
				signal: controller.signal,
				body: JSON.stringify({
					enable_mcp: false,
					model_id: modelId,
					messages: [
						{
							chat_id: generateUUID(),
							role: 'user',
							content: prompt,
						},
					],
				}),
			});

			if (response.status !== 200) {
				let errorMessage = t('something_wrong');
				try {
					errorMessage = (await response.json()).message || errorMessage;
				} catch (error) {
					console.error(error);
				}
				throw new Error(errorMessage);
			}

			return clampContinuationText(
				await readAiTextResponse(response, {
					maxChars,
					onStreamText,
				}),
				maxChars,
			);
		} catch (error) {
			if ((error as DOMException)?.name === 'AbortError') {
				throw new Error(timeoutMessage);
			}
			throw error;
		} finally {
			window.clearTimeout(timeoutId);
		}
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
			if (
				controller.signal.aborted ||
				(error as DOMException)?.name === 'AbortError'
			) {
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

	const ensureFullDocumentAiReady = (emptyMessage: string) => {
		const markdown = normalizeEditorMarkdown(editor?.getMarkdown() ?? '');
		if (!markdown.trim()) {
			toast.error(emptyMessage);
			return null;
		}
		if (!selectedContinuationModelId) {
			toast.error(t('editor_continue_select_model_first'));
			return null;
		}
		if (
			selectedContinuationModelId === mainUserInfo?.default_revornix_model_id &&
			!revornixModel.accessible
		) {
			toast.error(
				revornixModel.subscriptionLocked
					? t('revornix_ai_access_hint')
					: t('editor_default_chat_model_unavailable'),
			);
			return null;
		}
		return {
			markdown,
			modelId: selectedContinuationModelId,
		};
	};

	const optimizeFullDocument = async () => {
		const ready = ensureFullDocumentAiReady(t('editor_full_optimize_empty'));
		if (!ready || !editor) {
			return;
		}

		setIsOptimizingDocument(true);
		try {
			const optimizedMarkdown = normalizeEditorMarkdown(
				await requestAiText({
					prompt: [
						FULL_DOCUMENT_OPTIMIZE_PROMPT,
						'原始 Markdown：',
						ready.markdown,
					].join('\n\n'),
					modelId: ready.modelId,
					timeoutMs: AI_FULL_DOCUMENT_TIMEOUT_MS,
					timeoutMessage: t('editor_full_optimize_timeout'),
					maxChars: Math.max(
						AI_OPTIMIZED_MARKDOWN_MAX_CHARS,
						ready.markdown.length * 2,
					),
				}),
			);
			if (!optimizedMarkdown) {
				throw new Error(t('editor_full_optimize_empty_result'));
			}
			editor.commands.setContent(optimizedMarkdown, {
				contentType: 'markdown',
			});
			onChange?.(optimizedMarkdown);
			setIsFullOptimizeDialogOpen(false);
			toast.success(t('editor_full_optimize_success'));
		} catch (error: any) {
			console.error(error);
			toast.error(error?.message || t('editor_full_optimize_failed'));
		} finally {
			setIsOptimizingDocument(false);
		}
	};

	const findImageMarkerRange = (id: string) => {
		if (!editor) {
			return null;
		}

		const marker = `[image-id: ${id}]`;
		let result: { from: number; to: number } | null = null;
		editor.state.doc.descendants((node, pos) => {
			if (node.isBlock && node.textContent.trim() === marker) {
				result = {
					from: pos,
					to: pos + node.nodeSize,
				};
				return false;
			}
			return true;
		});
		return result;
	};

	const insertDocumentIllustrationPlaceholders = ({
		markdownWithMarkers,
		plans,
	}: {
		markdownWithMarkers: string;
		plans: FullDocumentImagePlan[];
	}) => {
		if (!editor) {
			throw new Error(t('editor_continue_insert_failed'));
		}

		const placeholderIdByPlanId = new Map<string, string>();
		const nextMarkdown = normalizeEditorMarkdown(markdownWithMarkers);
		editor.commands.setContent(nextMarkdown, {
			contentType: 'markdown',
		});

		for (const plan of plans) {
			const range = findImageMarkerRange(plan.id);
			if (!range) {
				continue;
			}

			const placeholderId = generateUUID();
			editor.commands.insertContentAt(range, {
				type: 'aiIllustrationPlaceholder',
				attrs: {
					id: placeholderId,
					message: t('editor_illustration_waiting_inline'),
				},
			});
			placeholderIdByPlanId.set(plan.id, placeholderId);
		}

		return placeholderIdByPlanId;
	};

	const generateFullDocumentIllustration = async () => {
		const ready = ensureFullDocumentAiReady(
			t('editor_full_illustration_empty'),
		);
		if (!ready) {
			return;
		}
		if (!selectedIllustrationEngineId) {
			toast.error(t('editor_illustration_select_engine_first'));
			return;
		}
		if (
			selectedIllustrationEngineId ===
				mainUserInfo?.default_image_generate_engine_id &&
			!imageGenerateEngine.accessible
		) {
			toast.error(
				imageGenerateEngine.subscriptionLocked
					? t('section_form_auto_illustration_engine_unset')
					: t('editor_default_illustration_engine_unavailable'),
			);
			return;
		}
		if (
			!mainUserInfo?.default_user_file_system ||
			!userFileSystemDetail?.file_system_id
		) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}

		setIsGeneratingDocumentIllustration(true);
		try {
			const planText = await requestAiText({
				prompt: [
					FULL_DOCUMENT_IMAGE_PLANNER_PROMPT,
					'INPUT_JSON:',
					JSON.stringify(
						{
							markdown: ready.markdown,
							entities: [],
							relations: [],
							constraints: {
								max_images: AI_FULL_DOCUMENT_MAX_IMAGES,
								prefer: ['diagram', 'infographic', 'conceptual illustration'],
								avoid: [
									'pure decoration',
									'irrelevant portraits',
									'text-heavy posters',
								],
							},
						},
						null,
						2,
					),
				].join('\n\n'),
				modelId: ready.modelId,
				timeoutMs: AI_IMAGE_PLAN_TIMEOUT_MS,
				timeoutMessage: t('editor_full_illustration_prompt_timeout'),
				maxChars: Math.max(
					AI_IMAGE_PLAN_MAX_CHARS,
					ready.markdown.length + 8000,
				),
			});
			const imagePlan = normalizeImagePlanResult(planText, ready.markdown);
			if (imagePlan.plans.length === 0) {
				toast.info(t('editor_full_illustration_no_plan'));
				setIsFullIllustrationDialogOpen(false);
				return;
			}

			const currentMarkdown = normalizeEditorMarkdown(
				editor?.getMarkdown() ?? '',
			);
			if (currentMarkdown !== ready.markdown) {
				throw new Error(t('editor_full_illustration_document_changed'));
			}

			const placeholderIdByPlanId = insertDocumentIllustrationPlaceholders({
				markdownWithMarkers: imagePlan.markdown_with_markers,
				plans: imagePlan.plans,
			});
			setIsFullIllustrationDialogOpen(false);

			const fileService = new FileService(userFileSystemDetail.file_system_id);
			for (const plan of imagePlan.plans) {
				const placeholderId = placeholderIdByPlanId.get(plan.id);
				if (!placeholderId) {
					continue;
				}

				try {
					const image = await withTimeout(
						(signal) =>
							generateImageWithDefaultEngine(
								{
									prompt: plan.prompt,
									engine_id: selectedIllustrationEngineId,
								},
								signal,
							),
						AI_ILLUSTRATION_TIMEOUT_MS,
						t('editor_illustration_timeout'),
					);
					const extension =
						image.data_url.match(
							/^data:image\/([a-zA-Z0-9+.-]+);base64,/,
						)?.[1] ?? 'png';
					const normalizedExtension =
						extension === 'svg+xml' ? 'svg' : extension;
					const file = await decodeDataUrlToFile(
						image.data_url,
						`article-illustration-${plan.id}.${normalizedExtension}`,
					);
					const filePath = `images/quick-note/${generateUUID()}.${normalizedExtension}`;
					await fileService.uploadFile(filePath, file);
					const replaced = replaceIllustrationPlaceholder(placeholderId, {
						type: 'image',
						attrs: {
							src: filePath,
							alt: plan.prompt.slice(0, 80),
						},
					});
					if (!replaced) {
						toast.info(t('editor_illustration_placeholder_removed'));
					}
				} catch (imageError) {
					console.error(imageError);
					updateIllustrationPlaceholder(
						placeholderId,
						t('editor_full_illustration_image_failed', { id: plan.id }),
						'error',
					);
				}
			}

			toast.success(t('editor_full_illustration_success'));
		} catch (error: any) {
			console.error(error);
			toast.error(error?.message || t('editor_full_illustration_failed'));
		} finally {
			setIsGeneratingDocumentIllustration(false);
		}
	};

	const requestAiContinuation = async () => {
		const selectionContext =
			aiSelectionRef.current?.context?.trim() || getSelectedContext();
		if (!selectionContext) {
			toast.error(t('editor_continue_select_text_first'));
			return;
		}
		if (!selectedContinuationModelId) {
			toast.error(t('editor_continue_select_model_first'));
			return;
		}
		if (
			selectedContinuationModelId === mainUserInfo?.default_revornix_model_id &&
			!revornixModel.accessible
		) {
			toast.error(
				revornixModel.subscriptionLocked
					? t('revornix_ai_access_hint')
					: t('editor_default_chat_model_unavailable'),
			);
			return;
		}

		setIsContinuing(true);
		setContinuePreview('');
		setIsContinueDialogOpen(false);
		let latestContinuationPreview = '';
		try {
			const insertionTarget = getContinuationInsertionTarget();
			if (!editor || insertionTarget === null) {
				throw new Error(t('editor_continue_insert_failed'));
			}

			const placeholderId = generateUUID();
			activeContinuationPlaceholderIdRef.current = placeholderId;
			hasStreamedContinuationRef.current = false;
			insertContinuationPlaceholder({
				placeholderId,
				position: insertionTarget,
				message: t('editor_continue_waiting_inline'),
			});

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
						model_id: selectedContinuationModelId,
						messages: [
							{
								chat_id: generateUUID(),
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
				let errorMessage = t('editor_continue_failed');
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
						hasStreamedContinuationRef.current = true;
						latestContinuationPreview = clampContinuationText(
							text,
							AI_CONTINUATION_MAX_CHARS,
						);
						setContinuePreview(text);
						updateContinuationPlaceholder({
							placeholderId,
							message: t('editor_continue_waiting_inline'),
							preview: latestContinuationPreview,
						});
					},
				}),
				AI_CONTINUATION_MAX_CHARS,
			);
			if (!continuation) {
				throw new Error(t('editor_continue_empty_result'));
			}

			const replaced = replaceContinuationPlaceholder(
				placeholderId,
				continuation,
			);
			if (!replaced) {
				toast.info(t('editor_continue_placeholder_removed'));
			}
			setContinueInstruction('');
			setContinuePreview('');
		} catch (error: any) {
			if ((error as DOMException)?.name === 'AbortError') {
				if (!hasStreamedContinuationRef.current) {
					clearStreamingContinuation();
				}
				if (continueAbortReasonRef.current === 'timeout') {
					toast.error(t('editor_continue_timeout'));
				}
				return;
			}
			if (!hasStreamedContinuationRef.current) {
				clearStreamingContinuation();
			} else if (activeContinuationPlaceholderIdRef.current) {
				updateContinuationPlaceholder({
					placeholderId: activeContinuationPlaceholderIdRef.current,
					message: error?.message || t('editor_continue_failed'),
					preview: latestContinuationPreview,
					status: 'error',
				});
			}
			console.error(error);
			toast.error(error?.message || t('editor_continue_failed'));
		} finally {
			hasStreamedContinuationRef.current = false;
			continueAbortControllerRef.current = null;
			continueAbortReasonRef.current = null;
			activeContinuationPlaceholderIdRef.current = null;
			setIsContinuing(false);
		}
	};

	const generateIllustration = async () => {
		const prompt = illustrationPrompt.trim();
		if (!prompt) {
			toast.error(t('editor_illustration_prompt_required'));
			return;
		}
		if (!selectedIllustrationEngineId) {
			toast.error(t('editor_illustration_select_engine_first'));
			return;
		}
		if (
			selectedIllustrationEngineId ===
				mainUserInfo?.default_image_generate_engine_id &&
			!imageGenerateEngine.accessible
		) {
			toast.error(
				imageGenerateEngine.subscriptionLocked
					? t('section_form_auto_illustration_engine_unset')
					: t('editor_default_illustration_engine_unavailable'),
			);
			return;
		}
		if (
			!mainUserInfo?.default_user_file_system ||
			!userFileSystemDetail?.file_system_id
		) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}

		setIsGeneratingIllustration(true);
		const placeholderId = generateUUID();
		try {
			const insertionTarget = getContinuationInsertionTarget();
			if (!editor || insertionTarget === null) {
				throw new Error('无法插入生成图片');
			}
			editor
				.chain()
				.focus()
				.insertContentAt(insertionTarget, {
					type: 'aiIllustrationPlaceholder',
					attrs: {
						id: placeholderId,
						message: t('editor_illustration_waiting_inline'),
					},
				})
				.run();
			setIsIllustrationDialogOpen(false);

			const image = await withTimeout(
				(signal) =>
					generateImageWithDefaultEngine(
						{
							prompt,
							engine_id: selectedIllustrationEngineId,
						},
						signal,
					),
				AI_ILLUSTRATION_TIMEOUT_MS,
				t('editor_illustration_timeout'),
			);
			const extension =
				image.data_url.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/)?.[1] ??
				'png';
			const normalizedExtension = extension === 'svg+xml' ? 'svg' : extension;
			const file = await decodeDataUrlToFile(
				image.data_url,
				`illustration-${generateUUID()}.${normalizedExtension}`,
			);
			const filePath = `images/quick-note/${generateUUID()}.${normalizedExtension}`;
			const fileService = new FileService(userFileSystemDetail.file_system_id);
			await fileService.uploadFile(filePath, file);

			const replaced = replaceIllustrationPlaceholder(placeholderId, {
				type: 'image',
				attrs: {
					src: filePath,
					alt: prompt.slice(0, 80),
				},
			});
			if (!replaced) {
				toast.info(t('editor_illustration_placeholder_removed'));
			}
		} catch (error: any) {
			console.error(error);
			updateIllustrationPlaceholder(
				placeholderId,
				error?.message || t('editor_full_illustration_failed'),
				'error',
			);
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
		if (file.size > IMAGE_MAX_UPLOAD_BYTES) {
			toast.error(
				t('file_upload_size_exceeded', {
					size: formatUploadSize(IMAGE_MAX_UPLOAD_BYTES),
				}),
			);
			event.target.value = '';
			return;
		}

		if (
			!mainUserInfo?.default_user_file_system ||
			!userFileSystemDetail?.file_system_id
		) {
			toast.error(t('error_default_file_system_not_found'));
			event.target.value = '';
			return;
		}

		setIsUploadingImage(true);
		try {
			const suffix = file.name.split('.').pop();
			const filePath = suffix
				? `images/quick-note/${generateUUID()}.${suffix}`
				: `images/quick-note/${generateUUID()}`;
			const fileService = new FileService(userFileSystemDetail.file_system_id);
			await fileService.uploadFile(filePath, file);
			editor
				?.chain()
				.focus()
				.insertContent({
					type: 'image',
					attrs: {
						src: filePath,
						alt: file.name,
					},
				})
				.run();
		} catch (error) {
			console.error(error);
			toast.error(t('error_upload_image_failed'));
		} finally {
			setIsUploadingImage(false);
			event.target.value = '';
		}
	};

	const triggerFileAttachmentPicker = () => {
		fileAttachmentInputRef.current?.click();
	};

	const handleFileAttachmentUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		if (file.size > FILE_ATTACHMENT_MAX_UPLOAD_BYTES) {
			toast.error(
				t('file_upload_size_exceeded', {
					size: formatUploadSize(FILE_ATTACHMENT_MAX_UPLOAD_BYTES),
				}),
			);
			event.target.value = '';
			return;
		}

		if (
			!mainUserInfo?.default_user_file_system ||
			!userFileSystemDetail?.file_system_id
		) {
			toast.error(t('error_default_file_system_not_found'));
			event.target.value = '';
			return;
		}

		setIsUploadingFileAttachment(true);
		try {
			const dotIndex = file.name.lastIndexOf('.');
			const suffix =
				dotIndex > 0 && dotIndex < file.name.length - 1
					? file.name.slice(dotIndex + 1).toLowerCase()
					: '';
			const filePath = suffix
				? `files/quick-note/${generateUUID()}.${suffix}`
				: `files/quick-note/${generateUUID()}`;
			const fileService = new FileService(userFileSystemDetail.file_system_id);
			await fileService.uploadFile(filePath, file);
			editor
				?.chain()
				.focus()
				.insertContent({
					type: 'fileAttachment',
					attrs: {
						src: filePath,
						name: file.name,
						mime: file.type || '',
						size: file.size,
					},
				})
				.run();
		} catch (error) {
			console.error(error);
			toast.error(t('editor_file_attachment_upload_failed'));
		} finally {
			setIsUploadingFileAttachment(false);
			event.target.value = '';
		}
	};

	const showFullscreen = fullscreen ?? isFallbackFullscreen;
	const fullscreenLabel = showFullscreen
		? t('exit_fullscreen')
		: t('enter_fullscreen');
	const slashMenuItems = useMemo<SlashMenuItem[]>(
		() => [
			{
				id: 'paragraph',
				label: t('editor_slash_paragraph'),
				description: t('editor_slash_paragraph_description'),
				keywords: ['text', 'paragraph', 'p', '正文', '段落'],
				icon: Type,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.setParagraph()
						.run(),
			},
			{
				id: 'heading-1',
				label: t('editor_toolbar_heading_1'),
				description: t('editor_slash_heading_1_description'),
				keywords: ['h1', 'title', 'heading', '标题', '一级标题'],
				icon: Heading1,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.toggleHeading({ level: 1 })
						.run(),
			},
			{
				id: 'heading-2',
				label: t('editor_toolbar_heading_2'),
				description: t('editor_slash_heading_2_description'),
				keywords: ['h2', 'subtitle', 'heading', '标题', '二级标题'],
				icon: Heading2,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.toggleHeading({ level: 2 })
						.run(),
			},
			{
				id: 'bullet-list',
				label: t('editor_toolbar_bullet_list'),
				description: t('editor_slash_bullet_list_description'),
				keywords: ['ul', 'bullet', 'list', '无序', '列表'],
				icon: List,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.toggleBulletList()
						.run(),
			},
			{
				id: 'ordered-list',
				label: t('editor_toolbar_ordered_list'),
				description: t('editor_slash_ordered_list_description'),
				keywords: ['ol', 'number', 'list', '有序', '编号', '列表'],
				icon: ListOrdered,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.toggleOrderedList()
						.run(),
			},
			{
				id: 'blockquote',
				label: t('editor_slash_blockquote'),
				description: t('editor_slash_blockquote_description'),
				keywords: ['quote', 'blockquote', '引用'],
				icon: Quote,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.toggleBlockquote()
						.run(),
			},
			{
				id: 'code-block',
				label: t('editor_toolbar_code_block'),
				description: t('editor_slash_code_block_description'),
				keywords: ['code', 'pre', '代码', '代码块'],
				icon: Code2,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.toggleCodeBlock()
						.run(),
			},
			{
				id: 'horizontal-rule',
				label: t('editor_slash_horizontal_rule'),
				description: t('editor_slash_horizontal_rule_description'),
				keywords: ['hr', 'divider', 'rule', '分割线', '分隔线'],
				icon: Minus,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.setHorizontalRule()
						.run(),
			},
			{
				id: 'image',
				label: t('editor_toolbar_label_image'),
				description: t('editor_slash_image_description'),
				keywords: ['image', 'upload', 'picture', '图片', '上传'],
				icon: ImagePlus,
				disabled: !enableImageUpload || isUploadingImage,
				run: ({ editor, match }) => {
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.run();
					openImagePicker();
				},
			},
			{
				id: 'drawing',
				label: t('editor_toolbar_label_drawing'),
				description: t('editor_slash_drawing_description'),
				keywords: ['draw', 'drawing', 'canvas', '手绘', '画板'],
				icon: PencilRuler,
				disabled: !enableDrawing,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.insertContent({
							type: 'drawing',
						})
						.run(),
			},
			{
				id: 'table',
				label: t('editor_toolbar_label_table'),
				description: t('editor_slash_table_description'),
				keywords: ['table', 'grid', '表格'],
				icon: Table2,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.insertContent({
							type: 'tableNode',
						})
						.run(),
			},
			{
				id: 'map',
				label: t('editor_toolbar_label_map'),
				description: t('editor_slash_map_description'),
				keywords: ['map', 'location', '地图', '位置'],
				icon: MapPinned,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.insertContent({
							type: 'mapEmbed',
							attrs: {
								provider: DEFAULT_NEW_MAP_PROVIDER,
								query: 'Shanghai',
								zoom: '13',
							},
						})
						.run(),
			},
			{
				id: 'callout',
				label: t('editor_toolbar_label_callout'),
				description: t('editor_slash_callout_description'),
				keywords: ['callout', 'note', 'tip', 'warning', 'caution', 'important', 'alert', '提示', '注意'],
				icon: Info,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.insertContent({
							type: 'callout',
							attrs: { type: 'NOTE' },
							content: [
								{ type: 'paragraph' },
							],
						})
						.run(),
			},
			{
				id: 'file-attachment',
				label: t('editor_toolbar_label_file_attachment'),
				description: t('editor_slash_file_attachment_description'),
				keywords: ['file', 'attachment', 'upload', 'download', '附件', '文件'],
				icon: Paperclip,
				disabled: isUploadingFileAttachment,
				run: ({ editor, match }) => {
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.run();
					triggerFileAttachmentPicker();
				},
			},
			{
				id: 'formula',
				label: t('editor_toolbar_label_formula'),
				description: t('editor_slash_formula_description'),
				keywords: ['math', 'formula', 'latex', '公式'],
				icon: Sigma,
				run: ({ editor, match }) =>
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.insertContent({
							type: 'mathBlock',
							attrs: { formula: '\\int_0^1 x^2 \\\\, dx' },
						})
						.run(),
			},
			{
				id: 'ai-continue',
				label: t('editor_toolbar_continue'),
				description: t('editor_slash_ai_continue_description'),
				keywords: ['ai', 'continue', 'write', '续写', '智能'],
				icon: MessageSquarePlus,
				disabled: isContinuing,
				run: ({ editor, match }) => {
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.run();
					openContinueDialog();
				},
			},
			{
				id: 'ai-optimize',
				label: t('editor_toolbar_optimize_full'),
				description: t('editor_slash_ai_optimize_description'),
				keywords: ['ai', 'optimize', 'rewrite', '优化', '全文'],
				icon: FilePenLine,
				disabled: isOptimizingDocument || isGeneratingDocumentIllustration,
				run: ({ editor, match }) => {
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.run();
					setIsFullOptimizeDialogOpen(true);
				},
			},
			{
				id: 'ai-illustration',
				label: t('editor_toolbar_full_illustration'),
				description: t('editor_slash_ai_illustration_description'),
				keywords: ['ai', 'illustration', 'image', '配图', '插图', '全文'],
				icon: Sparkles,
				disabled: isGeneratingDocumentIllustration || isOptimizingDocument,
				run: ({ editor, match }) => {
					editor
						.chain()
						.focus()
						.deleteRange(match.range)
						.setTextSelection(match.range.from)
						.run();
					setIsFullIllustrationDialogOpen(true);
				},
			},
		],
		[
			editor,
			enableDrawing,
			enableImageUpload,
			isContinuing,
			isGeneratingDocumentIllustration,
			isOptimizingDocument,
			isUploadingFileAttachment,
			isUploadingImage,
			t,
		],
	);
	const filteredSlashMenuItems = useMemo(() => {
		const normalizedQuery = slashMenu.query.trim().toLowerCase();
		if (!normalizedQuery) {
			return slashMenuItems;
		}

		return slashMenuItems.filter((item) =>
			[item.label, item.description, ...item.keywords]
				.join(' ')
				.toLowerCase()
				.includes(normalizedQuery),
		);
	}, [slashMenu.query, slashMenuItems]);
	const normalizedSlashSelectedIndex = Math.min(
		slashMenu.selectedIndex,
		Math.max(filteredSlashMenuItems.length - 1, 0),
	);

	useEffect(() => {
		slashMenuItemsRef.current = filteredSlashMenuItems;
		slashMenuItemRefs.current = slashMenuItemRefs.current.slice(
			0,
			filteredSlashMenuItems.length,
		);
		if (
			slashMenu.open &&
			slashMenu.selectedIndex !== normalizedSlashSelectedIndex
		) {
			setSlashMenu((current) => ({
				...current,
				selectedIndex: normalizedSlashSelectedIndex,
			}));
		}
	}, [
		filteredSlashMenuItems,
		normalizedSlashSelectedIndex,
		slashMenu.open,
		slashMenu.selectedIndex,
	]);

	useEffect(() => {
		if (!slashMenu.open) {
			return;
		}

		slashMenuItemRefs.current[
			normalizedSlashSelectedIndex
		]?.scrollIntoView({
			block: 'nearest',
		});
	}, [normalizedSlashSelectedIndex, slashMenu.open]);

	const editorShell = (
		<div
			className={cn(
				'relative flex h-full min-h-[360px] w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background lg:min-h-0',
				showFullscreen && 'rounded-none border-0 bg-background shadow-none',
				className,
			)}>
			<div className='flex items-center gap-2 border-b border-border/60 bg-muted/30 px-2 py-1.5'>
				<div className='min-w-0 flex-1 overflow-x-auto'>
					<div className='flex w-max items-center gap-1 pr-2'>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isBoldActive,
							)}
							title={t('editor_toolbar_bold')}
							aria-pressed={resolvedToolbarState.isBoldActive}
							onMouseDown={preserveEditorSelection}
							onClick={() => editor?.chain().focus().toggleBold().run()}>
							<Bold className='size-4' />
						</Button>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isItalicActive,
							)}
							title={t('editor_toolbar_italic')}
							aria-pressed={resolvedToolbarState.isItalicActive}
							onMouseDown={preserveEditorSelection}
							onClick={() => editor?.chain().focus().toggleItalic().run()}>
							<Italic className='size-4' />
						</Button>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isUnderlineActive,
							)}
							title={t('editor_toolbar_underline')}
							aria-pressed={resolvedToolbarState.isUnderlineActive}
							onMouseDown={preserveEditorSelection}
							onClick={() => editor?.chain().focus().toggleUnderline().run()}>
							<Underline className='size-4' />
						</Button>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isStrikeActive,
							)}
							title={t('editor_toolbar_strike')}
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
									title={t('editor_text_color')}
									onMouseDown={preserveEditorSelection}>
									<Type className='size-3.5' />
									<span>{t('editor_text_color')}</span>
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
								className='w-56 space-y-3 p-3'
								onOpenAutoFocus={(event) => event.preventDefault()}>
								<div className='space-y-2'>
									<p className='text-xs font-medium text-muted-foreground'>
										{t('editor_text_color')}
									</p>
									<div className='flex flex-wrap gap-2'>
										{TEXT_COLORS.map((color) => (
											<button
												key={color}
												type='button'
												className={cn(
													'size-6 rounded-full border transition-transform hover:scale-110',
													resolvedToolbarState.activeTextColor === color
														? 'border-foreground ring-2 ring-ring/40'
														: 'border-border/60',
												)}
												style={{ backgroundColor: color }}
												title={`${t('editor_text_color')} ${color}`}
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
									title={t('editor_clear_text_color')}
									onMouseDown={(event) => event.preventDefault()}
									onClick={clearTextColor}>
									{t('editor_clear_text_color')}
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
									title={t('editor_highlight')}
									onMouseDown={preserveEditorSelection}>
									<Highlighter className='size-3.5' />
									<span>{t('editor_highlight')}</span>
									<span
										className='size-3 rounded-sm border border-border/70'
										style={{
											backgroundColor:
												resolvedToolbarState.activeHighlightColor ??
												'transparent',
										}}
									/>
								</Button>
							</PopoverTrigger>
							<PopoverContent
								align='start'
								className='w-56 space-y-3 p-3'
								onOpenAutoFocus={(event) => event.preventDefault()}>
								<div className='space-y-2'>
									<p className='text-xs font-medium text-muted-foreground'>
										{t('editor_highlight_color')}
									</p>
									<div className='flex flex-wrap gap-2'>
										{HIGHLIGHT_COLORS.map((color) => (
											<button
												key={color}
												type='button'
												className={cn(
													'size-6 rounded-md border transition-transform hover:scale-110',
													resolvedToolbarState.activeHighlightColor === color
														? 'border-foreground ring-2 ring-ring/40'
														: 'border-border/60',
												)}
												style={{ backgroundColor: color }}
												title={`${t('editor_highlight_color')} ${color}`}
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
									title={t('editor_clear_highlight_color')}
									onMouseDown={(event) => event.preventDefault()}
									onClick={clearHighlightColor}>
									{t('editor_clear_highlight_color')}
								</Button>
							</PopoverContent>
						</Popover>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isHeading1Active,
							)}
							title={t('editor_toolbar_heading_1')}
							aria-pressed={resolvedToolbarState.isHeading1Active}
							onMouseDown={preserveEditorSelection}
							onClick={() =>
								editor?.chain().focus().toggleHeading({ level: 1 }).run()
							}>
							<Heading1 className='size-4' />
						</Button>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isHeading2Active,
							)}
							title={t('editor_toolbar_heading_2')}
							aria-pressed={resolvedToolbarState.isHeading2Active}
							onMouseDown={preserveEditorSelection}
							onClick={() =>
								editor?.chain().focus().toggleHeading({ level: 2 }).run()
							}>
							<Heading2 className='size-4' />
						</Button>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isBulletListActive,
							)}
							title={t('editor_toolbar_bullet_list')}
							aria-pressed={resolvedToolbarState.isBulletListActive}
							onMouseDown={preserveEditorSelection}
							onClick={() => editor?.chain().focus().toggleBulletList().run()}>
							<List className='size-4' />
						</Button>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isOrderedListActive,
							)}
							title={t('editor_toolbar_ordered_list')}
							aria-pressed={resolvedToolbarState.isOrderedListActive}
							onMouseDown={preserveEditorSelection}
							onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
							<ListOrdered className='size-4' />
						</Button>
						<Button
							type='button'
							variant='ghost'
							size='icon'
							className={getToolbarButtonClassName(
								resolvedToolbarState.isCodeBlockActive,
							)}
							title={t('editor_toolbar_code_block')}
							aria-pressed={resolvedToolbarState.isCodeBlockActive}
							onMouseDown={preserveEditorSelection}
							onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
							<Code2 className='size-4' />
						</Button>
						<div className='mx-1 h-4 w-px shrink-0 bg-border/60' />
						{enableImageUpload && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type='button'
										variant='ghost'
										className={getToolbarActionButtonClassName()}
										title={t('editor_toolbar_upload_image')}
										onMouseDown={preserveEditorSelection}
										onClick={openImagePicker}
										disabled={isUploadingImage}>
										{isUploadingImage ? (
											<Loader2 className='size-4 animate-spin' />
										) : (
											<ImagePlus className='size-4' />
										)}
										<span>{t('editor_toolbar_label_image')}</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{t('upload_limit_hint', {
										size: formatUploadSize(IMAGE_MAX_UPLOAD_BYTES),
									})}
								</TooltipContent>
							</Tooltip>
						)}
						{enableDrawing && (
							<Button
								type='button'
								variant='ghost'
								className={getToolbarActionButtonClassName()}
								title={t('editor_toolbar_insert_drawing')}
								onMouseDown={preserveEditorSelection}
								onClick={insertDrawingNode}>
								<PencilRuler className='size-4' />
								<span>{t('editor_toolbar_label_drawing')}</span>
							</Button>
						)}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type='button'
									variant='ghost'
									className={getToolbarActionButtonClassName()}
									title={t('editor_toolbar_label_file_attachment')}
									onMouseDown={preserveEditorSelection}
									onClick={triggerFileAttachmentPicker}
									disabled={isUploadingFileAttachment}>
									{isUploadingFileAttachment ? (
										<Loader2 className='size-4 animate-spin' />
									) : (
										<Paperclip className='size-4' />
									)}
									<span>{t('editor_toolbar_label_file_attachment')}</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{t('upload_limit_hint', {
									size: formatUploadSize(FILE_ATTACHMENT_MAX_UPLOAD_BYTES),
								})}
							</TooltipContent>
						</Tooltip>
						<Button
							type='button'
							variant='ghost'
							className={getToolbarActionButtonClassName()}
							title={t('editor_toolbar_label_callout')}
							onMouseDown={preserveEditorSelection}
							onClick={insertCalloutNode}>
							<Info className='size-4' />
							<span>{t('editor_toolbar_label_callout')}</span>
						</Button>
						<Button
							type='button'
							variant='ghost'
							className={getToolbarActionButtonClassName()}
							title={t('editor_toolbar_insert_table')}
							onMouseDown={preserveEditorSelection}
							onClick={insertTableNode}>
							<Table2 className='size-4' />
							<span>{t('editor_toolbar_label_table')}</span>
						</Button>
						<Button
							type='button'
							variant='ghost'
							className={getToolbarActionButtonClassName()}
							title={t('editor_toolbar_insert_map')}
							onMouseDown={preserveEditorSelection}
							onClick={insertMapNode}>
							<MapPinned className='size-4' />
							<span>{t('editor_toolbar_label_map')}</span>
						</Button>
						<Button
							type='button'
							variant='ghost'
							className={getToolbarActionButtonClassName()}
							title={t('editor_toolbar_insert_formula')}
							onMouseDown={preserveEditorSelection}
							onClick={() =>
								editor
									?.chain()
									.focus()
									.insertContent({
										type: 'mathBlock',
										attrs: { formula: '\\int_0^1 x^2 \\\\, dx' },
									})
									.run()
							}>
							<Sigma className='size-4 rotate-180' />
							<span>{t('editor_toolbar_label_formula')}</span>
						</Button>
						<div className='mx-1 h-4 w-px shrink-0 bg-border/60' />
						<Button
							type='button'
							variant='ghost'
							className={getToolbarActionButtonClassName()}
							title={
								isContinuing
									? t('editor_continue_generating')
									: t('editor_toolbar_continue')
							}
							onMouseDown={preserveEditorSelection}
							onClick={openContinueDialog}
							disabled={isContinuing}>
							{isContinuing ? (
								<Loader2 className='size-4 animate-spin' />
							) : (
								<MessageSquarePlus className='size-4' />
							)}
							<span>{t('editor_toolbar_continue')}</span>
						</Button>
						{isContinuing ? (
							<Button
								type='button'
								variant='ghost'
								className={getToolbarActionButtonClassName()}
								title={t('editor_continue_stop')}
								onMouseDown={preserveEditorSelection}
								onClick={stopAiContinuation}>
								<Square className='size-3.5 fill-current' />
								<span>{t('editor_toolbar_stop')}</span>
							</Button>
						) : null}
						<Button
							type='button'
							variant='ghost'
							className={getToolbarActionButtonClassName()}
							title={t('editor_full_optimize')}
							onMouseDown={preserveEditorSelection}
							onClick={() => {
								setIsFullOptimizeDialogOpen(true);
							}}
							disabled={
								isOptimizingDocument || isGeneratingDocumentIllustration
							}>
							{isOptimizingDocument ? (
								<Loader2 className='size-4 animate-spin' />
							) : (
								<FilePenLine className='size-4' />
							)}
							<span>{t('editor_toolbar_optimize_full')}</span>
						</Button>
						<Button
							type='button'
							variant='ghost'
							className={getToolbarActionButtonClassName()}
							title={t('editor_illustration_title')}
							onMouseDown={preserveEditorSelection}
							onClick={openIllustrationDialog}
							disabled={isGeneratingIllustration}>
							{isGeneratingIllustration ? (
								<Loader2 className='size-4 animate-spin' />
							) : (
								<Sparkles className='size-4' />
							)}
							<span>{t('editor_toolbar_selection_illustration')}</span>
						</Button>
						<Button
							type='button'
							variant='ghost'
							className={getToolbarActionButtonClassName()}
							title={t('editor_full_illustration')}
							onMouseDown={preserveEditorSelection}
							onClick={() => {
								setIsFullIllustrationDialogOpen(true);
							}}
							disabled={
								isGeneratingDocumentIllustration || isOptimizingDocument
							}>
							{isGeneratingDocumentIllustration ? (
								<Loader2 className='size-4 animate-spin' />
							) : (
								<ImagePlus className='size-4' />
							)}
							<span>{t('editor_toolbar_full_illustration')}</span>
						</Button>
					</div>
				</div>
				<div className='shrink-0' />
				<div className='flex shrink-0 items-center gap-1 border-l border-border/60 pl-2'>
					{onFullscreenSave ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type='button'
									variant='ghost'
									className={getToolbarActionButtonClassName()}
									title={t('markdown_edit_fullscreen_save')}
									onMouseDown={preserveEditorSelection}
									onClick={onFullscreenSave}
									disabled={fullscreenSaveDisabled || fullscreenSaveLoading}>
									{fullscreenSaveLoading ? (
										<Loader2 className='size-4 animate-spin' />
									) : (
										<FilePenLine className='size-4' />
									)}
									<span>{t('save')}</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{t('markdown_edit_fullscreen_save_shortcut')}
							</TooltipContent>
						</Tooltip>
					) : null}
					{toolbarEnd}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type='button'
								variant='ghost'
								size='icon'
								className={getToolbarButtonClassName()}
								title={fullscreenLabel}
								onMouseDown={preserveEditorSelection}
								onClick={() => {
									void handleToggleFullscreen();
								}}>
								{showFullscreen ? (
									<Shrink className='size-4' />
								) : (
									<Expand className='size-4' />
								)}
								<span className='sr-only'>{fullscreenLabel}</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent>{fullscreenLabel}</TooltipContent>
					</Tooltip>
				</div>
				{enableImageUpload && (
					<input
						ref={imageInputRef}
						type='file'
						accept='image/*'
						className='hidden'
						onChange={handleImageUpload}
					/>
				)}
				<input
					ref={fileAttachmentInputRef}
					type='file'
					className='hidden'
					onChange={handleFileAttachmentUpload}
				/>
			</div>
			<EditorContent
				editor={editor}
				className='min-h-[260px] flex-1 overflow-auto p-4 lg:min-h-0 lg:p-5 [&_.ProseMirror]:mx-auto [&_.ProseMirror]:max-w-full md:[&_.ProseMirror]:max-w-[640px] lg:[&_.ProseMirror]:max-w-[800px] xl:[&_.ProseMirror]:max-w-[720px] 2xl:[&_.ProseMirror]:max-w-[960px] [&_.ProseMirror]:min-h-full [&_.ProseMirror]:w-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[0.95rem] [&_.ProseMirror]:leading-7 [&_.ProseMirror_>_:first-child]:mt-0 [&_.ProseMirror_>_:last-child]:mb-0 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p]:mt-0 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_hr]:my-5 [&_.ProseMirror_hr]:border-0 [&_.ProseMirror_hr]:border-t [&_.ProseMirror_hr]:border-zinc-300/70 dark:[&_.ProseMirror_hr]:border-zinc-500/60 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:border [&_.ProseMirror_code]:border-zinc-200 [&_.ProseMirror_code]:bg-zinc-100 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-zinc-900 dark:[&_.ProseMirror_code]:border-zinc-700 dark:[&_.ProseMirror_code]:bg-zinc-800 dark:[&_.ProseMirror_code]:text-zinc-100 [&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:border [&_.ProseMirror_pre]:border-zinc-200 [&_.ProseMirror_pre]:bg-zinc-100 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-zinc-900 dark:[&_.ProseMirror_pre]:border-zinc-700 dark:[&_.ProseMirror_pre]:bg-zinc-900 dark:[&_.ProseMirror_pre]:text-zinc-100 [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:text-inherit [&_.ProseMirror_pre_code]:leading-5 [&_.ProseMirror_u]:underline [&_.ProseMirror_mark]:rounded-[0.2rem] [&_.ProseMirror_mark]:px-0.5 [&_.ProseMirror_s]:text-muted-foreground [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:w-full [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-2xl [&_.ProseMirror_img]:object-cover [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]'
			/>
			{slashMenu.open && isMounted
				? createPortal(
						<div
							className='fixed z-[80] w-[320px] overflow-hidden rounded-lg border border-border/70 bg-popover text-popover-foreground shadow-xl'
							style={{
								top: slashMenu.position.top,
								left: slashMenu.position.left,
							}}
							onMouseDown={(event) => event.preventDefault()}>
							<div className='border-b border-border/60 px-3 py-2'>
								<p className='text-xs font-medium text-muted-foreground'>
									{t('editor_slash_title')}
								</p>
							</div>
							<div className='max-h-[min(22rem,calc(100vh-8rem))] overflow-y-auto p-1'>
								{filteredSlashMenuItems.length > 0 ? (
									filteredSlashMenuItems.map((item, index) => {
										const Icon = item.icon;
										const selected = index === normalizedSlashSelectedIndex;
										return (
											<button
												key={item.id}
												ref={(element) => {
													slashMenuItemRefs.current[index] = element;
												}}
												type='button'
												className={cn(
													'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm outline-none transition-colors',
													selected && 'bg-accent text-accent-foreground',
													item.disabled &&
														'cursor-not-allowed opacity-50 hover:bg-transparent',
													!selected &&
														!item.disabled &&
														'hover:bg-accent/60 hover:text-accent-foreground',
												)}
												disabled={item.disabled}
												onMouseEnter={() =>
													setSlashMenu((current) => ({
														...current,
														selectedIndex: index,
													}))
												}
												onClick={() => runSlashMenuItem(item)}>
												<span
													className={cn(
														'flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground',
														selected &&
															'border-accent-foreground/20 bg-accent-foreground/10 text-accent-foreground',
													)}>
													<Icon className='size-4' />
												</span>
												<span className='min-w-0 flex-1'>
													<span className='block truncate font-medium'>
														{item.label}
													</span>
													<span
														className={cn(
															'block truncate text-xs text-muted-foreground',
															selected && 'text-accent-foreground/75',
														)}>
														{item.description}
													</span>
												</span>
											</button>
										);
									})
								) : (
									<div className='px-3 py-6 text-center text-sm text-muted-foreground'>
										{t('editor_slash_empty')}
									</div>
								)}
							</div>
						</div>,
						document.body,
					)
				: null}
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
							{getSelectedContext() ||
								'当前没有可用上下文，请先选中文案或把光标放到目标段落中。'}
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
												: 'border-border/60 bg-background text-muted-foreground',
										)}
										onClick={() => setContinuePreset(option.id)}>
										{option.label}
									</Button>
								))}
							</div>
						</div>
						<div className='space-y-2'>
							<p className='text-sm font-medium text-foreground'>
								{t('use_model')}
							</p>
							<AIModelSelect
								value={selectedContinuationModelId}
								onChange={setSelectedContinuationModelId}
								disabled={isContinuing}
								className='w-full'
								placeholder={t('choose_continue_model')}
							/>
						</div>
						<Textarea
							value={continueInstruction}
							onChange={(event) => setContinueInstruction(event.target.value)}
							placeholder={t('editor_continue_instruction_placeholder')}
							className='min-h-28'
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setIsContinueDialogOpen(false)}
							disabled={isContinuing}>
							{t('cancel')}
						</Button>
						<Button
							type='button'
							onClick={requestAiContinuation}
							disabled={isContinuing}>
							{isContinuing ? (
								<>
									<Loader2 className='mr-2 size-4 animate-spin' />
									{t('editor_continue_generating')}
								</>
							) : (
								t('editor_continue_generate')
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<ResourceConfirmDialog
				open={isFullOptimizeDialogOpen}
				onOpenChange={setIsFullOptimizeDialogOpen}
				title={t('editor_full_optimize')}
				description={t('editor_full_optimize_description')}
				confirmLabel={t('editor_full_optimize')}
				confirmDisabled={!selectedContinuationModelId}
				confirmLoading={isOptimizingDocument}
				onConfirm={() => {
					void optimizeFullDocument();
				}}>
				<div className='space-y-2'>
					<p className='text-sm font-medium text-foreground'>
						{t('use_model')}
					</p>
					<AIModelSelect
						value={selectedContinuationModelId}
						onChange={setSelectedContinuationModelId}
						disabled={isOptimizingDocument}
						className='w-full'
						placeholder={t('setting_default_model_choose')}
					/>
				</div>
			</ResourceConfirmDialog>
			<ResourceConfirmDialog
				open={isFullIllustrationDialogOpen}
				onOpenChange={setIsFullIllustrationDialogOpen}
				title={t('editor_full_illustration')}
				description={t('editor_full_illustration_description')}
				confirmLabel={t('editor_full_illustration')}
				confirmDisabled={
					!selectedContinuationModelId || !selectedIllustrationEngineId
				}
				confirmLoading={isGeneratingDocumentIllustration}
				onConfirm={() => {
					void generateFullDocumentIllustration();
				}}>
				<div className='space-y-4'>
					<div className='space-y-2'>
						<p className='text-sm font-medium text-foreground'>
							{t('use_model')}
						</p>
						<AIModelSelect
							value={selectedContinuationModelId}
							onChange={setSelectedContinuationModelId}
							disabled={isGeneratingDocumentIllustration}
							className='w-full'
							placeholder={t('setting_default_model_choose')}
						/>
					</div>
					<div className='space-y-2'>
						<p className='text-sm font-medium text-foreground'>
							{t('use_engine')}
						</p>
						<ImageEngineSelect
							value={selectedIllustrationEngineId}
							onChange={setSelectedIllustrationEngineId}
							disabled={isGeneratingDocumentIllustration}
							className='w-full'
							placeholder={t('choose_illustration_engine')}
						/>
					</div>
				</div>
			</ResourceConfirmDialog>
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
						<DialogTitle>{t('editor_illustration_title')}</DialogTitle>
						<DialogDescription>
							{t('editor_illustration_description')}
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-3'>
						<div className='space-y-2'>
							<p className='text-sm font-medium text-foreground'>
								{t('use_engine')}
							</p>
							<ImageEngineSelect
								value={selectedIllustrationEngineId}
								onChange={setSelectedIllustrationEngineId}
								disabled={isGeneratingIllustration}
								className='w-full'
								placeholder={t('choose_illustration_engine')}
							/>
						</div>
						<Textarea
							value={illustrationPrompt}
							onChange={(event) => setIllustrationPrompt(event.target.value)}
							placeholder={t('editor_illustration_prompt_placeholder')}
							className='min-h-40'
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setIsIllustrationDialogOpen(false)}
							disabled={isGeneratingIllustration}>
							{t('cancel')}
						</Button>
						<Button
							type='button'
							onClick={generateIllustration}
							disabled={isGeneratingIllustration}>
							{isGeneratingIllustration ? (
								<>
									<Loader2 className='size-4 animate-spin' />
									{t('editor_illustration_generating')}
								</>
							) : (
								t('editor_illustration_generate')
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);

	if (showFullscreen && isMounted) {
		return createPortal(
			<div className='fixed inset-0 z-50 bg-background'>
				<div className='flex h-full w-full min-h-0'>{editorShell}</div>
			</div>,
			document.body,
		);
	}

	return editorShell;
};

export default TipTapEditor;
