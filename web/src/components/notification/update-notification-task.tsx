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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

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
	const formSchema = z.object({
		notification_task_id: z.number(),
		title: z.string().optional(),
		content: z.string().optional(),
		notification_content_type: z.number(),
		notification_template_id: z.coerce
			.number({
				required_error: 'Please select the template',
			})
			.optional(),
		cron_expr: z.string(),
		enable: z.boolean(),
		notification_source_id: z.number(),
		notification_target_id: z.number(),
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
			cron_expr: '',
			enable: true,
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
				queryKey: ['notification-task'],
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
				cron_expr: data.cron_expr,
				enable: data.enable,
				notification_source_id: data.notification_source_id,
				notification_target_id: data.notification_target_id,
				notification_content_type: data.notification_content_type,
				title: data.title ?? undefined,
				content: data.content ?? undefined,
				notification_template_id: data.notification_template_id ?? undefined,
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
							<Tabs
								value={form.watch('notification_content_type')?.toString()}
								onValueChange={(value) => {
									form.setValue('notification_content_type', Number(value));
								}}>
								<TabsList className='w-full mb-1'>
									<TabsTrigger value='0'>
										{t(
											'setting_notification_task_manage_form_content_type_custom'
										)}
									</TabsTrigger>
									<TabsTrigger value='1'>
										{t(
											'setting_notification_task_manage_form_content_type_template'
										)}
									</TabsTrigger>
								</TabsList>
								<TabsContent value='0' className='space-y-3'>
									<FormField
										name='title'
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
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='content'
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
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</TabsContent>
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
													<div className='p-3 border rounded-md max-h-40 overflow-auto grid grid-cols-1'>
														<RadioGroup
															onValueChange={field.onChange}
															value={String(field.value)}>
															{notificationTemplates?.data.map(
																(item, index) => {
																	return (
																		<div
																			key={index}
																			className='bg-muted rounded p-3 flex flex-row justify-between items-center space-x-2'>
																			<Label
																				htmlFor={item.id.toString()}
																				className='flex flex-col text-left items-start flex-1'>
																				<p className='text-sm font-bold'>
																					{locale === 'zh'
																						? item.name_zh
																						: item.name}
																				</p>
																				<p className='text-muted-foreground text-xs'>
																					{locale === 'zh'
																						? item.description_zh
																						: item.description}
																				</p>
																			</Label>
																			<RadioGroupItem
																				value={item.id.toString()}
																				id={item.id.toString()}
																			/>
																		</div>
																	);
																}
															)}
														</RadioGroup>
													</div>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</TabsContent>
							</Tabs>
							<FormField
								name='cron_expr'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>
												{t('setting_notification_task_manage_form_cron_expr')}
												<Tooltip>
													<TooltipTrigger>
														<Info size={15} />
													</TooltipTrigger>
													<TooltipContent>
														{t(
															'setting_notification_task_manage_form_cron_expr_alert'
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
													'setting_notification_task_manage_form_cron_expr_placeholder'
												)}
												{...field}
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
								name='notification_target_id'
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
													field.onChange(e);
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
