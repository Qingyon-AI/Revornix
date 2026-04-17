'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getQueryClient } from '@/lib/get-query-client';
import {
	addNotificationTarget,
	getProvidedNotificationTargets,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, PlusCircleIcon } from 'lucide-react';
import { NotificationTargetProvidedUUID } from '@/enums/notification';
import EmailNotificationTarget from './email-notification-target';
import IOSNotificationTarget from './ios-notification-target';
import FeishuNotificationTarget from './feishu-notification-target';
import DingTalkNotificationTarget from './dingtalk-notification-target';
import TelegramNotificationTarget from './telegram-notification-target';
import PublicVisibilityField from './public-visibility-field';

const AddNotificationTarget = () => {
	const locale = useLocale();
	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		title: z.string(),
		notification_target_provided_id: z.number(),
		description: z.string().optional(),
		is_public: z.boolean(),
		email_target_form: z
			.object({
				email: z.string().email(),
				code: z.string(),
			})
			.optional(),
		ios_target_form: z
			.object({
				device_token: z.string(),
			})
			.optional(),
		feishu_target_form: z
			.object({
				webhook_url: z.string(),
				sign: z.string(),
			})
			.optional(),
		dingtalk_target_form: z
			.object({
				webhook_url: z.string(),
				sign: z.string(),
			})
			.optional(),
		telegram_target_form: z
			.object({
				chat_id: z.string(),
			})
			.optional(),
	});

	type AddNotificationTargetFormValues = z.infer<typeof formSchema>;

	const defaultFormValues: Pick<
		AddNotificationTargetFormValues,
		'title' | 'description' | 'is_public'
	> = {
		title: '',
		description: '',
		is_public: false,
	};

	const form = useForm<AddNotificationTargetFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: defaultFormValues,
		shouldUnregister: true,
	});

	const [showAddDialog, setShowAddDialog] = useState(false);

	const { data: providedNotificationTargets } = useQuery({
		queryKey: ['searchProvidedNotificationTargets'],
		queryFn: getProvidedNotificationTargets,
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

	const mutateAddNotificationTarget = useMutation({
		mutationFn: addNotificationTarget,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				predicate: (query) => {
					return query.queryKey.includes('searchNotificationTargets');
				},
			});
			queryClient.invalidateQueries({
				queryKey: ['searchUsableNotificationTargets'],
			});
			form.reset();
			setShowAddDialog(false);
		},
		onError(error, variables, context) {
			toast.error(error.message);
		},
	});

	const onFormValidateSuccess = async (data: z.infer<typeof formSchema>) => {
		mutateAddNotificationTarget.mutate(data);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	return (
		<>
			<Button onClick={() => setShowAddDialog(true)}>
				{t('setting_notification_target_manage_add_form_label')}
				<PlusCircleIcon />
			</Button>
			<Dialog
				open={showAddDialog}
				onOpenChange={(open) => {
					setShowAddDialog(open);
					if (!open) {
						form.reset(defaultFormValues);
					}
				}}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-2xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>
							{t('setting_notification_target_manage_add_form_label')}
						</DialogTitle>
						<DialogDescription>
							{t('setting_notification_target_manage_form_desc')}
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form
							onSubmit={onSubmitForm}
							className='flex min-h-0 flex-1 flex-col'
							id='add-notification-target-form'>
							<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
								<div className='space-y-3'>
							<FormField
								name='notification_target_provided_id'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t(
														'setting_notification_target_manage_form_category',
													)}
												</FormLabel>
												<div className='col-span-9'>
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
																	'setting_notification_target_manage_form_category_placeholder',
																)}
															/>
														</SelectTrigger>
														<SelectContent className='w-full'>
															{providedNotificationTargets?.data.length ? (
																<SelectGroup>
																	{providedNotificationTargets.data.map((item) => {
																		return (
																			<SelectItem
																				key={item.id}
																				value={String(item.id)}>
																				{locale === 'zh'
																					? item.name_zh
																					: item.name}
																			</SelectItem>
																		);
																	})}
																</SelectGroup>
															) : (
																<SelectEmpty message={t('setting_notification_target_manage_empty')} />
															)}
														</SelectContent>
													</Select>
												</div>
											</div>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('setting_notification_target_manage_form_title')}
												</FormLabel>
												<Input
													className='col-span-9'
													{...field}
													placeholder={t(
														'setting_notification_target_manage_form_title_placeholder',
													)}
												/>
											</div>
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
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t(
														'setting_notification_target_manage_form_description',
													)}
												</FormLabel>
												<Input
													className='col-span-9'
													{...field}
													placeholder={t(
														'setting_notification_target_manage_form_description_placeholder',
													)}
													value={field.value || ''}
												/>
											</div>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							{providedNotificationTargets?.data.find((item) => {
								return (
									item.id === form.watch('notification_target_provided_id')
								);
							})?.uuid === NotificationTargetProvidedUUID.EMAIL && (
								<EmailNotificationTarget />
							)}
							{providedNotificationTargets?.data.find((item) => {
								return (
									item.id === form.watch('notification_target_provided_id')
								);
							})?.uuid === NotificationTargetProvidedUUID.APPLE && (
								<IOSNotificationTarget env='prod' />
							)}
							{providedNotificationTargets?.data.find((item) => {
								return (
									item.id === form.watch('notification_target_provided_id')
								);
							})?.uuid === NotificationTargetProvidedUUID.APPLE_SANDBOX && (
								<IOSNotificationTarget env='sandbox' />
							)}
							{providedNotificationTargets?.data.find((item) => {
								return (
									item.id === form.watch('notification_target_provided_id')
								);
							})?.uuid === NotificationTargetProvidedUUID.FEISHU && (
								<FeishuNotificationTarget />
							)}
							{providedNotificationTargets?.data.find((item) => {
								return (
									item.id === form.watch('notification_target_provided_id')
								);
							})?.uuid === NotificationTargetProvidedUUID.DINGTALK && (
								<DingTalkNotificationTarget />
							)}
							{providedNotificationTargets?.data.find((item) => {
								return (
									item.id === form.watch('notification_target_provided_id')
								);
							})?.uuid === NotificationTargetProvidedUUID.TELEGRAM && (
								<TelegramNotificationTarget />
							)}
							<FormField
								name='is_public'
								control={form.control}
								render={({ field }) => {
									return (
										<PublicVisibilityField
											label={t('setting_notification_target_is_public')}
											description={t(
												'setting_notification_target_manage_form_is_public_tips',
											)}
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									);
								}}
							/>
								</div>
							</div>
							<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
						<Button
							type='submit'
							form='add-notification-target-form'
							disabled={mutateAddNotificationTarget.isPending}>
							{t('submit')}
							{mutateAddNotificationTarget.isPending && (
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

export default AddNotificationTarget;
