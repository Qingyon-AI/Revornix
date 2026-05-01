'use client';

import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocument, createLabel, getLabels } from '@/service/document';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type FormEvent,
} from 'react';
import {
	FolderInput,
	Info,
	Loader2,
	OctagonAlert,
	Podcast,
	Save,
	Sparkles,
	Tags,
	WandSparkles,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Switch } from '../ui/switch';
import { useRouter } from 'nextjs-toploader/app';
import { getAllMineSections } from '@/service/section';
import { useTranslations } from 'next-intl';
import { useUserContext } from '@/provider/user-provider';
import { useSearchParams } from 'next/navigation';
import MultipleSelector from '../ui/multiple-selector';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { invalidateDocumentListQueries } from '@/lib/document-cache';
import SelectorSkeleton from './selector-skeleton';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { normalizeEditorMarkdown } from '@/lib/editor-markdown';
import TipTapEditor from '../markdown/tiptap-editor';
import { AutomationOption, PanelTitle } from '@/components/form-panel';

const QUICK_NOTE_DRAFT_STORAGE_KEY = 'revornix.quick-note.draft';
const QUICK_NOTE_IMPORT_STORAGE_KEY = 'revornix.quick-note.import';
const QUICK_NOTE_AUTO_SAVE_DELAY = 1200;

const normalizeQuickNoteContent = (content: string) =>
	normalizeEditorMarkdown(content);

