'use client';

import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocument, createLabel, getLabels } from '@/service/document';
import type { FormEvent } from 'react';
import {
	AlertCircleIcon,
	FileCheck2,
	FileUp,
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
import MultipleSelector from '@/components/ui/multiple-selector';
import { Switch } from '../ui/switch';
import { useRouter } from 'nextjs-toploader/app';
import { getAllMineSections } from '@/service/section';
import FileUpload from './file-upload';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { settingAnchorHrefs } from '@/lib/setting-navigation';
import { useUserContext } from '@/provider/user-provider';
import { useSearchParams } from 'next/navigation';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { invalidateDocumentListQueries } from '@/lib/document-cache';
import { FILE_DOCUMENT_MAX_UPLOAD_BYTES, formatUploadSize } from '@/lib/upload';
import SelectorSkeleton from './selector-skeleton';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { AutomationOption, PanelTitle } from '@/components/form-panel';

const AddFile = () => {
	const queryClient = getQueryClient();
	const searchParams = useSearchParams();
	const sectionId = searchParams.get('section_id');
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { documentReaderModel, fileParseEngine, podcastEngine } =
		useDefaultResourceAccess();
	const formSchema = z.object({
		category: z.number(),
		file_name: z.string(),
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
			file_name: '',
			category: 0,
			auto_summary: false,
			from_plat: 'revornix-web',
			labels: [],
			sections: sectionId ? [Number(sectionId)] : [],
			auto_podcast: false,
			auto_tag: false,
		},
	});

	const { data: labels } = useQuery({
		queryKey: ['getDocumentLabels'],
		queryFn: getLabels,
	});

	const { data: sections } = useQuery({
		queryKey: ['getMineDocumentSections'],
		queryFn: getAllMineSections,
	});

	const mutateCreateDocument = useMutation({
		mutationKey: ['createDocument', 'file'],
		mutationFn: createDocument,
		onSuccess: (data) => {
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
	const fileParseEngineUnavailable =
		fileParseEngine.loading ||
		!fileParseEngine.configured ||
		fileParseEngine.subscriptionLocked;
	const podcastEngineUnavailable =
		podcastEngine.loading ||
		!podcastEngine.configured ||
		podcastEngine.subscriptionLocked;
	const currentFileName = form.watch('file_name');

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={onSubmitMessageForm}
					className='grid w-full grid-cols-1 gap-3 overflow-visible lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_400px]'>
					<section className='min-w-0 lg:flex lg:min-h-0 lg:flex-1'>
						<FormField
							name='file_name'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem className='flex min-h-[400px] w-full flex-col lg:h-full lg:min-h-0'>
										<div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/70 bg-background shadow-sm'>
											<div className='flex h-10 shrink-0 items-center border-b border-border/60 px-3'>
												<PanelTitle
													icon={FileUp}
													title={t('document_create_file')}
												/>
											</div>
											<div className='flex min-h-[400px] flex-1 flex-col p-4 sm:p-5 lg:min-h-0 lg:p-6'>
												<div className='flex w-full flex-1 flex-col gap-5'>
													<FileUpload
														accept='.jpg, .jpeg, .png, .pdf, .doc, .docx, .ppt, .pptx'
														className='min-h-[320px] flex-1 rounded-2xl border-border/70 bg-muted/10 lg:min-h-0'
														maxSizeBytes={FILE_DOCUMENT_MAX_UPLOAD_BYTES}
														onSuccess={(file_name) => {
															field.onChange(file_name);
														}}
														onDelete={() => field.onChange(null)}
													/>
													<div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
														<div className='rounded-lg border border-border/70 bg-muted/20 p-3'>
															<div className='mb-2 flex size-8 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground'>
																<FileCheck2 className='size-4' />
															</div>
															<p className='text-sm font-medium'>
																{t('document_create_file_upload_single_title')}
															</p>
															<p className='mt-1 text-xs leading-5 text-muted-foreground'>
																{t(
																	'document_create_file_upload_single_description',
																)}
															</p>
														</div>
														<div className='rounded-lg border border-border/70 bg-muted/20 p-3'>
															<div className='mb-2 flex size-8 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground'>
																<Info className='size-4' />
															</div>
															<p className='text-sm font-medium'>
																{t('document_create_file_upload_limit_title')}
															</p>
															<p className='mt-1 text-xs leading-5 text-muted-foreground'>
																{t('document_create_file_upload_limit_hint', {
																	size: formatUploadSize(
																		FILE_DOCUMENT_MAX_UPLOAD_BYTES,
																	),
																})}
															</p>
														</div>
														<div className='rounded-lg border border-border/70 bg-muted/20 p-3 sm:col-span-2 xl:col-span-1'>
															<div className='mb-2 flex size-8 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground'>
																<FileUp className='size-4' />
															</div>
															<p className='text-sm font-medium'>
																{t(
																	'document_create_file_upload_supported_title',
																)}
															</p>
															<p className='mt-1 break-words text-xs leading-5 text-muted-foreground'>
																{t(
																	'document_create_file_upload_supported_description',
																)}
															</p>
														</div>
													</div>
													{currentFileName && (
														<div className='rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground'>
															<p className='font-medium text-foreground/90'>
																{t('document_create_file_upload_current')}
															</p>
															<p className='mt-1 break-all leading-5'>
																{currentFileName}
															</p>
														</div>
													)}
												</div>
											</div>
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
					</section>

					<aside className='min-w-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:min-h-0 lg:overflow-y-auto lg:pr-1 space-y-3'>
						<div className='space-y-3 rounded-md border border-border/70 bg-muted/20 p-3 shadow-sm'>
							{!fileParseEngine.configured && (
								<Alert>
									<AlertCircleIcon />
									<AlertTitle>
										{t('document_create_file_engine_unset')}
									</AlertTitle>
									<AlertDescription>
										<p>
											{t('document_create_file_engine_unset_description_1')}
											<Link
												href={settingAnchorHrefs.defaultFileParseEngine}
												className='inline-block font-bold underline underline-offset-2'>
												{t('document_create_file_engine_unset_description_2')}
											</Link>
											{t('document_create_file_engine_unset_description_3')}
										</p>
									</AlertDescription>
								</Alert>
							)}
							{fileParseEngine.subscriptionLocked && (
								<Alert>
									<AlertCircleIcon />
									<AlertTitle>
										{t('default_resource_unavailable_title')}
									</AlertTitle>
									<AlertDescription>
										<p>
											{t('default_resource_subscription_locked')}{' '}
											<Link
												href={settingAnchorHrefs.defaultFileParseEngine}
												className='inline-block font-bold underline underline-offset-2'>
												{t('revornix_ai_default_model_goto')}
											</Link>
										</p>
									</AlertDescription>
								</Alert>
							)}
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
										render={({ field }) => (
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
										)}
									/>
								) : (
									<SelectorSkeleton />
								)}
								<FormField
									name='auto_tag'
									control={form.control}
									render={({ field }) => (
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
												{documentReaderUnavailable && (
													<Tooltip>
														<TooltipTrigger type='button'>
															<OctagonAlert className='size-4 text-destructive!' />
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
									)}
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
										render={({ field }) => (
											<FormItem className='space-y-0'>
												<MultipleSelector
													options={sections.data.map((section) => ({
														label: section.title,
														value: section.id.toString(),
													}))}
													onChange={(value) =>
														field.onChange(
															value.map(({ value }) => Number(value)),
														)
													}
													value={
														field.value
															? field.value.map((item) => item.toString())
															: []
													}
													placeholder={t('document_create_section_choose')}
												/>
											</FormItem>
										)}
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
								fileParseEngineUnavailable ||
								(form.watch('auto_tag') && documentReaderUnavailable) ||
								(form.watch('auto_summary') && documentReaderUnavailable) ||
								(form.watch('auto_podcast') && podcastEngineUnavailable) ||
								!form.watch('file_name')
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

export default AddFile;
