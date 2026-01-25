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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '../ui/switch';
import { useRouter } from 'nextjs-toploader/app';
import { getAllMineSections } from '@/service/section';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useUserContext } from '@/provider/user-provider';
import { useSearchParams } from 'next/navigation';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import AudioRecord, { type AudioRecordResult } from './audio-record';
import { FileService } from '@/lib/file';
import { getUserFileSystemDetail } from '@/service/file-system';
import { Field } from '../ui/field';

const AddAudio = () => {
	const queryClient = getQueryClient();
	const searchParams = useSearchParams();
	const sectionId = searchParams.get('section_id');
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
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
	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);

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
		// 上传音频文件
		await handleUploadAudioFile();
		// 提交表单
		return form.handleSubmit(onFormValidateSuccess, onFormValidateError)(event);
	};

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		console.log(values);
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

	const { data: userFileSystemDetail } = useQuery({
		queryKey: ['getUserFileSystemDetail', mainUserInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

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
			toast.error('No audio result found');
			return;
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
			toast.error('No user default file system found');
			return;
		}

		const fileService = new FileService(userFileSystemDetail?.file_system_id!);

		const filePath = `audio/${fileName}`;
		await fileService.uploadFile(filePath, file);
		form.setValue('file_name', filePath);
		lastUploadedRef.current = { sourceUrl: audioResult.url, filePath };
	};

	return (
		<>
			<AddLabelDialog
				open={showAddLabelDialog}
				onOpenChange={setShowAddLabelDialog}
			/>
			<Form {...form}>
				<form onSubmit={onSubmitMessageForm} className='flex flex-col h-full'>
					<div className='flex flex-col w-full gap-5 flex-1 mb-5'>
						{!mainUserInfo?.default_file_document_parse_user_engine_id && (
							<Alert>
								<AlertCircleIcon />
								<AlertTitle>
									{t('document_create_file_engine_unset')}
								</AlertTitle>
								<AlertDescription>
									<p>
										{t('document_create_file_engine_unset_description_1')}
										<Link
											href={'/setting'}
											className='inline-block underline underline-offset-2 font-bold'>
											{t('document_create_file_engine_unset_description_2')}
										</Link>
										{t('document_create_file_engine_unset_description_3')}
									</p>
								</AlertDescription>
							</Alert>
						)}
						<Field>
							<AudioRecord
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
						<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
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
													disabled={
														!mainUserInfo?.default_document_reader_model_id
													}
													checked={field.value}
													onCheckedChange={(e) => {
														field.onChange(e);
													}}
												/>
											</div>
											<FormDescription>
												{t('document_create_ai_summary_description')}
											</FormDescription>
											{!mainUserInfo?.default_document_reader_model_id && (
												<Alert className='bg-destructive/10 dark:bg-destructive/20'>
													<OctagonAlert className='h-4 w-4 text-destructive!' />
													<AlertDescription>
														{t('document_create_ai_summary_engine_unset')}
													</AlertDescription>
												</Alert>
											)}
										</FormItem>
									);
								}}
							/>
							<FormField
								name='auto_transcribe'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className='rounded-lg border border-input p-3'>
											<div className='flex flex-row gap-1 items-center'>
												<FormLabel className='flex flex-row gap-1 items-center'>
													{t('document_create_auto_transcribe')}
													<Sparkles size={15} />
												</FormLabel>
												<Switch
													disabled={
														!mainUserInfo?.default_audio_transcribe_engine_id
													}
													checked={field.value}
													onCheckedChange={(e) => {
														field.onChange(e);
													}}
												/>
											</div>
											<FormDescription>
												{t('document_create_auto_transcribe_description')}
											</FormDescription>
											{!mainUserInfo?.default_audio_transcribe_engine_id && (
												<Alert className='bg-destructive/10 dark:bg-destructive/20'>
													<OctagonAlert className='h-4 w-4 text-destructive!' />
													<AlertDescription>
														{t('document_create_auto_transcribe_engine_unset')}
													</AlertDescription>
												</Alert>
											)}
										</FormItem>
									);
								}}
							/>
						</div>
						<div className='flex md:flex-row md:items-center flex-col gap-5 w-full'>
							{labels ? (
								<FormField
									control={form.control}
									name='labels'
									render={({ field }) => {
										return (
											<FormItem className='gap-0 flex-1'>
												<MultipleSelector
													onCreate={async ({ label }) => {
														await mutateCreateDocumentLabel.mutateAsync({
															name: label,
														});
													}}
													options={labels.data.map((label) => {
														return {
															label: label.name,
															value: label.id.toString(),
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
													placeholder={t('document_create_label_placeholder')}
												/>
											</FormItem>
										);
									}}
								/>
							) : (
								<Skeleton className='h-10' />
							)}
							<FormField
								name='auto_tag'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className='p-2 rounded-md border border-input flex flex-row items-center relative'>
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
													!mainUserInfo?.default_document_reader_model_id ||
													!form.watch('auto_transcribe')
												}
												checked={field.value}
												onCheckedChange={(e) => {
													field.onChange(e);
												}}
											/>
											{!mainUserInfo?.default_document_reader_model_id && (
												<Tooltip>
													<TooltipTrigger>
														<OctagonAlert className='h-4 w-4 text-destructive!' />
													</TooltipTrigger>
													<TooltipContent>
														{t('document_create_auto_tag_engine_unset')}
													</TooltipContent>
												</Tooltip>
											)}
											{!form.watch('auto_transcribe') && (
												<Tooltip>
													<TooltipTrigger>
														<OctagonAlert className='h-4 w-4 text-destructive!' />
													</TooltipTrigger>
													<TooltipContent>
														{t('document_create_auto_tag_with_transcribe')}
													</TooltipContent>
												</Tooltip>
											)}
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
							<Skeleton className='h-10' />
						)}
					</div>
					<Button
						type='submit'
						className='w-full'
						disabled={
							mutateCreateDocument.isPending ||
							!mainUserInfo?.default_file_document_parse_user_engine_id ||
							!audioResult
						}>
						{t('document_create_submit')}
						{mutateCreateDocument.isPending && (
							<Loader2 className='size-4 animate-spin' />
						)}
					</Button>
				</form>
			</Form>
		</>
	);
};

export default AddAudio;