const AddQuickNote = () => {
	const searchParams = useSearchParams();
	const queryClient = getQueryClient();
	const sectionId = searchParams.get('section_id');
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { documentReaderModel, podcastEngine } = useDefaultResourceAccess();
	const formSchema = z.object({
		category: z.number(),
		content: z.string(),
		title: z.optional(
			z.string().min(1, { message: t('document_create_title_needed') }),
		),
		description: z.optional(
			z.string().min(1, { message: t('document_create_description_needed') }),
		),
		from_plat: z.string(),
		labels: z.optional(z.array(z.number())),
		sections: z.array(z.number()),
		auto_summary: z.boolean(),
		auto_podcast: z.boolean(),
		auto_tag: z.boolean(),
	});
	const router = useRouter();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			content: '',
			category: 2,
			auto_summary: false,
			from_plat: 'revornix-web',
			labels: [],
			sections: sectionId ? [Number(sectionId)] : [],
			auto_podcast: false,
			auto_tag: false,
		},
	});
	const restoredDraftKeyRef = useRef<string | null>(null);
	const lastSavedDraftRef = useRef<string>('');
	const [editorInstanceKey, setEditorInstanceKey] = useState(0);

	const { data: labels } = useQuery({
		queryKey: ['getDocumentLabels'],
		queryFn: getLabels,
	});

	const { data: sections } = useQuery({
		queryKey: ['getMineDocumentSections'],
		queryFn: getAllMineSections,
	});

	const mutateCreateDocument = useMutation({
		mutationKey: ['createDocument', 'quick-note'],
		mutationFn: createDocument,
		onSuccess: (data) => {
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem(draftStorageKey);
			}
			lastSavedDraftRef.current = '';
			void invalidateDocumentListQueries(queryClient, mainUserInfo?.id);
			toast.success(t('document_create_success'));
			router.push(`/document/detail/${data.document_id}`);
		},
		onError: (error) => {
			toast.error(t('document_create_failed'));
			console.error(error);
		},
	});

	const onSubmitMessageForm = async (event: FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onFormValidateSuccess, onFormValidateError)(event);
	};

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateCreateDocument.mutate(values);
	};

	const onFormValidateError = (errors: any) => {
		toast.error(t('form_validate_failed'));
		console.error(errors);
	};

	const mutateCreateDocumentLabel = useMutation({
		mutationKey: ['createDocumentLabel'],
		mutationFn: createLabel,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['getDocumentLabels'],
			});
		},
	});

	const documentReaderUnavailable =
		documentReaderModel.loading ||
		!documentReaderModel.configured ||
		documentReaderModel.subscriptionLocked;
	const podcastEngineUnavailable =
		podcastEngine.loading ||
		!podcastEngine.configured ||
		podcastEngine.subscriptionLocked;

	const draftStorageKey = `${QUICK_NOTE_DRAFT_STORAGE_KEY}.${mainUserInfo?.id ?? 'anonymous'}`;
	const watchedDraftValues = useWatch({ control: form.control });

	const buildDraftPayload = useCallback(
		(values: Partial<z.infer<typeof formSchema>>) => {
			return {
				content: normalizeQuickNoteContent(values.content ?? ''),
				title: values.title ?? undefined,
				description: values.description ?? undefined,
				labels: Array.isArray(values.labels) ? values.labels : [],
				sections: Array.isArray(values.sections)
					? values.sections
					: sectionId
						? [Number(sectionId)]
						: [],
				auto_summary: Boolean(values.auto_summary),
				auto_podcast: Boolean(values.auto_podcast),
				auto_tag: Boolean(values.auto_tag),
				category: 2,
				from_plat: 'revornix-web',
			};
		},
		[sectionId],
	);

	const hasMeaningfulDraft = useCallback(
		(values: ReturnType<typeof buildDraftPayload>) => {
			const hasConfiguredSections =
				values.sections.length > 0 &&
				!(
					sectionId &&
					values.sections.length === 1 &&
					values.sections[0] === Number(sectionId)
				);
			return (
				values.content.trim().length > 0 ||
				(values.title?.trim().length ?? 0) > 0 ||
				(values.description?.trim().length ?? 0) > 0 ||
				values.labels.length > 0 ||
				hasConfiguredSections ||
				values.auto_summary ||
				values.auto_podcast ||
				values.auto_tag
			);
		},
		[sectionId],
	);

	const saveQuickNoteDraft = useCallback(
		(showFeedback = true) => {
			if (typeof window === 'undefined') {
				return;
			}

			const draftPayload = buildDraftPayload(form.getValues());
			if (!hasMeaningfulDraft(draftPayload)) {
				window.localStorage.removeItem(draftStorageKey);
				lastSavedDraftRef.current = '';
				return;
			}

			const serializedDraft = JSON.stringify(draftPayload);
			window.localStorage.setItem(
				draftStorageKey,
				JSON.stringify({
					...draftPayload,
					updatedAt: Date.now(),
				}),
			);
			lastSavedDraftRef.current = serializedDraft;
			if (showFeedback) {
				toast.success(t('document_create_quick_note_draft_saved'));
			}
		},
		[buildDraftPayload, draftStorageKey, form, hasMeaningfulDraft, t],
	);

	useEffect(() => {
		if (typeof window === 'undefined' || mainUserInfo?.id === undefined) {
			return;
		}

		if (restoredDraftKeyRef.current === draftStorageKey) {
			return;
		}

		restoredDraftKeyRef.current = draftStorageKey;

		const importedRaw = window.localStorage.getItem(
			QUICK_NOTE_IMPORT_STORAGE_KEY,
		);
		if (importedRaw) {
			try {
				const imported = JSON.parse(importedRaw) as { content?: string };
				const importedContent = imported?.content ?? '';
				if (importedContent.trim().length > 0) {
					const normalizedDraft = buildDraftPayload({
						...form.getValues(),
						content: importedContent,
					});
					form.reset(normalizedDraft);
					lastSavedDraftRef.current = JSON.stringify(normalizedDraft);
					setEditorInstanceKey((current) => current + 1);
					toast.success(t('revornix_ai_quick_note_imported'));
					window.localStorage.removeItem(QUICK_NOTE_IMPORT_STORAGE_KEY);
					return;
				}
			} catch (error) {
				console.error(error);
			}
			window.localStorage.removeItem(QUICK_NOTE_IMPORT_STORAGE_KEY);
		}

		const storedDraft = window.localStorage.getItem(draftStorageKey);
		if (!storedDraft) {
			return;
		}

		try {
			const parsedDraft = JSON.parse(storedDraft) as Partial<
				z.infer<typeof formSchema>
			>;
			const normalizedDraft = buildDraftPayload(parsedDraft);
			form.reset(normalizedDraft);
			lastSavedDraftRef.current = JSON.stringify(normalizedDraft);
			setEditorInstanceKey((current) => current + 1);
			toast.success(t('document_create_quick_note_draft_restored'));
		} catch (error) {
			console.error(error);
			window.localStorage.removeItem(draftStorageKey);
		}
	}, [buildDraftPayload, draftStorageKey, form, mainUserInfo?.id, t]);

	useEffect(() => {
		const handleSaveDraftShortcut = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
				event.preventDefault();
				saveQuickNoteDraft();
			}
		};

		window.addEventListener('keydown', handleSaveDraftShortcut);
		return () => {
			window.removeEventListener('keydown', handleSaveDraftShortcut);
		};
	}, [saveQuickNoteDraft]);

	useEffect(() => {
		if (typeof window === 'undefined' || mainUserInfo?.id === undefined) {
			return;
		}

		const draftPayload = buildDraftPayload(watchedDraftValues);
		if (!hasMeaningfulDraft(draftPayload)) {
			if (lastSavedDraftRef.current) {
				window.localStorage.removeItem(draftStorageKey);
				lastSavedDraftRef.current = '';
			}
			return;
		}

		const serializedDraft = JSON.stringify(draftPayload);
		if (serializedDraft === lastSavedDraftRef.current) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			window.localStorage.setItem(
				draftStorageKey,
				JSON.stringify({
					...draftPayload,
					updatedAt: Date.now(),
				}),
			);
			lastSavedDraftRef.current = serializedDraft;
		}, QUICK_NOTE_AUTO_SAVE_DELAY);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [
		buildDraftPayload,
		draftStorageKey,
		hasMeaningfulDraft,
		mainUserInfo?.id,
		watchedDraftValues,
	]);

	useEffect(() => {
		if (typeof window === 'undefined' || mainUserInfo?.id === undefined) {
			return;
		}

		const flushDraft = () => {
			saveQuickNoteDraft(false);
		};

		window.addEventListener('pagehide', flushDraft);
		window.addEventListener('beforeunload', flushDraft);
		return () => {
			window.removeEventListener('pagehide', flushDraft);
			window.removeEventListener('beforeunload', flushDraft);
		};
	}, [mainUserInfo?.id, saveQuickNoteDraft]);

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={onSubmitMessageForm}
					className='grid w-full grid-cols-1 gap-3 overflow-visible lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_400px]'>
					<section className='min-w-0 lg:min-h-0'>
						<FormField
							control={form.control}
							name='content'
							render={({ field }) => {
								return (
									<FormItem className='flex min-h-[400px] flex-col lg:h-full lg:min-h-0'>
										<div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/70 bg-background shadow-sm'>
											<div className='flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-3'>
												<PanelTitle
													icon={WandSparkles}
													title={t('document_create_quick_note')}
												/>
											</div>
											<TipTapEditor
												key={editorInstanceKey}
												value={field.value}
												onChange={field.onChange}
												placeholder={t('document_create_note_placeholded')}
												className='min-h-[400px] flex-1 rounded-none border-0 bg-muted/10 shadow-none lg:min-h-0'
												enableImageUpload
												enableDrawing
												ownerId={mainUserInfo?.id}
											/>
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
					</section>

					<aside className='min-w-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:min-h-0 lg:overflow-y-auto lg:pr-1 space-y-3'>
						<div className='space-y-3 rounded-md border border-border/70 bg-muted/20 p-3 shadow-sm'>
							<div className='space-y-3'>
								<PanelTitle
									icon={Sparkles}
									title={t('document_create_more_config')}
								/>
								<FormField
									name='auto_summary'
									control={form.control}
									render={({ field }) => (
										<FormItem>
											<AutomationOption
												icon={WandSparkles}
												title={t('document_create_ai_summary')}
												description={t(
													'document_create_ai_summary_description',
												)}
												checked={field.value}
												disabled={documentReaderUnavailable && !field.value}
												onCheckedChange={field.onChange}
												alert={
													documentReaderUnavailable
														? documentReaderModel.subscriptionLocked
															? t('default_resource_subscription_locked')
															: t('document_create_ai_summary_engine_unset')
														: undefined
												}
											/>
										</FormItem>
									)}
								/>
								<FormField
									name='auto_podcast'
									control={form.control}
									render={({ field }) => (
										<FormItem>
											<AutomationOption
												icon={Podcast}
												title={t('document_create_auto_podcast')}
												description={t(
													'document_create_auto_podcast_description',
												)}
												checked={field.value}
												disabled={podcastEngineUnavailable && !field.value}
												onCheckedChange={field.onChange}
												alert={
													podcastEngineUnavailable
														? podcastEngine.subscriptionLocked
															? t('default_resource_subscription_locked')
															: t('document_create_auto_podcast_engine_unset')
														: undefined
												}
											/>
										</FormItem>
									)}
								/>
							</div>

							<div className='space-y-3 border-t border-border/60 pt-3'>
								<PanelTitle
									icon={Tags}
									title={t('document_create_label_placeholder')}
								/>
								{labels ? (
									<FormField
										control={form.control}
										name='labels'
										render={({ field }) => {
											return (
												<FormItem className='min-w-0 gap-0'>
													<MultipleSelector
														onCreate={async ({ label }) => {
															await mutateCreateDocumentLabel.mutateAsync({
																name: label,
															});
														}}
														options={labels.data.map((label) => ({
															label: label.name,
															value: label.id.toString(),
														}))}
														onChange={(value) => {
															field.onChange(
																value.map(({ value }) => Number(value)),
															);
														}}
														value={
															field.value
																? field.value.map((item) => item.toString())
																: []
														}
														placeholder={t('document_create_label_placeholder')}
													/>
												</FormItem>
											);
										}}
									/>
								) : (
									<SelectorSkeleton />
								)}
								<FormField
									name='auto_tag'
									control={form.control}
									render={({ field }) => {
										const autoTagAlert = documentReaderUnavailable
											? documentReaderModel.subscriptionLocked
												? t('default_resource_subscription_locked')
												: t('document_create_auto_tag_engine_unset')
											: null;

										return (
											<FormItem className='rounded-md border border-border/70 bg-background p-3'>
												<div className='flex items-center gap-3'>
													<FormLabel
														htmlFor='auto_tag'
														className='flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium'>
														{t('document_create_auto_tag')}
														<Tooltip>
															<TooltipTrigger type='button'>
																<Info className='size-4 text-muted-foreground' />
															</TooltipTrigger>
															<TooltipContent>
																{t('document_create_auto_tag_description')}
															</TooltipContent>
														</Tooltip>
													</FormLabel>
													<Switch
														id='auto_tag'
														disabled={documentReaderUnavailable && !field.value}
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
													{autoTagAlert && (
														<Tooltip>
															<TooltipTrigger type='button'>
																<OctagonAlert className='size-4 text-destructive!' />
															</TooltipTrigger>
															<TooltipContent>{autoTagAlert}</TooltipContent>
														</Tooltip>
													)}
												</div>
											</FormItem>
										);
									}}
								/>
							</div>

							<div className='space-y-3 border-t border-border/60 pt-3'>
								<PanelTitle
									icon={FolderInput}
									title={t('document_create_section_choose')}
								/>
								{sections ? (
									<FormField
										control={form.control}
										name='sections'
										render={({ field }) => {
											return (
												<FormItem className='space-y-0'>
													<MultipleSelector
														options={sections.data.map((section) => {
															return {
																label: section.title,
																value: section.id.toString(),
															};
														})}
														onChange={(value) => {
															field.onChange(
																value.map(({ value }) => Number(value)),
															);
														}}
														value={
															field.value
																? field.value.map((item) => item.toString())
																: []
														}
														placeholder={t('document_create_section_choose')}
													/>
												</FormItem>
											);
										}}
									/>
								) : (
									<SelectorSkeleton />
								)}
							</div>
						</div>
						<Button
							type='submit'
							size='lg'
							className='w-full'
							disabled={
								mutateCreateDocument.isPending ||
								!form.watch('content') ||
								(form.watch('auto_tag') && documentReaderUnavailable) ||
								(form.watch('auto_summary') && documentReaderUnavailable) ||
								(form.watch('auto_podcast') && podcastEngineUnavailable)
							}>
							<Save className='size-4' />
							{t('document_create_submit')}
							{mutateCreateDocument.isPending && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</Button>
					</aside>
				</form>
			</Form>
		</>
	);
};

export default AddQuickNote;
