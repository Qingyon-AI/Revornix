'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
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
	getMineNotificationSources,
	getMineNotificationTargets,
	getNotificationTaskDetail,
	getNotificationTemplate,
	getTriggerEvents,
	updateNotificationTask,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { NotificationTriggerType } from '@/enums/notification';
import FileUpload from '../document/file-upload';

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
			notification_title: z.string().optional().nullable(),
			notification_content: z.string().optional().nullable(),
			notification_cover: z.string().optional().nullable(),
			notification_link: z.string().optional().nullable(),
			notification_content_type: z.number(),
			notification_template_id: z.coerce
				.number({
					required_error: 'Please select the template',
				})
				.optional(),
			trigger_type: z.number(),
			trigger_scheduler_cron: z.string().optional(),
			trigger_event_id: z.number().optional(),
			enable: z.boolean(),
			user_notification_source_id: z.coerce.number().optional(),
			user_notification_target_id: z.coerce.number().optional(),
		})
		.superRefine((data, ctx) => {
			// If content type is 0 => title required
			if (data.notification_content_type === 0) {
				if (!data.title || data.title.trim() === '') {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Title is required when content type is 'custom content'",
						path: ['title'],
					});
				}
			}

			// If content type is 1 => template_id required
			if (data.notification_content_type === 1) {
				if (!data.notification_template_id) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Template is required when content type is 'template'",
						path: ['notification_template_id'],
					});
				}
			}
		});

	const { data: triggerEvents } = useQuery({
		queryKey: ['notification-trigger-event'],
		queryFn: getTriggerEvents,
	});

	const { data: notificationTemplates } = useQuery({
		queryKey: ['notification-template'],
		queryFn: getNotificationTemplate,
	});

	const { data: mineNotificationSources } = useQuery({
		queryKey: ['notification-source'],
		queryFn: getMineNotificationSources,
	});

	const { data: mineNotificationTargets } = useQuery({
		queryKey: ['notification-target'],
		queryFn: getMineNotificationTargets,
	});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_task_id: notification_task_id,
			title: '',
			notification_title: '',
			notification_content: '',
			enable: true,
			notification_content_type: 0,
		},
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
			const defaultValues: z.infer<typeof formSchema> = {
				notification_task_id: notification_task_id,
				title: data.title,
				trigger_type: data.trigger_type,
				trigger_scheduler_cron: data.trigger_scheduler?.cron_expr,
				trigger_event_id: data.trigger_event?.trigger_event_id,
				enable: data.enable,
				user_notification_source_id: data.user_notification_source?.id,
				user_notification_target_id: data.user_notification_target?.id,
				notification_content_type: data.notification_content_type,
				notification_title: data.notification_title ?? undefined,
				notification_content: data.notification_content ?? undefined,
				notification_template_id: data.notification_template_id ?? undefined,
				notification_cover: data.notification_cover ?? undefined,
				notification_link: data.notification_link ?? undefined,
			};
			form.reset(defaultValues, {});
		}
	}, [data, notification_task_id]);

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
				<DialogContent
					className='flex flex-col max-h-[80vh]'
					onOpenAutoFocus={(e) => e.preventDefault()}>
					<DialogTitle>
						{t('setting_notification_task_manage_update_label')}
					</DialogTitle>
					<Alert>
						<Info />
						<AlertDescription>
							{t('setting_notification_task_manage_update_alert')}
						</AlertDescription>
					</Alert>
					<Form {...form}>
						<form
							onSubmit={onSubmitForm}
							className='space-y-3 flex-1 overflow-auto px-1'
							id='update-notification-task-form'>
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>
												{t('setting_notification_task_manage_form_task_title')}
											</FormLabel>
											<Input
												{...field}
												placeholder={t(
													'setting_notification_task_manage_form_task_title_placeholder'
												)}
											/>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='user_notification_source_id'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>
												{t('setting_notification_task_manage_form_source')}
											</FormLabel>
											<Select
												value={field.value ? String(field.value) : undefined}
												onValueChange={(e) => {
													field.onChange(Number(e));
												}}>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'setting_notification_task_manage_form_source_placeholder'
														)}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{mineNotificationSources?.data.map(
															(item, index) => {
																return (
																	<SelectItem
																		value={item.id.toString()}
																		key={index}>
																		{item.title}
																	</SelectItem>
																);
															}
														)}
													</SelectGroup>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='user_notification_target_id'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>
												{t('setting_notification_task_manage_form_target')}
											</FormLabel>
											<Select
												value={field.value ? String(field.value) : undefined}
												onValueChange={(e) => {
													field.onChange(Number(e));
												}}>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'setting_notification_task_manage_form_target_placeholder'
														)}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{mineNotificationTargets?.data.map(
															(item, index) => {
																return (
																	<SelectItem
																		value={item.id.toString()}
																		key={index}>
																		{item.title}
																	</SelectItem>
																);
															}
														)}
													</SelectGroup>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='trigger_type'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>
												{t(
													'setting_notification_task_manage_form_trigger_type'
												)}
											</FormLabel>
											<Select
												onValueChange={(value) => field.onChange(Number(value))}
												defaultValue={
													field.value || field.value === 0
														? field.value.toString()
														: undefined
												}>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'setting_notification_task_manage_form_trigger_type_placeholder'
														)}
													/>
												</SelectTrigger>
												<SelectContent className='w-full'>
													<SelectGroup>
														<SelectItem value={'0'}>
															{t(
																'setting_notification_task_manage_form_trigger_type_event'
															)}
														</SelectItem>
														<SelectItem value={'1'}>
															{t(
																'setting_notification_task_manage_form_trigger_type_scheduler'
															)}
														</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>

							{form.watch('trigger_type') === NotificationTriggerType.EVENT && (
								<FormField
									name='trigger_event_id'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>
													{t(
														'setting_notification_task_manage_form_trigger_event_id'
													)}
												</FormLabel>
												<Select
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
													defaultValue={
														field.value || field.value === 0
															? String(field.value)
															: undefined
													}>
													<SelectTrigger className='w-full'>
														<SelectValue
															placeholder={t(
																'setting_notification_task_manage_form_trigger_event_id_placeholder'
															)}>
															{(() => {
																const sel = triggerEvents?.data.find(
																	(item) => item.id === field.value
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
														<SelectGroup>
															{triggerEvents?.data.map((item, index) => {
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
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
							)}

							{form.watch('trigger_type') ===
								NotificationTriggerType.SCHEDULER && (
								<FormField
									name='trigger_scheduler_cron'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>
													{t(
														'setting_notification_task_manage_form_trigger_scheduler'
													)}
													<Tooltip>
														<TooltipTrigger>
															<Info size={15} />
														</TooltipTrigger>
														<TooltipContent>
															{t(
																'setting_notification_task_manage_form_trigger_scheduler_alert'
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
														'setting_notification_task_manage_form_trigger_scheduler_placeholder'
													)}
													{...field}
												/>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
							)}
							<Tabs
								value={form.watch('notification_content_type')?.toString()}
								onValueChange={(value) => {
									form.setValue('notification_content_type', Number(value));
								}}>
								<TabsList className='w-full mb-1'>
									<TabsTrigger value='1'>
										{t(
											'setting_notification_task_manage_form_content_type_template'
										)}
									</TabsTrigger>
									<TabsTrigger value='0'>
										{t(
											'setting_notification_task_manage_form_content_type_custom'
										)}
									</TabsTrigger>
								</TabsList>
								<TabsContent value='1'>
									<FormField
										name='notification_template_id'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_task_manage_form_template'
														)}
													</FormLabel>
													<Select
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														defaultValue={
															field.value ? String(field.value) : undefined
														}>
														<SelectTrigger className='w-full'>
															<SelectValue
																placeholder={t(
																	'setting_notification_task_manage_form_template_placeholder'
																)}>
																{(() => {
																	const sel = notificationTemplates?.data.find(
																		(item) => item.id === field.value
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
															<SelectGroup>
																{notificationTemplates?.data.map(
																	(item, index) => {
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
																	}
																)}
															</SelectGroup>
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</TabsContent>
								<TabsContent value='0' className='space-y-3'>
									<FormField
										name='notification_title'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('setting_notification_task_manage_form_title')}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_task_manage_form_title_placeholder'
														)}
														value={field.value || ''}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='notification_content'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('setting_notification_task_manage_form_content')}
													</FormLabel>
													<Textarea
														{...field}
														placeholder={t(
															'setting_notification_task_manage_form_content_placeholder'
														)}
														value={field.value || ''}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='notification_link'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('setting_notification_task_manage_form_link')}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_task_manage_form_link_placeholder'
														)}
														value={field.value || ''}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='notification_cover'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('setting_notification_task_manage_form_cover')}
													</FormLabel>
													<FileUpload
														accept='.jpg, .jpeg, .png, .pdf, .doc, .docx, .ppt, .pptx'
														className='h-20'
														defaultFileName={field.value || ''}
														onSuccess={(file_name) => {
															field.onChange(file_name);
														}}
														onDelete={() => field.onChange(null)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</TabsContent>
							</Tabs>
							<FormField
								name='enable'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className='flex flex-row items-center justify-between border rounded-xl p-3'>
											<div className='space-y-1'>
												<FormLabel>
													{t('setting_notification_task_manage_form_enable')}
												</FormLabel>
												<FormDescription>
													{t(
														'setting_notification_task_manage_form_enable_alert'
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
						</form>
					</Form>
					<DialogFooter>
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
				</DialogContent>
			</Dialog>
		</>
	);
};

export default UpdateNotificationTask;
