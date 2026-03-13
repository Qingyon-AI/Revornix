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
import { useEffect, useMemo, useState } from 'react';
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
import type { SectionInfo } from '@/generated';

const updateFormSchema = z.object({
	section_id: z.number().int(),
	cover: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	labels: z.array(z.number()).optional(),
	auto_podcast: z.boolean().optional(),
	auto_illustration: z.boolean().optional(),
	process_task_trigger_type: z.number().optional(),
	process_task_trigger_scheduler: z.string().optional(),
});

type UpdateFormValues = z.infer<typeof updateFormSchema>;
const formBlockClassName =
	'space-y-3 rounded-2xl border border-border/60 bg-background/35 p-4';

const normalizeSectionFormValues = (
	values: Partial<UpdateFormValues>,
): UpdateFormValues => {
	return {
		section_id: values.section_id ?? 0,
		title: values.title || '',
		description: values.description || '',
		cover: values.cover || undefined,
		labels: values.labels || [],
		auto_podcast: values.auto_podcast ?? false,
		auto_illustration: values.auto_illustration ?? false,
		process_task_trigger_type: values.process_task_trigger_type ?? undefined,
		process_task_trigger_scheduler: values.process_task_trigger_scheduler || '',
	};
};

const buildSectionFormValues = (
	section_id: number,
	section?: SectionInfo,
): UpdateFormValues => {
	return normalizeSectionFormValues({
		section_id,
		title: section?.title,
		description: section?.description,
		cover: section?.cover || undefined,
		labels: section?.labels?.map((label) => label.id),
		auto_podcast: section?.auto_podcast,
		auto_illustration: section?.auto_illustration,
		process_task_trigger_type:
			section?.process_task_trigger_type ?? undefined,
		process_task_trigger_scheduler:
			section?.process_task_trigger_scheduler || undefined,
	});
};

const SectionOperateConfiguration = ({
	section_id,
	className,
	onTriggerClick,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
}) => {
	const t = useTranslations();

	const initialValuesRef = useRef<UpdateFormValues | null>(null);
	const id = section_id;

	const [open, setOpen] = useState(false);
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

	const form = useForm<UpdateFormValues>({
		defaultValues: buildSectionFormValues(id),
		resolver: zodResolver(updateFormSchema),
	});

	const sectionInitialValues = useMemo(() => {
		if (!section) {
			return null;
		}
		return buildSectionFormValues(id, section);
	}, [id, section]);

	useEffect(() => {
		if (!open || !sectionInitialValues) {
			return;
		}
		if (form.formState.isDirty && initialValuesRef.current) {
			return;
		}

		form.reset(sectionInitialValues);
		initialValuesRef.current = sectionInitialValues;
	}, [form, form.formState.isDirty, open, sectionInitialValues]);

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
		values: UpdateFormValues
	) => {
		if (!initialValuesRef.current) return;

		const normalizedValues = normalizeSectionFormValues({
			...values,
			section_id: id,
		});

		const patch = diffValues(normalizedValues, initialValuesRef.current);

		// 如果啥都没改
		if (Object.keys(patch).length === 0) {
			toast.info(t('form_no_change'));
			return;
		}

		setUpdating(true);

		const [res, err] = await utils.to(
			updateSection({
				section_id: id,
				...patch,
			})
		);
		if (err) {
			toast.error(t('section_update_failed'));
			setUpdating(false);
			return;
		}

		form.reset(normalizedValues);
		initialValuesRef.current = normalizedValues;
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
		<Sheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (nextOpen && sectionInitialValues) {
					form.reset(sectionInitialValues);
					initialValuesRef.current = sectionInitialValues;
				}
				setOpen(nextOpen);
			}}>
			<SheetTrigger asChild>
				<Button
					className={cn('text-xs', className)}
					variant={'ghost'}
					onClick={onTriggerClick}>
					<PencilIcon />
					{t('section_configuration_label')}
				</Button>
			</SheetTrigger>
			<SheetContent className='flex h-full flex-col gap-0 overflow-hidden bg-card/95 pt-0 sm:max-w-xl'>
				<SheetHeader className='border-b border-border/60 px-5 pt-6 pb-3 pr-12 text-left'>
					<SheetTitle className='text-xl'>
						{t('section_configuration_label')}
					</SheetTitle>
					<SheetDescription className='max-w-md text-sm leading-6'>
						{t('section_form_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5'>
					<Form {...form}>
						<form
							onSubmit={onSubmitUpdateForm}
							id='update-form'
							className='space-y-4'>
							<CoverUpdate ownerId={section?.creator.id} />
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className={formBlockClassName}>
											<FormLabel>{t('section_form_title')}</FormLabel>
											<Input
												className='bg-background/60'
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
										<FormItem className={formBlockClassName}>
											<FormLabel>{t('section_form_description')}</FormLabel>
											<Textarea
												className='min-h-28 bg-background/60'
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
										<FormItem className={formBlockClassName}>
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
											<div className='flex flex-row items-center gap-0 text-xs text-muted-foreground'>
												<span>{t('section_form_labels_empty_tips')}</span>
												<Button
													type='button'
													className='h-fit px-0 py-0 text-xs text-muted-foreground'
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
										<FormItem className={formBlockClassName}>
											<div className='flex flex-row items-center justify-between gap-3'>
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
										<FormItem className={formBlockClassName}>
											<div className='flex flex-row items-center justify-between gap-3'>
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
							<FormField
								name='process_task_trigger_type'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className={formBlockClassName}>
											<FormLabel className='flex items-center gap-1.5'>
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
												className='grid grid-cols-1 gap-3 md:grid-cols-2'
												value={
													field.value !== undefined
														? field.value!.toString()
														: undefined
												}
												onValueChange={(e) => {
													field.onChange(Number(e));
												}}>
												<div className='flex flex-row items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3'>
													<Label htmlFor='r1'>
														{t(
															'section_form_process_task_trigger_type_updated'
														)}
													</Label>
													<RadioGroupItem value='1' id='r1' />
												</div>
												<div className='flex flex-row items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3'>
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
											<FormItem className={formBlockClassName}>
												<FormLabel className='flex items-center gap-1.5'>
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
													className='bg-background/60 font-mono'
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
				<SheetFooter className='shrink-0 border-t border-border/60 bg-card/95 px-4 pb-4 pt-3 backdrop-blur sm:px-5 sm:pb-5'>
					<Button
						type='submit'
						form='update-form'
						disabled={updating}
						className='w-full rounded-2xl'>
						{t('section_configuration_form_submit')}
						{updating && <Loader2 className='animate-spin' />}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateConfiguration;
