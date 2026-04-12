'use client';

import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocument, createLabel, getLabels } from '@/service/document';
import { useRef, useState } from 'react';
import {
	AlertCircleIcon,
	Info,
	Loader2,
	OctagonAlert,
	Sparkles,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from '@/components/ui/form';
import MultipleSelector from '@/components/ui/multiple-selector';
import AddLabelDialog from '@/components/document/add-document-label-dialog';
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
import AudioRecord, { type AudioRecordResult } from './audio-record';
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
import DocumentCreateAdvancedSection from './document-create-advanced-section';

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

	const onSubmitMessageForm = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
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

		const { file, fileName } = audioResultToFile(
			audioResult,
			crypto.randomUUID(),
		);

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
					className='flex h-full min-h-0 flex-col overflow-hidden'>
					<div className='flex w-full min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto pr-1'>
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
											className='inline-block underline underline-offset-2 font-bold'>
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
						<Field className='min-h-0 flex-1'>
							<AudioRecord
								className='h-full min-h-[320px]'
								maxDurationMs={AUDIO_DOCUMENT_MAX_DURATION_MS}
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
						</Field>
					</div>
					<div className='sticky bottom-0 z-10 shrink-0 pt-4 backdrop-blur'>
						<DocumentCreateAdvancedSection>
							<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
								<FormField
									name='auto_summary'
									control={form.control}
									render={({ field }) => (
										<FormItem className='rounded-lg border border-input p-3'>
											<div className='flex flex-row gap-1 items-center'>
												<FormLabel className='flex flex-row gap-1 items-center'>
													{t('document_create_ai_summary')}
													<Sparkles size={15} />
												</FormLabel>
												<Switch
													disabled={documentReaderUnavailable && !field.value}
													checked={field.value}
													onCheckedChange={(e) => field.onChange(e)}
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
									)}
								/>
								<FormField
									name='auto_transcribe'
									control={form.control}
									render={({ field }) => (
										<FormItem className='rounded-lg border border-input p-3'>
											<div className='flex flex-row gap-1 items-center'>
												<FormLabel className='flex flex-row gap-1 items-center'>
													{t('document_create_auto_transcribe')}
													<Sparkles size={15} />
												</FormLabel>
												<Switch
													disabled={transcribeEngineUnavailable && !field.value}
													checked={field.value}
													onCheckedChange={(e) => field.onChange(e)}
												/>
											</div>
											<FormDescription>
												{t('document_create_auto_transcribe_description')}
											</FormDescription>
											{transcribeEngineUnavailable && (
												<Alert className='bg-destructive/10 dark:bg-destructive/20'>
													<OctagonAlert className='h-4 w-4 text-destructive!' />
													<AlertDescription>
														{transcribeEngine.subscriptionLocked
															? t('default_resource_subscription_locked')
															: t(
																	'document_create_auto_transcribe_engine_unset',
																)}
													</AlertDescription>
												</Alert>
											)}
										</FormItem>
									)}
								/>
							</div>
							<div className='flex w-full flex-col gap-5 xl:flex-row xl:items-center'>
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
										<FormItem className='w-full shrink-0 rounded-md border border-input p-3 xl:w-auto xl:min-w-[240px]'>
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
													disabled={
														(documentReaderUnavailable && !field.value) ||
														!form.watch('auto_transcribe')
													}
													checked={field.value}
													onCheckedChange={(e) => field.onChange(e)}
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
												{!form.watch('auto_transcribe') && (
													<Tooltip>
														<TooltipTrigger>
															<OctagonAlert className='ml-2 h-4 w-4 text-destructive!' />
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
						</DocumentCreateAdvancedSection>
						<Button
							type='submit'
							className='mt-4 w-full'
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
							{t('document_create_submit')}
							{submitting && <Loader2 className='size-4 animate-spin' />}
						</Button>
					</div>
				</form>
			</Form>
		</>
	);
};

export default AddAudio;
