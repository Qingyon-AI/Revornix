'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';

import { Code2, Expand, Eye, Loader2, Shrink, SquarePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { normalizeEditorMarkdown } from '@/lib/editor-markdown';
import { cn } from '@/lib/utils';

import TipTapEditor from './tiptap-editor';
import TipTapMarkdownViewer from './tiptap-markdown-viewer';
import { Button } from '../ui/button';
import NoticeBox from '../ui/notice-box';
import { Textarea } from '../ui/textarea';

type EditableMarkdownPanelProps = {
	content: string;
	ownerId?: number;
	onSave: (content: string) => Promise<void>;
	className?: string;
	viewerFooter?: ReactNode;
	editable?: boolean;
	enableImageUpload?: boolean;
	enableDrawing?: boolean;
};

const viewerClassName = 'mx-auto max-w-[880px] overflow-x-hidden';

type EditorMode = 'visual' | 'visual-loading' | 'source';

const EditableMarkdownPanel = ({
	content,
	ownerId,
	onSave,
	className,
	viewerFooter,
	editable = true,
	enableImageUpload = true,
	enableDrawing = true,
}: EditableMarkdownPanelProps) => {
	const t = useTranslations();
	const normalizedContent = useMemo(
		() => normalizeEditorMarkdown(content),
		[content],
	);
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(normalizedContent);
	const [editorMode, setEditorMode] = useState<EditorMode>('visual');
	const [isSaving, setIsSaving] = useState(false);
	const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (editorMode !== 'visual-loading') {
			return;
		}

		const frameId = window.requestAnimationFrame(() => {
			window.setTimeout(() => {
				setEditorMode('visual');
			}, 0);
		});

		return () => {
			window.cancelAnimationFrame(frameId);
		};
	}, [editorMode]);

	useEffect(() => {
		if (isEditing) {
			return;
		}
		setDraft(normalizedContent);
	}, [isEditing, normalizedContent]);

	const normalizedDraft = useMemo(
		() => normalizeEditorMarkdown(draft),
		[draft],
	);
	const hasChanges = normalizedDraft !== normalizedContent;

	const startEditing = () => {
		setDraft(normalizedContent);
		setEditorMode('visual');
		setIsEditorFullscreen(false);
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setDraft(normalizedContent);
		setEditorMode('visual');
		setIsEditorFullscreen(false);
		setIsEditing(false);
	};

	const handleSave = async () => {
		if (!hasChanges) {
			toast.info(t('form_no_change'));
			return;
		}

		setIsSaving(true);
		try {
			await onSave(normalizedDraft);
			toast.success(t('markdown_edit_save_success'));
			setDraft(normalizedDraft);
			setEditorMode('visual');
			setIsEditorFullscreen(false);
			setIsEditing(false);
		} catch (error: any) {
			toast.error(error?.message ?? t('markdown_edit_save_failed'));
		} finally {
			setIsSaving(false);
		}
	};

	const queueVisualMode = () => {
		setDraft((current) => normalizeEditorMarkdown(current));
		setEditorMode('visual-loading');
	};

	const visualLoading = (
		<div
			className={
				isEditorFullscreen
					? 'flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground'
					: 'flex min-h-[32rem] flex-col items-center justify-center gap-3 bg-background/80 text-sm text-muted-foreground'
			}>
			<Loader2 className='size-5 animate-spin' />
			<span>{t('markdown_edit_visual_mode')}</span>
		</div>
	);

	const sourceEditor = (
		<div
			className={
				isEditorFullscreen
					? 'flex h-full min-h-0 flex-col bg-background'
					: 'flex min-h-0 flex-1 flex-col bg-muted/10'
			}>
			<div className='flex shrink-0 items-center justify-between border-b border-border/60 px-2 py-1.5'>
				<div className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
					<Code2 className='size-3.5' />
					{t('markdown_edit_source_mode')}
				</div>
				<div className='flex items-center gap-1'>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						className='h-8 px-2'
						title={t('markdown_edit_visual_mode')}
						onClick={queueVisualMode}>
						<Eye className='size-4' />
						{t('markdown_edit_visual_mode')}
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className='size-8'
						title={
							isEditorFullscreen
								? t('exit_fullscreen')
								: t('enter_fullscreen')
						}
						onClick={() =>
							setIsEditorFullscreen((current) => !current)
						}>
						{isEditorFullscreen ? (
							<Shrink className='size-4' />
						) : (
							<Expand className='size-4' />
						)}
					</Button>
				</div>
			</div>
			<div className='flex-1 overflow-auto p-4 lg:p-5'>
				<div className='mx-auto h-full w-full max-w-[880px]'>
					<Textarea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder={t('markdown_edit_source_placeholder')}
						fieldSizing='fixed'
						spellCheck={false}
						className='min-h-[32rem] h-full resize-none rounded-none border-0 bg-transparent! p-0 font-mono text-[13px] leading-6 shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0'
					/>
				</div>
			</div>
		</div>
	);

	return (
		<div className={cn('relative w-full', className)}>
			{editable ? (
				<div className='mx-auto flex w-full max-w-[880px] items-center justify-between gap-3 rounded-[22px] border border-border/50 bg-background/35 px-4 py-3 shadow-none'>
					<div className='min-w-0'>
						<p className='text-sm font-medium text-foreground'>
							{t('markdown_edit_title')}
						</p>
						<p className='text-xs text-muted-foreground'>
							{isEditing
								? t('markdown_edit_editing_hint')
								: t('markdown_edit_view_hint')}
						</p>
					</div>
					<div className='flex shrink-0 items-center gap-2'>
						{isEditing ? (
							<>
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='rounded-full'
									onClick={cancelEditing}
									disabled={isSaving}>
									{t('cancel')}
								</Button>
								<Button
									type='button'
									size='sm'
									className='rounded-full'
									onClick={() => {
										void handleSave();
									}}
									disabled={isSaving}>
									{isSaving ? (
										<Loader2 className='size-4 animate-spin' />
									) : null}
									{t('save')}
								</Button>
							</>
						) : (
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='rounded-full'
								onClick={startEditing}>
								<SquarePen className='size-4' />
								{t('edit')}
							</Button>
						)}
					</div>
				</div>
			) : null}

			{isEditing ? (
				<div className='mx-auto w-full max-w-[880px] space-y-4 mt-5'>
					<NoticeBox tone='warning'>{t('markdown_edit_stale_hint')}</NoticeBox>
					<div className='mb-5 overflow-hidden rounded-[28px] border border-border/60 bg-background/65 shadow-none'>
						{editorMode === 'visual' ? (
							<TipTapEditor
								value={draft}
								onChange={setDraft}
								ownerId={ownerId}
								enableImageUpload={enableImageUpload}
								enableDrawing={enableDrawing}
								placeholder={t('markdown_edit_placeholder')}
								className='min-h-[32rem]'
								fullscreen={isEditorFullscreen}
								onFullscreenChange={setIsEditorFullscreen}
								toolbarEnd={
									<Button
										type='button'
										variant='ghost'
										size='icon'
										className='size-8'
										title={t('markdown_edit_source_mode')}
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => {
											setDraft((current) =>
												normalizeEditorMarkdown(current),
											);
											setEditorMode('source');
										}}>
										<Code2 className='size-4' />
										<span className='sr-only'>
											{t('markdown_edit_source_mode')}
										</span>
									</Button>
								}
							/>
						) : editorMode === 'visual-loading' ? (
							<>
								{isEditorFullscreen && isMounted
									? createPortal(
											<div className='fixed inset-0 z-50 bg-background'>
												{visualLoading}
											</div>,
											document.body,
										)
									: visualLoading}
							</>
						) : (
							<>
								{isEditorFullscreen && isMounted
									? createPortal(
											<div className='fixed inset-0 z-50 bg-background'>
												{sourceEditor}
											</div>,
											document.body,
										)
									: sourceEditor}
							</>
						)}
					</div>
				</div>
			) : (
				<div className={viewerClassName}>
					<TipTapMarkdownViewer content={normalizedContent} ownerId={ownerId} />
					{viewerFooter}
				</div>
			)}
		</div>
	);
};

export default EditableMarkdownPanel;
