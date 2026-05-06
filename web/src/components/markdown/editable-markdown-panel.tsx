'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { Code2, Eye, Loader2, SquarePen } from 'lucide-react';
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

const viewerClassName =
	'mx-auto max-w-[880px] overflow-x-hidden';

type EditorMode = 'visual' | 'source';

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
	const [editorInstanceKey, setEditorInstanceKey] = useState(0);
	const [isSaving, setIsSaving] = useState(false);

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
		setEditorInstanceKey((current) => current + 1);
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setDraft(normalizedContent);
		setEditorMode('visual');
		setEditorInstanceKey((current) => current + 1);
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
			setEditorMode('visual');
			setIsEditing(false);
		} catch (error: any) {
			toast.error(error?.message ?? t('markdown_edit_save_failed'));
		} finally {
			setIsSaving(false);
		}
	};

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
					<div className='flex flex-col gap-3 rounded-xl border border-border/60 bg-background/65 px-3 py-2 sm:flex-row sm:items-center sm:justify-between'>
						<div className='min-w-0'>
							<p className='text-sm font-medium text-foreground'>
								{t('markdown_edit_mode_label')}
							</p>
							<p className='text-xs text-muted-foreground'>
								{editorMode === 'visual'
									? t('markdown_edit_visual_hint')
									: t('markdown_edit_source_hint')}
							</p>
						</div>
						<div className='flex w-full shrink-0 rounded-lg border border-border/60 bg-muted/30 p-1 sm:w-auto'>
							<Button
								type='button'
								variant={editorMode === 'visual' ? 'secondary' : 'ghost'}
								size='sm'
								className='h-8 flex-1 rounded-md px-2.5 sm:flex-none'
								aria-pressed={editorMode === 'visual'}
								onClick={() => {
									setDraft((current) => normalizeEditorMarkdown(current));
									setEditorInstanceKey((current) => current + 1);
									setEditorMode('visual');
								}}>
								<Eye className='size-4' />
								{t('markdown_edit_visual_mode')}
							</Button>
							<Button
								type='button'
								variant={editorMode === 'source' ? 'secondary' : 'ghost'}
								size='sm'
								className='h-8 flex-1 rounded-md px-2.5 sm:flex-none'
								aria-pressed={editorMode === 'source'}
								onClick={() => {
									setDraft((current) => normalizeEditorMarkdown(current));
									setEditorMode('source');
								}}>
								<Code2 className='size-4' />
								{t('markdown_edit_source_mode')}
							</Button>
						</div>
					</div>
					<div className='mb-5 overflow-hidden rounded-[28px] border border-border/60 bg-background/65 shadow-none'>
						{editorMode === 'visual' ? (
							<TipTapEditor
								key={editorInstanceKey}
								value={draft}
								onChange={setDraft}
								ownerId={ownerId}
								enableImageUpload={enableImageUpload}
								enableDrawing={enableDrawing}
								placeholder={t('markdown_edit_placeholder')}
								className='min-h-[32rem]'
							/>
						) : (
							<Textarea
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								placeholder={t('markdown_edit_source_placeholder')}
								fieldSizing='fixed'
								spellCheck={false}
								className='min-h-[32rem] resize-y rounded-none border-0 bg-background p-5 font-mono text-[13px] leading-6 shadow-none focus-visible:ring-0'
							/>
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
