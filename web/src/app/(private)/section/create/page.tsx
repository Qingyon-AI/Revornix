'use client';

import AddSectionLabelDialog from '@/components/section/add-section-label-dialog';
import { AutomationOption, PanelTitle } from '@/components/form-panel';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import ImageUpload from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import MultipleSelector from '@/components/ui/multiple-selector';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getQueryClient } from '@/lib/get-query-client';
import { createLabel, createSection, getMineLabels } from '@/service/section';
import { zodResolver } from '@hookform/resolvers/zod';
import { utils } from '@kinda/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	CalendarClock,
	CheckCircle2,
	Globe2,
	ImageIcon,
	Info,
	ListChecks,
	Loader2,
	Podcast,
	Settings2,
	Sparkles,
	Tags,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/hybrid-tooltip';
import Link from 'next/link';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { cn } from '@/lib/utils';

const CreatePage = () => {
	const t = useTranslations();

	const formSchema = z.object({
		title: z.string().min(1, { message: t('section_form_title_needed') }),
		description: z
			.string()
			.min(1, { message: t('section_form_description_needed') }),
		auto_publish: z.boolean(),
		auto_podcast: z.boolean(),
		auto_illustration: z.boolean(),
		cover: z.string().nullable(),
		labels: z.array(z.number()),
		process_task_trigger_type: z.number(),
		process_task_trigger_scheduler: z.string().optional(),
	});

	const queryClient = getQueryClient();
	const router = useRouter();
	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			cover: undefined,
			title: '',
			description: '',
			labels: [],
			auto_publish: false,
			auto_podcast: false,
			auto_illustration: false,
			process_task_trigger_type: 1,
		},
	});

	const { data: labels } = useQuery({
		queryKey: ['getSectionLabels'],
		queryFn: getMineLabels,
	});

	const { podcastEngine, imageGenerateEngine } = useDefaultResourceAccess();
	const podcastEngineUnavailable =
		podcastEngine.loading ||
		!podcastEngine.configured ||
		podcastEngine.subscriptionLocked;
	const imageGenerateEngineUnavailable =
		imageGenerateEngine.loading ||
		!imageGenerateEngine.configured ||
		imageGenerateEngine.subscriptionLocked;
	const triggerType = form.watch('process_task_trigger_type');
	const autoPodcastEnabled = form.watch('auto_podcast');
	const autoIllustrationEnabled = form.watch('auto_illustration');
	const submitDisabled =
		form.formState.isSubmitting ||
		(autoPodcastEnabled && podcastEngineUnavailable) ||
		(autoIllustrationEnabled && imageGenerateEngineUnavailable);

	const onSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
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
		const [res, err] = await utils.to(
			createSection({
				title: values.title,
				description: values.description,
				cover: values.cover,
				labels: values.labels,
				auto_publish: values.auto_publish,
				auto_podcast: values.auto_podcast,
				auto_illustration: values.auto_illustration,
				process_task_trigger_type: values.process_task_trigger_type,
				process_task_trigger_scheduler: values.process_task_trigger_scheduler,
			}),
		);
		if (err || !res) {
			toast.error(t('section_create_failed'));
			return;
		}
		toast.success(t('section_create_success'));
		queryClient.invalidateQueries({
			predicate: (query) => {
				return (
					query.queryKey.includes('searchPublicSection') ||
					query.queryKey.includes('searchMySection')
				);
			},
		});
		router.push(`/section/detail/${res.id}`);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	const mutateCreateSectionLabel = useMutation({
		mutationKey: ['createSectionLabel'],
		mutationFn: createLabel,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['getSectionLabels'],
			});
		},
	});

	return (
		<div className='flex min-h-0 flex-1 flex-col overflow-x-hidden lg:h-[calc(100dvh-var(--private-top-header-height,3.5rem))] lg:max-h-[calc(100dvh-var(--private-top-header-height,3.5rem))] lg:overflow-hidden'>
			<AddSectionLabelDialog
				open={showAddLabelDialog}
				onOpenChange={setShowAddLabelDialog}
			/>
			<Form {...form}>
				<form
					onSubmit={onSubmitForm}
					className='flex min-h-0 w-full flex-1 flex-col gap-3 overflow-visible px-4 pb-4 pt-3 sm:px-5 md:pb-4 lg:h-full lg:max-h-full lg:overflow-hidden lg:px-6 lg:pt-3'>
					<div className='flex shrink-0 flex-col gap-2 border-b border-border/60 pb-3 pt-1 lg:flex-row lg:items-center lg:justify-between lg:gap-6'>
						<div className='min-w-0'>
							<p className='text-base font-semibold tracking-normal'>
								{t('section_create')}
							</p>
							<p className='mt-0.5 max-w-2xl text-sm text-muted-foreground'>
								{t('section_form_process_task_trigger_type_description')}
							</p>
						</div>
					</div>

					<div className='grid w-full grid-cols-1 gap-3 overflow-visible lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_400px]'>
						<section className='min-w-0 lg:min-h-0'>
							<div className='flex min-h-[520px] flex-col overflow-hidden rounded-md border border-border/70 bg-background shadow-sm lg:h-full lg:min-h-0'>
								<div className='flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-3'>
									<PanelTitle
										icon={Sparkles}
										title={t('section_create')}
									/>
								</div>
								<div className='min-h-0 flex-1 space-y-4 overflow-visible p-4 lg:overflow-y-auto'>
									<section className='space-y-3'>
										<FormField
											control={form.control}
											name='cover'
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>{t('section_form_cover')}</FormLabel>
														<ImageUpload
															className='h-44 rounded-md border-border/70 bg-muted/10 transition-colors hover:bg-muted/20 sm:h-52'
															onSuccess={async (fileName) => {
																field.onChange(fileName);
															}}
															onDelete={() => {
																field.onChange(null);
															}}
														/>
														<FormMessage />
													</FormItem>
												);
											}}
										/>
									</section>

									<FormField
										control={form.control}
										name='title'
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>{t('section_form_title')}</FormLabel>
													<Input
														className='h-11 rounded-md'
														placeholder={t('section_form_title_placeholder')}
														{...field}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										control={form.control}
										name='description'
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>{t('section_form_description')}</FormLabel>
													<Textarea
														className='min-h-40 resize-y rounded-md'
														placeholder={t(
															'section_form_description_placeholder',
														)}
														{...field}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</div>
							</div>
						</section>

						<aside className='min-w-0 space-y-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:min-h-0 lg:overflow-y-auto lg:pr-1'>
							<div className='space-y-3 rounded-md border border-border/70 bg-muted/20 p-3 shadow-sm'>
								<div className='space-y-3'>
									<PanelTitle
										icon={Tags}
										title={t('section_form_labels')}></PanelTitle>
									<FormField
										control={form.control}
										name='labels'
										render={({ field }) => {
											return (
												<FormItem className='space-y-2'>
													{labels ? (
														<MultipleSelector
															onCreate={async ({ label }) => {
																await mutateCreateSectionLabel.mutateAsync({
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
																	value.map(({ value }) => Number(value)),
																);
															}}
															value={
																field.value
																	? field.value.map((item) => item.toString())
																	: []
															}
															placeholder={t('section_form_labels_placeholder')}
														/>
													) : (
														<Skeleton className='h-11 rounded-md' />
													)}
												</FormItem>
											);
										}}
									/>
								</div>

								<div className='space-y-3 border-t border-border/60 pt-3'>
									<div className='flex items-start justify-between gap-3'>
										<PanelTitle
											icon={Settings2}
											title={t('section_form_process_task_trigger_type')}
										/>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													type='button'
													variant='ghost'
													size='icon'
													className='size-7 rounded-md'>
													<Info className='size-4' />
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												{t(
													'section_form_process_task_trigger_type_description',
												)}
											</TooltipContent>
										</Tooltip>
									</div>
									<FormField
										name='process_task_trigger_type'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<RadioGroup
														className='grid gap-3'
														value={
															field.value || field.value === 0
																? field.value.toString()
																: undefined
														}
														onValueChange={(e) => {
															field.onChange(Number(e));
														}}>
														<Label
															htmlFor='section-trigger-updated'
															className={cn(
																'flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-3 transition-colors hover:bg-muted/50',
																triggerType === 1 &&
																	'border-primary/40 bg-primary/5',
															)}>
															<div className='flex min-w-0 items-center gap-3'>
																<ListChecks className='size-4 shrink-0 text-muted-foreground' />
																<span className='font-medium'>
																	{t(
																		'section_form_process_task_trigger_type_updated',
																	)}
																</span>
															</div>
															<RadioGroupItem
																value='1'
																id='section-trigger-updated'
															/>
														</Label>
														<Label
															htmlFor='section-trigger-scheduled'
															className={cn(
																'flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-3 transition-colors hover:bg-muted/50',
																triggerType === 0 &&
																	'border-primary/40 bg-primary/5',
															)}>
															<div className='flex min-w-0 items-center gap-3'>
																<CalendarClock className='size-4 shrink-0 text-muted-foreground' />
																<span className='font-medium'>
																	{t(
																		'section_form_process_task_trigger_type_scheduler',
																	)}
																</span>
															</div>
															<RadioGroupItem
																value='0'
																id='section-trigger-scheduled'
															/>
														</Label>
													</RadioGroup>
												</FormItem>
											);
										}}
									/>
									{triggerType === 0 && (
										<FormField
											control={form.control}
											name='process_task_trigger_scheduler'
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel className='flex items-center gap-2'>
															{t('section_form_process_task_trigger_scheduler')}
															<Tooltip>
																<TooltipTrigger asChild>
																	<Info className='size-4 text-muted-foreground' />
																</TooltipTrigger>
																<TooltipContent>
																	{t(
																		'section_form_process_task_trigger_scheduler_alert',
																	)}
																	<Link
																		className='ml-1 underline underline-offset-2'
																		href={'https://en.wikipedia.org/wiki/Cron'}>
																		Cron wiki
																	</Link>
																</TooltipContent>
															</Tooltip>
														</FormLabel>
														<Input
															className='h-11 rounded-md font-mono'
															placeholder={t(
																'section_form_process_task_trigger_scheduler_placeholder',
															)}
															{...field}
														/>
														<FormMessage />
													</FormItem>
												);
											}}
										/>
									)}
								</div>

								<div className='space-y-3 border-t border-border/60 pt-3'>
									<PanelTitle
										icon={Sparkles}
										title={t('document_create_more_config')}
									/>
									<FormField
										name='auto_publish'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<AutomationOption
														icon={Globe2}
														title={t('section_form_auto_publish')}
														description={t(
															'section_form_auto_publish_description',
														)}
														checked={field.value}
														disabled={false}
														onCheckedChange={field.onChange}
													/>
												</FormItem>
											);
										}}
									/>

									<FormField
										name='auto_podcast'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<AutomationOption
														icon={Podcast}
														title={t('section_form_auto_podcast')}
														description={t(
															'section_form_auto_podcast_description',
														)}
														checked={field.value}
														disabled={podcastEngineUnavailable && !field.value}
														onCheckedChange={field.onChange}
														alert={
															podcastEngineUnavailable
																? podcastEngine.subscriptionLocked
																	? t('default_resource_subscription_locked')
																	: t('section_form_auto_podcast_engine_unset')
																: undefined
														}
													/>
												</FormItem>
											);
										}}
									/>

									<FormField
										name='auto_illustration'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<AutomationOption
														icon={ImageIcon}
														title={t('section_form_auto_illustration')}
														description={t(
															'section_form_auto_illustration_description',
														)}
														checked={field.value}
														disabled={
															imageGenerateEngineUnavailable && !field.value
														}
														onCheckedChange={field.onChange}
														alert={
															imageGenerateEngineUnavailable
																? imageGenerateEngine.subscriptionLocked
																	? t('default_resource_subscription_locked')
																	: t(
																			'section_form_auto_illustration_engine_unset',
																		)
																: undefined
														}
													/>
												</FormItem>
											);
										}}
									/>
								</div>
							</div>

							<Button
								className='h-11 w-full rounded-md'
								type='submit'
								disabled={submitDisabled}>
								{form.formState.isSubmitting ? (
									<Loader2 className='size-4 animate-spin' />
								) : (
									<CheckCircle2 className='size-4' />
								)}
								{t('section_create_form_submit')}
							</Button>
						</aside>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default CreatePage;
