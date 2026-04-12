'use client';

import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocument, createLabel, getLabels } from '@/service/document';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Info, Loader2, OctagonAlert, Sparkles } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import AddLabelDialog from '@/components/document/add-document-label-dialog';
import { Switch } from '../ui/switch';
import { useRouter } from 'nextjs-toploader/app';
import { getAllMineSections } from '@/service/section';
import { useTranslations } from 'next-intl';
import { useUserContext } from '@/provider/user-provider';
import { Alert, AlertDescription } from '../ui/alert';
import { useSearchParams } from 'next/navigation';
import MultipleSelector from '../ui/multiple-selector';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip } from '../ui/tooltip';
import { TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { invalidateDocumentListQueries } from '@/lib/document-cache';
import SelectorSkeleton from './selector-skeleton';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { normalizeEditorMarkdown } from '@/lib/editor-markdown';
import TipTapEditor from '../markdown/tiptap-editor';
import DocumentCreateAdvancedSection from './document-create-advanced-section';

const QUICK_NOTE_DRAFT_STORAGE_KEY = 'revornix.quick-note.draft';
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

	const onSubmitMessageForm = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
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
					className='flex h-full w-full min-h-0 flex-col overflow-hidden'>
					<FormField
						control={form.control}
						name='content'
						render={({ field }) => {
							return (
								<FormItem className='flex h-full min-h-0 flex-1 flex-col'>
									<TipTapEditor
										key={editorInstanceKey}
										value={field.value}
										onChange={field.onChange}
										placeholder={t('document_create_note_placeholded')}
										className='h-full min-h-[320px] flex-1'
										enableImageUpload
										enableDrawing
										ownerId={mainUserInfo?.id}
									/>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<div className='shrink-0 pt-4 backdrop-blur'>
						<DocumentCreateAdvancedSection>
							<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
								<FormField
									name='auto_summary'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem className='rounded-lg border border-input p-3'>
												<div className='flex flex-row gap-1 items-center'>
													<FormLabel className='flex flex-row gap-1 items-center'>
														{t('document_create_ai_summary')}
														<Sparkles size={15} />
													</FormLabel>
													<Switch
														disabled={documentReaderUnavailable && !field.value}
														checked={field.value}
														onCheckedChange={(e) => {
															field.onChange(e);
														}}
													/>
												</div>
												<FormDescription>
													{t('document_create_ai_summary_description')}
												</FormDescription>
												{documentReaderUnavailable && (
													<Alert className='bg-destructive/10 dark:bg-destructive/20'>
														<OctagonAlert className='h-4 w-4 text-destructive!' />
														<AlertDescription>
															{documentReaderModel.subscriptionLocked
																? t('default_resource_subscription_locked')
																: t('document_create_ai_summary_engine_unset')}
														</AlertDescription>
													</Alert>
												)}
											</FormItem>
										);
									}}
								/>
								<FormField
									name='auto_podcast'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem className='rounded-lg border border-input p-3'>
												<div className='flex flex-row gap-1 items-center'>
													<FormLabel className='flex flex-row gap-1 items-center'>
														{t('document_create_auto_podcast')}
														<Sparkles size={15} />
													</FormLabel>
													<Switch
														disabled={podcastEngineUnavailable && !field.value}
														checked={field.value}
														onCheckedChange={(e) => {
															field.onChange(e);
														}}
													/>
												</div>
												<FormDescription>
													{t('document_create_auto_podcast_description')}
												</FormDescription>
												{podcastEngineUnavailable && (
													<Alert className='bg-destructive/10 dark:bg-destructive/20'>
														<OctagonAlert className='h-4 w-4 text-destructive!' />
														<AlertDescription>
															{podcastEngine.subscriptionLocked
																? t('default_resource_subscription_locked')
																: t(
																		'document_create_auto_podcast_engine_unset',
																	)}
														</AlertDescription>
													</Alert>
												)}
											</FormItem>
										);
									}}
								/>
							</div>

							<div className='flex w-full flex-col gap-5 xl:flex-row xl:items-center'>
								{labels ? (
									<FormField
										control={form.control}
										name='labels'
										render={({ field }) => {
											return (
												<FormItem className='min-w-0 flex-1 gap-0'>
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
																value.map(({ label, value }) => Number(value)),
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
										return (
											<FormItem className='w-full shrink-0 rounded-md border border-input p-3 xl:w-auto xl:min-w-[220px]'>
												<div className='flex flex-row items-center'>
													<FormLabel htmlFor='auto_tag'>
														{t('document_create_auto_tag')}
														<Tooltip>
															<TooltipTrigger>
																<Info size={15} />
															</TooltipTrigger>
															<TooltipContent>
																{t('document_create_auto_tag_description')}
															</TooltipContent>
														</Tooltip>
													</FormLabel>
													<Switch
														id='auto_tag'
														className='ml-auto'
														disabled={documentReaderUnavailable && !field.value}
														checked={field.value}
														onCheckedChange={(e) => {
															field.onChange(e);
														}}
													/>
													{documentReaderUnavailable && (
														<Tooltip>
															<TooltipTrigger>
																<OctagonAlert className='ml-2 h-4 w-4 text-destructive!' />
															</TooltipTrigger>
															<TooltipContent>
																{documentReaderModel.subscriptionLocked
																	? t('default_resource_subscription_locked')
																	: t('document_create_auto_tag_engine_unset')}
															</TooltipContent>
														</Tooltip>
													)}
												</div>
											</FormItem>
										);
									}}
								/>
							</div>

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
															value.map(({ label, value }) => Number(value)),
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
						</DocumentCreateAdvancedSection>

						<Button
							type='submit'
							className='mt-4 w-full'
							disabled={
								mutateCreateDocument.isPending ||
								!form.watch('content') ||
								(form.watch('auto_tag') && documentReaderUnavailable) ||
								(form.watch('auto_summary') && documentReaderUnavailable) ||
								(form.watch('auto_podcast') && podcastEngineUnavailable)
							}>
							{t('document_create_submit')}
							{mutateCreateDocument.isPending && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</Button>
					</div>
				</form>
			</Form>
		</>
	);
};

export default AddQuickNote;
