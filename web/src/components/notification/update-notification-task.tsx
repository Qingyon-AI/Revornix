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
	getNotificationTaskDetail,
	getTriggerEvents,
	getUsableNotificationSources,
	getUsableNotificationTargets,
	updateNotificationTask,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
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
import { Info, Loader2 } from 'lucide-react';
import Link from 'next/link';

const UpdateNotificationTask = ({
	notification_task_id,
}: {
	notification_task_id: number;
}) => {
	const locale = useLocale();
	const { data, isFetching } = useQuery({
		queryKey: ['notification-task-detail', notification_task_id],
		queryFn: async () => {
			return await getNotificationTaskDetail({
				notification_task_id: notification_task_id,
			});
		},
	});
	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z
		.object({
			notification_task_id: z.number(),
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

	const { data: triggerEvents } = useQuery({
		queryKey: ['notification-trigger-event'],
		queryFn: getTriggerEvents,
	});

	const { data: mineNotificationSources } = useQuery({
		queryKey: ['searchUsableNotificationSources'],
		queryFn: getUsableNotificationSources,
	});

	const { data: mineNotificationTargets } = useQuery({
		queryKey: ['searchUsableNotificationTargets'],
		queryFn: getUsableNotificationTargets,
	});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_task_id: notification_task_id,
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

	const mutateUpdateNotificationTask = useMutation({
		mutationFn: updateNotificationTask,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				predicate(query) {
					return query.queryKey.includes('notification-task');
				},
			});
			queryClient.invalidateQueries({
				queryKey: ['notification-task-detail', notification_task_id],
			});
			form.reset();
			setShowUpdateDialog(false);
		},
		onError(error, variables, context) {
			toast.error(error.message);
			return;
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateUpdateNotificationTask.mutate(values);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	useEffect(() => {
		if (data) {
			const defaultValues = {
				notification_task_id: notification_task_id,
				title: data.title,
				trigger_event_id: data.trigger_event?.trigger_event_id,
				enable: data.enable,
				notification_source_id: data.notification_source?.id,
				notification_target_id: data.notification_target?.id,
			};
			form.reset(defaultValues, {});
		}
	}, [data, form, notification_task_id]);

	return (
		<>
			<Button onClick={() => setShowUpdateDialog(true)}>{t('edit')}</Button>
			<Dialog
				open={showUpdateDialog}
				onOpenChange={(e) => {
					if (!e) {
						form.reset();
					}
					setShowUpdateDialog(e);
				}}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-4xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>
							{t('setting_notification_task_manage_update_label')}
						</DialogTitle>
						<Alert>
							<Info />
							<AlertDescription>
								{t('setting_notification_task_manage_update_alert')}
							</AlertDescription>
						</Alert>
					</DialogHeader>
					<Form {...form}>
						<form
							onSubmit={onSubmitForm}
							className='flex min-h-0 flex-1 flex-col'
							id='update-notification-task-form'>
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
															{mineNotificationSources?.data.length ? (
																<SelectGroup>
																	{mineNotificationSources.data.map(
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
																<SelectEmpty
																	message={t(
																		'setting_notification_source_manage_empty',
																	)}
																/>
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
															field.onChange(Number(e));
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
									form='update-notification-task-form'
									disabled={mutateUpdateNotificationTask.isPending}>
									{t('submit')}
									{mutateUpdateNotificationTask.isPending && (
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

export default UpdateNotificationTask;
