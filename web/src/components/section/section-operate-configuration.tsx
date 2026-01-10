import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Loader2, OctagonAlert, PencilIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import CoverUpdate from './cover-update';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { utils } from '@kinda/utils';
import {
	createLabel,
	getMineLabels,
	getSectionDetail,
	updateSection,
} from '@/service/section';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import MultipleSelector from '../ui/multiple-selector';
import { Skeleton } from '../ui/skeleton';
import AddSectionLabelDialog from './add-section-label-dialog';
import { useTranslations } from 'next-intl';
import { cn, diffValues } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { useUserContext } from '@/provider/user-provider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import Link from 'next/link';
import { useRef } from 'react';

const SectionOperateConfiguration = ({
	section_id,
	className,
}: {
	section_id: number;
	className?: string;
}) => {
	const t = useTranslations();

	const initialValuesRef = useRef<Partial<
		z.infer<typeof updateFormSchema>
	> | null>(null);

	const updateFormSchema = z.object({
		section_id: z.number().int(),
		cover: z.string().optional(),
		title: z.string().min(1),
		description: z.string().min(1),
		labels: z.array(z.number()),
		auto_podcast: z.boolean(),
		auto_illustration: z.boolean(),
		process_task_trigger_type: z.number().optional().nullable(),
		process_task_trigger_scheduler: z.string().optional().nullable(),
	});
	const id = section_id;

	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);

	const { data: labels } = useQuery({
		queryKey: ['getSectionLabels'],
		queryFn: getMineLabels,
	});

	const { mainUserInfo } = useUserContext();

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	const form = useForm({
		defaultValues: {
			section_id: id,
			title: '',
			cover: undefined,
			description: '',
			labels: [],
			auto_podcast: false,
			auto_illustration: false,
		},
		resolver: zodResolver(updateFormSchema),
	});

	useEffect(() => {
		if (!section) return;

		const initialValues = {
			section_id: id,
			title: section.title || '',
			description: section.description || '',
			cover: section.cover || undefined,
			labels: section.labels?.map((label) => label.id) || [],
			auto_podcast: section.auto_podcast,
			auto_illustration: section.auto_illustration,
			process_task_trigger_type: section.process_task_trigger_type,
			process_task_trigger_scheduler:
				section.process_task_trigger_scheduler || '',
		};

		form.reset(initialValues);
		initialValuesRef.current = initialValues;
	}, [section]);

	const [updating, setUpdating] = useState<boolean>(false);

	const queryClient = getQueryClient();

	const onSubmitUpdateForm = async (
		event: React.FormEvent<HTMLFormElement>
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

	const onFormValidateSuccess = async (
		values: z.infer<typeof updateFormSchema>
	) => {
		if (!initialValuesRef.current) return;

		const patch = diffValues(values, initialValuesRef.current);

		// 如果啥都没改
		if (Object.keys(patch).length === 0) {
			toast.info(t('form_no_change'));
			return;
		}

		setUpdating(true);

		const [res, err] = await utils.to(
			updateSection({
				...values,
				cover: values.cover,
			})
		);
		if (err) {
			toast.error(t('section_update_failed'));
			setUpdating(false);
			return;
		}
		toast.success(t('section_update_success'));
		setUpdating(false);
		queryClient.invalidateQueries({ queryKey: ['getSectionDetail', id] });
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
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
		<Sheet>
			<SheetTrigger asChild>
				<Button className={cn('text-xs', className)} variant={'ghost'}>
					<PencilIcon />
					{t('section_configuration_label')}
				</Button>
			</SheetTrigger>
			<SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<SheetHeader>
					<SheetTitle>{t('section_configuration_label')}</SheetTitle>
					<SheetDescription>{t('section_form_description')}</SheetDescription>
				</SheetHeader>
				<div className='px-5 flex flex-col gap-5 overflow-auto flex-1'>
					<Form {...form}>
						<form
							onSubmit={onSubmitUpdateForm}
							id='update-form'
							className='space-y-5'>
							{section?.cover && <CoverUpdate />}
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>{t('section_form_title')}</FormLabel>
											<Input
												{...field}
												placeholder={t('section_form_title_placeholder')}
											/>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='description'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>{t('section_form_description')}</FormLabel>
											<Textarea
												{...field}
												placeholder={t('section_form_description_placeholder')}
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
											<AddSectionLabelDialog
												open={showAddLabelDialog}
												onOpenChange={setShowAddLabelDialog}
											/>
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
													disabled={
														!mainUserInfo?.default_podcast_user_engine_id
													}
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
											{!mainUserInfo?.default_podcast_user_engine_id && (
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
													field.value !== undefined
														? field.value!.toString()
														: undefined
												}
												onValueChange={(e) => {
													field.onChange(Number(e));
												}}>
												<div className='rounded-lg border border-input p-3 flex flex-row items-center justify-between'>
													<Label htmlFor='r1'>
														{t(
															'section_form_process_task_trigger_type_updated'
														)}
													</Label>
													<RadioGroupItem value='1' id='r1' />
												</div>
												<div className='rounded-lg border border-input p-3 flex flex-row items-center justify-between'>
													<Label htmlFor='r0'>
														{t(
															'section_form_process_task_trigger_type_scheduler'
														)}
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
													value={field.value || ''}
												/>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
							)}
						</form>
					</Form>
				</div>
				<SheetFooter>
					<Button type='submit' form='update-form' disabled={updating}>
						{t('section_configuration_form_submit')}
						{updating && <Loader2 className='animate-spin' />}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateConfiguration;
