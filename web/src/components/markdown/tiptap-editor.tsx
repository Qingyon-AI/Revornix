'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import {
	Bold,
	Code2,
	Heading1,
	Heading2,
	ImagePlus,
	List,
	ListOrdered,
	Loader2,
	PencilRuler,
	Table2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

import MermaidCodeBlock from './extensions/mermaid-code-block';
import ImageNode from './extensions/image-node';
import DrawingNode from './extensions/drawing-node';
import TableNode from './extensions/table-node';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import { FileService } from '@/lib/file';

type TipTapEditorProps = {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	enableImageUpload?: boolean;
	enableDrawing?: boolean;
	ownerId?: number;
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
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const imageInputRef = useRef<HTMLInputElement | null>(null);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
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
					className='size-8'
					onClick={() => editor?.chain().focus().toggleBold().run()}>
					<Bold className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='size-8'
					onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
					<Heading1 className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='size-8'
					onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
					<Heading2 className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='size-8'
					onClick={() => editor?.chain().focus().toggleBulletList().run()}>
					<List className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='size-8'
					onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
					<ListOrdered className='size-4' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='size-8'
					onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
					<Code2 className='size-4' />
				</Button>
				{enableImageUpload && (
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className='size-8'
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
						className='size-8'
						onClick={insertDrawingNode}>
						<PencilRuler className='size-4' />
					</Button>
				)}
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='size-8'
					onClick={insertTableNode}>
					<Table2 className='size-4' />
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
				className='min-h-0 flex-1 overflow-auto p-5 [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-7 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p]:mt-0 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:border [&_.ProseMirror_code]:border-zinc-200 [&_.ProseMirror_code]:bg-zinc-100 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-zinc-900 dark:[&_.ProseMirror_code]:border-zinc-700 dark:[&_.ProseMirror_code]:bg-zinc-800 dark:[&_.ProseMirror_code]:text-zinc-100 [&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:border [&_.ProseMirror_pre]:border-zinc-200 [&_.ProseMirror_pre]:bg-zinc-100 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-zinc-900 dark:[&_.ProseMirror_pre]:border-zinc-700 dark:[&_.ProseMirror_pre]:bg-zinc-900 dark:[&_.ProseMirror_pre]:text-zinc-100 [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:text-inherit [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:max-h-[32rem] [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-xl [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-border/60 [&_.ProseMirror_img]:object-contain [&_.ProseMirror.is-empty_p:first-child::before]:pointer-events-none [&_.ProseMirror.is-empty_p:first-child::before]:float-left [&_.ProseMirror.is-empty_p:first-child::before]:h-0 [&_.ProseMirror.is-empty_p:first-child::before]:text-muted-foreground [&_.ProseMirror.is-empty_p:first-child::before]:content-[attr(data-placeholder)]'
			/>
		</div>
	);
};

export default TipTapEditor;
