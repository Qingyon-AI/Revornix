'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getQueryClient } from '@/lib/get-query-client';
import {
	addNotificationTask,
	getTriggerEvents,
	getUsableNotificationSources,
	getUsableNotificationTargets,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import SelectEmpty from '../ui/select-empty';
import { Switch } from '../ui/switch';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, Loader2, PlusCircleIcon } from 'lucide-react';
import Link from 'next/link';

const AddNotificationTask = () => {
	const locale = useLocale();
	const t = useTranslations();
	const queryClient = getQueryClient();

	const formSchema = z
		.object({
			title: z.string(),
			trigger_event_id: z.coerce
				.number({
					required_error: 'Please select the trigger event',
				})
				.int()
				.positive('Please select the trigger event'),
			enable: z.boolean(),
			notification_source_id: z.coerce
				.number({
					required_error: 'Please select the source',
				})
				.int()
				.positive('Please select the source'),
			notification_target_id: z.coerce
				.number({
					required_error: 'Please select the target',
				})
				.int()
				.positive('Please select the target'),
		})
		.superRefine((data, ctx) => {
			if (!data.title || data.title.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Title is required',
					path: ['title'],
				});
			}

		});

	const { data: mineNotificationSources } = useQuery({
		queryKey: ['searchUsableNotificationSources'],
		queryFn: getUsableNotificationSources,
	});

	const { data: mineNotificationTargets } = useQuery({
		queryKey: ['searchUsableNotificationTargets'],
		queryFn: getUsableNotificationTargets,
	});

	const [showAddDialog, setShowAddDialog] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			enable: true,
		},
	});

	const selectedSourceId = form.watch('notification_source_id');
	const selectedTargetId = form.watch('notification_target_id');

	const selectedSourceCategory = useMemo(() => {
		if (!selectedSourceId || !mineNotificationSources?.data) return undefined;
		return mineNotificationSources.data.find((s) => s.id === selectedSourceId)
			?.notification_source_provided?.category;
	}, [selectedSourceId, mineNotificationSources?.data]);

	const selectedTargetCategory = useMemo(() => {
		if (!selectedTargetId || !mineNotificationTargets?.data) return undefined;
		return mineNotificationTargets.data.find((t) => t.id === selectedTargetId)
			?.notification_target_provided?.category;
	}, [selectedTargetId, mineNotificationTargets?.data]);

	const filteredSources = useMemo(() => {
		if (!mineNotificationSources?.data) return [];
		if (!selectedTargetCategory) return mineNotificationSources.data;
		return mineNotificationSources.data.filter(
			(s) => s.notification_source_provided?.category === selectedTargetCategory,
		);
	}, [mineNotificationSources?.data, selectedTargetCategory]);

	const filteredTargets = useMemo(() => {
		if (!mineNotificationTargets?.data) return [];
		if (!selectedSourceCategory) return mineNotificationTargets.data;
		return mineNotificationTargets.data.filter(
			(t) => t.notification_target_provided?.category === selectedSourceCategory,
		);
	}, [mineNotificationTargets?.data, selectedSourceCategory]);

	const { data: triggerEvents } = useQuery({
		queryKey: ['notification-trigger-event'],
		queryFn: getTriggerEvents,
	});

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

	const mutateAddNotificationTask = useMutation({
		mutationFn: addNotificationTask,
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate(query) {
					return query.queryKey.includes('notification-task');
				},
			});
			form.reset();
			setShowAddDialog(false);
		},
		onError(error, variables, context) {
			toast.error(error.message);
			return;
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateAddNotificationTask.mutate(values);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	return (
		<>
			<Button onClick={() => setShowAddDialog(true)}>
				{t('setting_notification_task_manage_add_label')}
				<PlusCircleIcon />
			</Button>
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-4xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>
							{t('setting_notification_task_manage_add_label')}
						</DialogTitle>
						<Alert>
							<Info />
							<AlertDescription>
								{t('setting_notification_task_manage_add_alert')}
							</AlertDescription>
						</Alert>
					</DialogHeader>
					<Form {...form}>
						<form
							onSubmit={onSubmitForm}
							className='flex min-h-0 flex-1 flex-col'
							id='add-notification-task-form'>
							<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
								<div className='space-y-3'>
									<FormField
										name='title'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_task_manage_form_task_title',
														)}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_task_manage_form_task_title_placeholder',
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='notification_source_id'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('setting_notification_task_manage_form_source')}
													</FormLabel>
													<Select
														value={
															field.value ? String(field.value) : undefined
														}
														onValueChange={(e) => {
															const newSourceId = Number(e);
															const newTypeName =
																mineNotificationSources?.data.find(
																	(s) => s.id === newSourceId,
																)?.notification_source_provided?.category;
															const currentTargetId = form.getValues(
																'notification_target_id',
															);
															if (currentTargetId) {
																const currentTarget =
																	mineNotificationTargets?.data.find(
																		(t) => t.id === currentTargetId,
																	);
																if (
																	currentTarget?.notification_target_provided
																		?.category !== newTypeName
																) {
																	form.setValue(
																		'notification_target_id',
																		undefined as any,
																	);
																}
															}
															field.onChange(newSourceId);
														}}>
														<SelectTrigger className='w-full'>
															<SelectValue
																placeholder={t(
																	'setting_notification_task_manage_form_source_placeholder',
																)}
															/>
														</SelectTrigger>
														<SelectContent>
															{filteredSources.length ? (
																<SelectGroup>
																	{filteredSources.map(
																		(item, index) => {
																			return (
																				<SelectItem
																					value={item.id.toString()}
																					key={index}>
																					{item.title}
																				</SelectItem>
																			);
																		},
																	)}
																</SelectGroup>
															) : (
																<div className='px-3 py-2 text-sm text-muted-foreground'>
																	{t('setting_notification_source_manage_empty')}
																	<Link
																		href='/setting/notification/source-manage'
																		className='ml-1 text-primary underline underline-offset-2'>
																		{t('setting_notification_source_manage_add_label')}
																	</Link>
																</div>
															)}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='notification_target_id'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('setting_notification_task_manage_form_target')}
													</FormLabel>
													<Select
														value={
															field.value ? String(field.value) : undefined
														}
														onValueChange={(e) => {
															const newTargetId = Number(e);
															const newCategory =
																mineNotificationTargets?.data.find(
																	(t) => t.id === newTargetId,
																)?.notification_target_provided?.category;
															const currentSourceId = form.getValues(
																'notification_source_id',
															);
															if (currentSourceId) {
																const currentSource =
																	mineNotificationSources?.data.find(
																		(s) => s.id === currentSourceId,
																	);
																if (
																	currentSource?.notification_source_provided
																		?.category !== newCategory
																) {
																	form.setValue(
																		'notification_source_id',
																		undefined as any,
																	);
																}
															}
															field.onChange(newTargetId);
														}}>
														<SelectTrigger className='w-full'>
															<SelectValue
																placeholder={t(
																	'setting_notification_task_manage_form_target_placeholder',
																)}
															/>
														</SelectTrigger>
														<SelectContent>
															{filteredTargets.length ? (
																<SelectGroup>
																	{filteredTargets.map((item, index) => {
																		return (
																			<SelectItem
																				value={item.id.toString()}
																				key={index}>
																				{item.title}
																			</SelectItem>
																		);
																	})}
																</SelectGroup>
															) : (
																<div className='px-3 py-2 text-sm text-muted-foreground'>
																	{t('setting_notification_target_manage_empty_with_link')}
																	<Link
																		href='/setting/notification/target-manage'
																		className='ml-1 text-primary underline underline-offset-2'>
																		{t('setting_notification_target_manage_add_form_label')}
																	</Link>
																</div>
															)}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='trigger_event_id'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_task_manage_form_trigger_event_id',
														)}
													</FormLabel>
													<Select
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														value={
															field.value || field.value === 0
																? String(field.value)
																: undefined
														}>
														<SelectTrigger className='w-full'>
															<SelectValue
																placeholder={t(
																	'setting_notification_task_manage_form_trigger_event_id_placeholder',
																)}>
																{(() => {
																	const sel = triggerEvents?.data.find(
																		(item) => item.id === field.value,
																	);
																	return sel
																		? locale === 'zh'
																			? sel.name_zh
																			: sel.name
																		: null;
																})()}
															</SelectValue>
														</SelectTrigger>
														<SelectContent className='w-full'>
															{triggerEvents?.data.length ? (
																<SelectGroup>
																	{triggerEvents.data.map((item, index) => {
																		return (
																			<SelectItem
																				key={index}
																				value={item.id.toString()}>
																				<div className='flex flex-col w-fit'>
																					<div className='font-bold text-xs w-fit'>
																						{locale === 'zh'
																							? item.name_zh
																							: item.name}
																					</div>
																					<div className='font-bold text-xs text-muted-foreground w-fit'>
																						{locale === 'zh'
																							? item.description_zh
																							: item.description}
																					</div>
																				</div>
																			</SelectItem>
																		);
																	})}
																</SelectGroup>
															) : (
																<SelectEmpty message={t('select_empty')} />
															)}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='enable'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem className='flex flex-row items-center justify-between border rounded-xl p-3'>
													<div className='space-y-1'>
														<FormLabel>
															{t(
																'setting_notification_task_manage_form_enable',
															)}
														</FormLabel>
														<FormDescription>
															{t(
																'setting_notification_task_manage_form_enable_alert',
															)}
														</FormDescription>
													</div>
													<FormControl>
														<Switch
															checked={field.value}
															onCheckedChange={field.onChange}
														/>
													</FormControl>
												</FormItem>
											);
										}}
									/>
								</div>
							</div>
							<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
								<Button
									type='submit'
									form='add-notification-task-form'
									disabled={mutateAddNotificationTask.isPending}>
									{t('submit')}
									{mutateAddNotificationTask.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
								<DialogClose asChild>
									<Button variant='outline'>{t('cancel')}</Button>
								</DialogClose>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default AddNotificationTask;
