'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Code2, Expand, Eye, Loader2, Save, Shrink, SquarePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { normalizeEditorMarkdown } from '@/lib/editor-markdown';
import { cn } from '@/lib/utils';

import MarkdownContentShell from './markdown-content-shell';
import TipTapEditor from './tiptap-editor';
import TipTapMarkdownViewer from './tiptap-markdown-viewer';
import { Button } from '../ui/button';
import NoticeBox from '../ui/notice-box';
import { Textarea } from '../ui/textarea';

type EditableMarkdownPanelProps = {
	content: string;
	creatorId?: number;
	onSave: (content: string) => Promise<void>;
	className?: string;
	viewerFooter?: ReactNode;
	editable?: boolean;
	enableImageUpload?: boolean;
	enableDrawing?: boolean;
	showFloatingToc?: boolean;
};

const viewerClassName =
	'mx-auto w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px] overflow-x-hidden px-4 sm:px-6';

type EditorMode = 'visual' | 'visual-loading' | 'source';

const EditableMarkdownPanel = ({
	content,
	creatorId,
	onSave,
	className,
	viewerFooter,
	editable = true,
	enableImageUpload = true,
	enableDrawing = true,
	showFloatingToc = false,
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
	const expectVisualParseCheckRef = useRef(false);
	const lastVisualSourceRef = useRef<string | null>(null);

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

	const handleSave = useCallback(async () => {
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
	}, [hasChanges, isSaving, normalizedDraft, onSave, t]);

	useEffect(() => {
		if (!isEditing || !isEditorFullscreen) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.key.toLowerCase() !== 's' ||
				!(event.metaKey || event.ctrlKey) ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			event.preventDefault();
			if (!isSaving) {
				void handleSave();
			}
		};

		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [isEditing, isEditorFullscreen, isSaving, handleSave]);

	const queueVisualMode = () => {
		setDraft((current) => {
			const normalized = normalizeEditorMarkdown(current);
			lastVisualSourceRef.current = normalized;
			return normalized;
		});
		expectVisualParseCheckRef.current = true;
		setEditorMode('visual-loading');
	};

	const handleInitialVisualParse = ({
		isEmpty,
		sourceLength,
	}: {
		isEmpty: boolean;
		sourceLength: number;
	}) => {
		if (!expectVisualParseCheckRef.current) {
			return;
		}
		expectVisualParseCheckRef.current = false;
		if (isEmpty && sourceLength > 0) {
			const recoveredSource =
				lastVisualSourceRef.current ?? normalizedDraft;
			setDraft(recoveredSource);
			setEditorMode('source');
			toast.error(t('markdown_edit_visual_parse_failed'));
		}
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
					{isEditorFullscreen ? (
						<Button
							type='button'
							variant='ghost'
							size='sm'
							className='h-8 gap-1.5 px-2'
							title={t('markdown_edit_fullscreen_save')}
							onClick={() => {
								void handleSave();
							}}
							disabled={isSaving}>
							{isSaving ? (
								<Loader2 className='size-4 animate-spin' />
							) : (
								<Save className='size-4' />
							)}
							{t('save')}
						</Button>
					) : null}
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
				<div className='mx-auto h-full w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px]'>
					<Textarea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder={t('markdown_edit_source_placeholder')}
						fieldSizing='fixed'
						spellCheck={false}
						className='min-h-[32rem] h-full resize-none rounded-none border-0 bg-transparent! p-0 font-mono text-[0.8125rem] leading-6 shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0'
					/>
				</div>
			</div>
		</div>
	);

	return (
		<div className={cn('relative w-full space-y-3', className)}>
			{editable ? (
				<div className='mx-auto w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px] px-4 sm:px-6'>
				<div className='flex items-center justify-between gap-3 rounded-[22px] border border-border/50 bg-background/35 px-4 py-3 shadow-none'>
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
				</div>
			) : null}

			{isEditing ? (
				<div className='mx-auto w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px] space-y-4 mt-5 px-4 sm:px-6'>
					<NoticeBox tone='warning'>{t('markdown_edit_stale_hint')}</NoticeBox>
					<div className='mb-5 overflow-hidden bg-background/65 shadow-none'>
						{editorMode === 'visual' ? (
							<TipTapEditor
								value={draft}
								onChange={setDraft}
								creatorId={creatorId}
								enableImageUpload={enableImageUpload}
								enableDrawing={enableDrawing}
								placeholder={t('markdown_edit_placeholder')}
								className='min-h-[32rem]'
								fullscreen={isEditorFullscreen}
								onFullscreenChange={setIsEditorFullscreen}
								onFullscreenSave={() => {
									void handleSave();
								}}
								fullscreenSaveDisabled={isSaving}
								fullscreenSaveLoading={isSaving}
								onInitialParse={handleInitialVisualParse}
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
				<MarkdownContentShell
					enableFloatingToc={showFloatingToc}
					contentClassName={viewerClassName}>
					<div>
						<TipTapMarkdownViewer content={normalizedContent} creatorId={creatorId} />
						{viewerFooter}
					</div>
				</MarkdownContentShell>
			)}
		</div>
	);
};

export default EditableMarkdownPanel;
