'use client';

import AddSectionLabelDialog from '@/components/section/add-section-label-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getQueryClient } from '@/lib/get-query-client';
import { useUserContext } from '@/provider/user-provider';
import { createLabel, createSection, getMineLabels } from '@/service/section';
import { zodResolver } from '@hookform/resolvers/zod';
import { utils } from '@kinda/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Info, OctagonAlert } from 'lucide-react';
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

	const { mainUserInfo } = useUserContext();

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
			})
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
		<div className='px-5 pb-5'>
			<AddSectionLabelDialog
				open={showAddLabelDialog}
				onOpenChange={setShowAddLabelDialog}
			/>
			<Form {...form}>
				<form onSubmit={onSubmitForm}>
					<FormField
						control={form.control}
						name='cover'
						render={({ field }) => {
							return (
								<FormItem className='mb-5'>
									<ImageUpload
										className='h-40'
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
					<FormField
						control={form.control}
						name='title'
						render={({ field }) => {
							return (
								<FormItem className='mb-5'>
									<FormLabel>{t('section_form_title')}</FormLabel>
									<Input
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
								<FormItem className='mb-5'>
									<FormLabel>{t('section_form_description')}</FormLabel>
									<Textarea
										placeholder={t('section_form_description_placeholder')}
										{...field}
									/>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name='labels'
						render={({ field }) => {
							return (
								<FormItem className='space-y-0 mb-5'>
									<FormLabel>{t('section_form_labels')}</FormLabel>
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
													value.map(({ label, value }) => Number(value))
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
										<Skeleton className='h-10' />
									)}
									<div className='text-muted-foreground text-xs flex flex-row gap-0 items-center'>
										<span>{t('section_form_labels_empty_tips')}</span>
										<Button
											type='button'
											className='text-xs text-muted-foreground px-0 py-0 h-fit'
											variant={'link'}
											onClick={() => setShowAddLabelDialog(true)}>
											{t('section_form_label_create')}
										</Button>
									</div>
								</FormItem>
							);
						}}
					/>
					<FormField
						name='process_task_trigger_type'
						control={form.control}
						render={({ field }) => {
							return (
								<FormItem className='mb-5'>
									<FormLabel>
										{t('section_form_process_task_trigger_type')}
										<Tooltip>
											<TooltipTrigger>
												<Info size={15} />
											</TooltipTrigger>
											<TooltipContent>
												{t(
													'section_form_process_task_trigger_type_description'
												)}
											</TooltipContent>
										</Tooltip>
									</FormLabel>
									<RadioGroup
										className='grid grid-cols-1 md:grid-cols-2 gap-5'
										value={
											field.value || field.value === 0
												? field.value.toString()
												: undefined
										}
										onValueChange={(e) => {
											field.onChange(Number(e));
										}}>
										<div className='rounded-lg border border-input p-3 flex flex-row items-center justify-between'>
											<Label htmlFor='r1'>
												{t('section_form_process_task_trigger_type_updated')}
											</Label>
											<RadioGroupItem value='1' id='r1' />
										</div>
										<div className='rounded-lg border border-input p-3 flex flex-row items-center justify-between'>
											<Label htmlFor='r0'>
												{t('section_form_process_task_trigger_type_scheduler')}
											</Label>
											<RadioGroupItem value='0' id='r0' />
										</div>
									</RadioGroup>
								</FormItem>
							);
						}}
					/>
					{form.watch('process_task_trigger_type') === 0 && (
						<FormField
							control={form.control}
							name='process_task_trigger_scheduler'
							render={({ field }) => {
								return (
									<FormItem className='mb-5'>
										<FormLabel>
											{t('section_form_process_task_trigger_scheduler')}
											<Tooltip>
												<TooltipTrigger>
													<Info size={15} />
												</TooltipTrigger>
												<TooltipContent>
													{t(
														'section_form_process_task_trigger_scheduler_alert'
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
											className='font-mono'
											placeholder={t(
												'section_form_process_task_trigger_scheduler_placeholder'
											)}
											{...field}
										/>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
					)}
					<div className='grid grid-cols-1 md:grid-cols-3 gap-5 mb-5'>
						<FormField
							name='auto_publish'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem className='rounded-lg border border-input p-3'>
										<div className='flex flex-row gap-1 items-center'>
											<FormLabel className='flex flex-row gap-1 items-center'>
												{t('section_form_auto_publish')}
											</FormLabel>
											<Switch
												checked={field.value}
												onCheckedChange={(e) => {
													field.onChange(e);
												}}
											/>
										</div>
										<FormDescription>
											{t('section_form_auto_publish_description')}
										</FormDescription>
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
												{t('section_form_auto_podcast')}
											</FormLabel>
											<Switch
												disabled={!mainUserInfo?.default_podcast_user_engine_id}
												checked={field.value}
												onCheckedChange={(e) => {
													field.onChange(e);
												}}
											/>
										</div>
										<FormDescription>
											{t('section_form_auto_podcast_description')}
										</FormDescription>
										{!mainUserInfo?.default_podcast_user_engine_id && (
											<Alert className='bg-destructive/10 dark:bg-destructive/20'>
												<OctagonAlert className='h-4 w-4 text-destructive!' />
												<AlertDescription>
													{t('section_form_auto_podcast_engine_unset')}
												</AlertDescription>
											</Alert>
										)}
									</FormItem>
								);
							}}
						/>
						<FormField
							name='auto_illustration'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem className='rounded-lg border border-input p-3'>
										<div className='flex flex-row gap-1 items-center'>
											<FormLabel className='flex flex-row gap-1 items-center'>
												{t('section_form_auto_illustration')}
											</FormLabel>
											<Switch
												disabled={
													!mainUserInfo?.default_image_generate_engine_id
												}
												checked={field.value}
												onCheckedChange={(e) => {
													field.onChange(e);
												}}
											/>
										</div>
										<FormDescription>
											{t('section_form_auto_illustration_description')}
										</FormDescription>
										{!mainUserInfo?.default_image_generate_engine_id && (
											<Alert className='bg-destructive/10 dark:bg-destructive/20'>
												<OctagonAlert className='h-4 w-4 text-destructive!' />
												<AlertDescription>
													{t('section_form_auto_illustration_engine_unset')}
												</AlertDescription>
											</Alert>
										)}
									</FormItem>
								);
							}}
						/>
					</div>
					<Button className='w-full' type='submit'>
						{t('section_create_form_submit')}
					</Button>
				</form>
			</Form>
		</div>
	);
};

export default CreatePage;
