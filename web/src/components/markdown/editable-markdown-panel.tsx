'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { Loader2, SquarePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { normalizeEditorMarkdown } from '@/lib/editor-markdown';
import { cn } from '@/lib/utils';

import TipTapEditor from './tiptap-editor';
import TipTapMarkdownViewer from './tiptap-markdown-viewer';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';

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
	'prose prose-zinc mx-auto max-w-[880px] overflow-x-hidden pb-6 dark:prose-invert prose-headings:scroll-mt-24 prose-headings:break-words prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-a:text-primary prose-strong:text-foreground prose-img:rounded-2xl sm:pb-14 [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words';

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
		setEditorInstanceKey((current) => current + 1);
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setDraft(normalizedContent);
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
				<div className='mx-auto mb-4 flex w-full max-w-[880px] items-center justify-between gap-3 rounded-[22px] border border-border/60 bg-background/45 px-4 py-3'>
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
				<div className='mx-auto w-full max-w-[880px] space-y-4'>
					<Alert className='border-amber-500/30 bg-amber-500/8 text-amber-800 dark:text-amber-200'>
						<AlertDescription>
							{t('markdown_edit_stale_hint')}
						</AlertDescription>
					</Alert>
					<div className='overflow-hidden rounded-[28px] border border-border/60 bg-background/75 shadow-sm'>
						<TipTapEditor
							key={editorInstanceKey}
							value={draft}
							onChange={setDraft}
							ownerId={ownerId}
							enableImageUpload={enableImageUpload}
							enableDrawing={enableDrawing}
							placeholder={t('markdown_edit_placeholder')}
							className='h-[calc(100dvh-18rem)] min-h-[28rem]'
						/>
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
