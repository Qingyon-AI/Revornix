'use client';

import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocument, createLabel, getLabels } from '@/service/document';
import { useRef, useState, type FormEvent } from 'react';
import {
	AlertCircleIcon,
	FileAudio,
	FolderInput,
	Info,
	Loader2,
	OctagonAlert,
	Save,
	Sparkles,
	Tags,
	TextCursorInput,
	Trash2,
	WandSparkles,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import MultipleSelector from '@/components/ui/multiple-selector';
import { Switch } from '../ui/switch';
import { useRouter } from 'nextjs-toploader/app';
import { getAllMineSections } from '@/service/section';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { settingAnchorHrefs } from '@/lib/setting-navigation';
import { useUserContext } from '@/provider/user-provider';
import { useSearchParams } from 'next/navigation';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import AudioRecord, {
	type AudioRecordHandle,
	type AudioRecordResult,
} from './audio-record';
import { FileService } from '@/lib/file';
import { getUserFileSystemDetail } from '@/service/file-system';
import { Field } from '../ui/field';
import { invalidateDocumentListQueries } from '@/lib/document-cache';
import {
	AUDIO_DOCUMENT_MAX_DURATION_MS,
	formatMediaDuration,
} from '@/lib/document-media';
import SelectorSkeleton from './selector-skeleton';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { generateUUID } from '@/lib/uuid';
import { AutomationOption, PanelTitle } from '@/components/form-panel';
import AudioPlayer from '../ui/audio-player';

const AddAudio = () => {
	const queryClient = getQueryClient();
	const searchParams = useSearchParams();
	const sectionId = searchParams.get('section_id');
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { documentReaderModel, fileParseEngine, transcribeEngine } =
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
		auto_transcribe: z.boolean(),
	});
	const router = useRouter();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			file_name: '',
			category: 3,
			auto_summary: false,
			from_plat: 'revornix-web',
			labels: [],
			sections: sectionId ? [Number(sectionId)] : [],
			auto_podcast: false,
			auto_tag: false,
			auto_transcribe: false,
		},
	});
	const [submitting, setSubmitting] = useState(false);

	const [audioResult, setAudioResult] = useState<AudioRecordResult>();
	const audioRecordRef = useRef<AudioRecordHandle>(null);
	const lastUploadedRef = useRef<{
		sourceUrl: string;
		filePath: string;
	} | null>(null);

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
			setSubmitting(false);
			router.push(`/document/detail/${data.document_id}`);
		},
		onError: (error) => {
			toast.error(t('document_create_failed'));
			console.error(error);
			setSubmitting(false);
		},
	});

	const onSubmitMessageForm = async (event: FormEvent<HTMLFormElement>) => {
		setSubmitting(true);
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		try {
			// 上传音频文件
			await handleUploadAudioFile();
			// 提交表单
			return await form.handleSubmit(
				onFormValidateSuccess,
				onFormValidateError,
			)(event);
		} catch (error) {
			console.error(error);
			setSubmitting(false);
		}
	};

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateCreateDocument.mutate(values);
	};

	const onFormValidateError = (errors: any) => {
		toast.error(t('form_validate_failed'));
		console.error(errors);
		setSubmitting(false);
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
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	const documentReaderUnavailable =
		documentReaderModel.loading ||
		!documentReaderModel.configured ||
		documentReaderModel.subscriptionLocked;
	const fileParseEngineUnavailable =
		fileParseEngine.loading ||
		!fileParseEngine.configured ||
		fileParseEngine.subscriptionLocked;
	const transcribeEngineUnavailable =
		transcribeEngine.loading ||
		!transcribeEngine.configured ||
		transcribeEngine.subscriptionLocked;

	const extFromMime = (mime: string) => {
		if (mime.includes('wav')) return 'wav';
		if (mime.includes('webm')) return 'webm';
		if (mime.includes('ogg')) return 'ogg';
		if (mime.includes('mp4')) return 'm4a'; // 有些环境会是 audio/mp4
		return 'bin';
	};

	const audioResultToFile = (result: AudioRecordResult, fileName: string) => {
		const ext = extFromMime(result.mimeType);
		fileName = `${fileName}.${ext}`;
		const file = new File([result.blob], fileName, {
			type: result.mimeType,
			lastModified: Date.now(),
		});
		return { file, fileName };
	};

	const handleUploadAudioFile = async () => {
		if (!audioResult) {
			toast.error(t('error_audio_result_not_found'));
			throw new Error(t('error_audio_result_not_found'));
		}

		if (audioResult.durationMs > AUDIO_DOCUMENT_MAX_DURATION_MS) {
			const message = t('document_audio_record_limit_reached', {
				duration: formatMediaDuration(AUDIO_DOCUMENT_MAX_DURATION_MS),
			});
			toast.error(message);
			throw new Error(message);
		}

		const cachedFilePath = lastUploadedRef.current?.filePath;
		const cachedSourceUrl = lastUploadedRef.current?.sourceUrl;
		if (cachedFilePath && cachedSourceUrl === audioResult.url) {
			if (form.getValues('file_name') !== cachedFilePath) {
				form.setValue('file_name', cachedFilePath);
			}
			return;
		}

		const { file, fileName } = audioResultToFile(audioResult, generateUUID());

		if (!mainUserInfo?.default_user_file_system) {
			toast.error(t('error_default_file_system_not_found'));
			throw new Error(t('error_default_file_system_not_found'));
		}

		const fileService = new FileService(userFileSystemDetail?.file_system_id!);

		const filePath = `audio/${fileName}`;
		await fileService.uploadFile(filePath, file);
		form.setValue('file_name', filePath);
		lastUploadedRef.current = { sourceUrl: audioResult.url, filePath };
	};

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={onSubmitMessageForm}
					className='grid w-full grid-cols-1 gap-3 overflow-visible lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_400px]'>
					<section className='min-w-0 lg:flex lg:min-h-0'>
						<Field className='flex min-h-[400px] flex-col lg:h-full lg:min-h-0'>
							<div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/70 bg-background shadow-sm'>
								<div className='flex h-10 shrink-0 items-center border-b border-border/60 px-3'>
									<PanelTitle
										icon={FileAudio}
										title={t('document_create_audio')}
									/>
								</div>
								<AudioRecord
									ref={audioRecordRef}
									className='min-h-[400px] flex-1 rounded-none border-0 lg:min-h-0'
									maxDurationMs={AUDIO_DOCUMENT_MAX_DURATION_MS}
									showDeleteButton={false}
									onRecordReady={(result: AudioRecordResult) => {
										if (lastUploadedRef.current?.sourceUrl !== result.url) {
											lastUploadedRef.current = null;
											form.setValue('file_name', '');
										}
										setAudioResult(result);
									}}
									onDelete={() => {
										lastUploadedRef.current = null;
										form.setValue('file_name', '');
										setAudioResult(undefined);
									}}
								/>
							</div>
						</Field>
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
									name='auto_transcribe'
									control={form.control}
									render={({ field }) => (
										<FormItem>
											<AutomationOption
												icon={TextCursorInput}
												title={t('document_create_auto_transcribe')}
												description={t(
													'document_create_auto_transcribe_description',
												)}
												checked={field.value}
												disabled={transcribeEngineUnavailable && !field.value}
												onCheckedChange={field.onChange}
												alert={
													transcribeEngineUnavailable
														? transcribeEngine.subscriptionLocked
															? t('default_resource_subscription_locked')
															: t(
																	'document_create_auto_transcribe_engine_unset',
																)
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
													disabled={
														(documentReaderUnavailable && !field.value) ||
														!form.watch('auto_transcribe')
													}
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
												{!form.watch('auto_transcribe') && (
													<Tooltip>
														<TooltipTrigger type='button'>
															<OctagonAlert className='size-4 text-destructive!' />
														</TooltipTrigger>
														<TooltipContent>
															{t('document_create_auto_tag_with_transcribe')}
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
						{audioResult && (
							<div className='overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm'>
								<div className='flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-3 py-2.5'>
									<div className='flex min-w-0 items-center gap-2.5'>
										<div className='flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground'>
											<FileAudio className='size-4' />
										</div>
										<div className='min-w-0'>
											<p className='truncate text-sm font-medium'>
												{t('document_create_audio')}
											</p>
											<p className='truncate text-xs text-muted-foreground'>
												{t('document_audio_record_duration')}
											</p>
										</div>
									</div>
									<span className='shrink-0 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium tabular-nums text-foreground/90'>
										{formatMediaDuration(audioResult.durationMs)}
									</span>
								</div>
								<div className='space-y-3 p-3'>
									<AudioPlayer
										src={audioResult.url}
										title={
											form.watch('title')?.trim() || t('document_create_audio')
										}
										artist={formatMediaDuration(audioResult.durationMs)}
										variant='compact'
										className='rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 shadow-none'
									/>
									<div className='flex flex-wrap gap-2'>
										<span className='rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground'>
											{t('document_audio_record_duration')}
										</span>
										<span className='rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium tabular-nums text-foreground/90'>
											{formatMediaDuration(audioResult.durationMs)}
										</span>
									</div>
									<div className='flex justify-end'>
										<Button
											type='button'
											variant='outline'
											size='sm'
											className='h-8 rounded-full border-border/70 px-3 text-xs shadow-none'
											onClick={() => void audioRecordRef.current?.clear()}>
											<Trash2 className='size-3.5' />
											{t('document_audio_record_delete')}
										</Button>
									</div>
								</div>
							</div>
						)}
						<Button
							type='submit'
							size='lg'
							className='w-full'
							disabled={
								submitting ||
								fileParseEngineUnavailable ||
								(form.watch('auto_summary') && documentReaderUnavailable) ||
								(form.watch('auto_transcribe') &&
									transcribeEngineUnavailable) ||
								(form.watch('auto_tag') &&
									(documentReaderUnavailable ||
										transcribeEngineUnavailable ||
										!form.watch('auto_transcribe'))) ||
								!audioResult
							}>
							<Save className='size-4' />
							{t('document_create_submit')}
							{submitting && <Loader2 className='size-4 animate-spin' />}
						</Button>
					</aside>
				</form>
			</Form>
		</>
	);
};

export default AddAudio;
