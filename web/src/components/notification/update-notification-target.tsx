'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
	getMineNotificationTargetDetail,
	getProvidedNotificationTargets,
	updateNotificationTarget,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, ShieldAlert, XCircleIcon } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import SelectEmpty from '../ui/select-empty';
import { useUserContext } from '@/provider/user-provider';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Spinner } from '../ui/spinner';
import { Separator } from '../ui/separator';
import { Alert, AlertTitle } from '../ui/alert';
import {
	InifiniteScrollPagnitionNotificationTarget,
	NotificationTarget,
} from '@/generated';
import { mapInfiniteQueryElements } from '@/lib/infinite-query-cache';
import { NotificationTargetProvidedUUID } from '@/enums/notification';
import EmailNotificationTarget from './email-notification-target';
import IOSNotificationTarget from './ios-notification-target';
import FeishuNotificationTarget from './feishu-notification-target';
import DingTalkNotificationTarget from './dingtalk-notification-target';
import PublicVisibilityField from './public-visibility-field';

const UpdateNotificationTarget = ({
	notification_target_id,
}: {
	notification_target_id: number;
}) => {
	const t = useTranslations();
	const locale = useLocale();

	const queryClient = getQueryClient();

	const { mainUserInfo } = useUserContext();

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);

	const [notificationTargetProvidedId, setNotificationTargetProvidedId] =
		useState<number>();

	const formSchema = z.object({
		notification_target_id: z.number(),
		title: z.string(),
		description: z.string().optional().nullable(),
		is_public: z.boolean().optional(),
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

	type UpdateNotificationTargetFormValues = z.infer<typeof formSchema>;

	const form = useForm<UpdateNotificationTargetFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_target_id: notification_target_id,
			title: '',
			description: '',
		},
	});

	const initialValuesRef = useRef<UpdateNotificationTargetFormValues | null>(
		null,
	);

	const { data, isFetching, isError, error, isSuccess, refetch } = useQuery({
		queryKey: ['notification-target-detail', notification_target_id],
		queryFn: async () => {
			return await getMineNotificationTargetDetail({
				notification_target_id: notification_target_id,
			});
		},
		enabled: showUpdateDialog,
	});

	const { data: providedNotificationTargets } = useQuery({
		queryKey: ['searchProvidedNotificationTargets'],
		queryFn: getProvidedNotificationTargets,
	});

	const mutateUpdateNotificationTarget = useMutation({
		mutationFn: updateNotificationTarget,
		onSuccess(data, variables, context) {
			mapInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationTarget,
				NotificationTarget
			>(queryClient, ['searchNotificationTargets'], (item) => {
				if (item.id !== notification_target_id) return item;
				return {
					...item,
					title:
						typeof variables.title === 'string' ? variables.title : item.title,
					description:
						variables.description === undefined
							? item.description
							: variables.description,
					is_public:
						typeof variables.is_public === 'boolean'
							? variables.is_public
							: item.is_public,
					update_time: new Date(),
				};
			});

			queryClient.invalidateQueries({
				queryKey: ['notification-target-detail', notification_target_id],
			});
			setShowUpdateDialog(false);
		},
		onError(error, variables, context) {
			toast.error(error.message);
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

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		if (!initialValuesRef.current) return;
		const initialValues = initialValuesRef.current;
		const payload: Parameters<typeof updateNotificationTarget>[0] = {
			notification_target_id: notification_target_id,
		};

		if (values.title !== initialValues.title) {
			payload.title = values.title;
		}
		if (values.description !== initialValues.description) {
			payload.description = values.description;
		}
		if (values.is_public !== initialValues.is_public) {
			payload.is_public = values.is_public;
		}

		const currentTargetProvidedUuid =
			providedNotificationTargets?.data.find((item) => {
				return item.id === notificationTargetProvidedId;
			})?.uuid ?? data?.notification_target_provided.uuid;

		const isChanged = (currentValue: unknown, initialValue: unknown) => {
			return (
				JSON.stringify(currentValue ?? null) !==
				JSON.stringify(initialValue ?? null)
			);
		};

		switch (currentTargetProvidedUuid) {
			case NotificationTargetProvidedUUID.EMAIL:
				if (
					values.email_target_form &&
					isChanged(values.email_target_form, initialValues.email_target_form)
				) {
					payload.email_target_form = values.email_target_form;
				}
				break;
			case NotificationTargetProvidedUUID.APPLE:
			case NotificationTargetProvidedUUID.APPLE_SANDBOX:
				if (
					values.ios_target_form &&
					isChanged(values.ios_target_form, initialValues.ios_target_form)
				) {
					payload.ios_target_form = values.ios_target_form;
				}
				break;
			case NotificationTargetProvidedUUID.FEISHU:
				if (
					values.feishu_target_form &&
					isChanged(values.feishu_target_form, initialValues.feishu_target_form)
				) {
					payload.feishu_target_form = values.feishu_target_form;
				}
				break;
			case NotificationTargetProvidedUUID.DINGTALK:
				if (
					values.dingtalk_target_form &&
					isChanged(
						values.dingtalk_target_form,
						initialValues.dingtalk_target_form,
					)
				) {
					payload.dingtalk_target_form = values.dingtalk_target_form;
				}
				break;
			case NotificationTargetProvidedUUID.TELEGRAM:
				if (
					values.telegram_target_form &&
					isChanged(
						values.telegram_target_form,
						initialValues.telegram_target_form,
					)
				) {
					payload.telegram_target_form = values.telegram_target_form;
				}
				break;
			default:
				break;
		}

		// 仅 notification_target_id 说明无任何改动
		if (Object.keys(payload).length === 1) {
			toast.info(t('form_no_change'));
			return;
		}
		mutateUpdateNotificationTarget.mutate(payload);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	// ✅ 数据加载后同步到表单
	useEffect(() => {
		if (!data) return;

		const initialFormValues: z.infer<typeof formSchema> = {
			notification_target_id,
			title: data.title,
			description: data.description,
			is_public: data.is_public,
		};

		const cfg = JSON.parse(data.config_json ?? '{}');

		setNotificationTargetProvidedId(data.notification_target_provided.id);

		switch (
			providedNotificationTargets?.data.find((item) => {
				return item.id === data.notification_target_provided.id;
			})?.uuid
		) {
			case NotificationTargetProvidedUUID.EMAIL:
				initialFormValues.email_target_form = {
					email: cfg.email ?? '',
					code: '',
				};
				break;

			case NotificationTargetProvidedUUID.APPLE_SANDBOX:
				initialFormValues.ios_target_form = {
					device_token: cfg.device_token ?? '',
				};
				break;

			case NotificationTargetProvidedUUID.APPLE:
				initialFormValues.ios_target_form = {
					device_token: cfg.device_token ?? '',
				};
				break;

			case NotificationTargetProvidedUUID.FEISHU:
				initialFormValues.feishu_target_form = {
					webhook_url: cfg.webhook_url ?? '',
					sign: cfg.sign ?? '',
				};
				break;

			case NotificationTargetProvidedUUID.DINGTALK:
				initialFormValues.dingtalk_target_form = {
					webhook_url: cfg.webhook_url ?? '',
					sign: cfg.sign ?? '',
				};
				break;

			case NotificationTargetProvidedUUID.TELEGRAM:
				initialFormValues.telegram_target_form = {
					chat_id: cfg.chat_id ?? '',
				};
				break;

			default:
				break;
		}

		form.reset(initialFormValues);
		initialValuesRef.current = initialFormValues; // ✅ 存表单结构
	}, [data, notification_target_id, showUpdateDialog]);

	const authorized = useMemo(() => {
		return mainUserInfo && mainUserInfo.id === data?.creator.id;
	}, [data?.creator.id, mainUserInfo]);

	return (
		<>
			<Dialog
				open={showUpdateDialog}
				onOpenChange={(open) => {
					setShowUpdateDialog(open);
					if (open) {
						refetch(); // ✅ 每次打开都拉最新
					}
				}}>
				<DialogTrigger asChild>
					<Button variant={'outline'}>{t('edit')}</Button>
				</DialogTrigger>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-2xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>
							{t('setting_notification_target_manage_update_form_label')}
						</DialogTitle>
					</DialogHeader>
					<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
						{!data && isFetching && (
							<div className='flex items-center justify-center gap-2 rounded bg-muted p-5 text-xs text-muted-foreground'>
								<span>{t('loading')}</span>
								<Spinner />
							</div>
						)}

						{!data && isError && error && (
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<XCircleIcon />
									</EmptyMedia>
									<EmptyDescription>{error.message}</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}

						{isSuccess && data && (
							<Form {...form}>
								<form
									onSubmit={onSubmitForm}
									className='space-y-3'
									id='update-form'>
								<FormField
									name='notification_target_id'
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
															value={notificationTargetProvidedId?.toString()}
															disabled>
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
														disabled={!authorized}
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
														disabled={!authorized}
														placeholder={t(
															'setting_notification_target_manage_form_description_placeholder',
														)}
														value={field.value ? field.value : ''}
													/>
												</div>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
								{authorized && (
									<>
										{providedNotificationTargets?.data.find((item) => {
											return item.id === notificationTargetProvidedId;
										})?.uuid === NotificationTargetProvidedUUID.EMAIL && (
											<EmailNotificationTarget useEmailDirtyForCodeField />
										)}
										{providedNotificationTargets?.data.find((item) => {
											return item.id === notificationTargetProvidedId;
										})?.uuid === NotificationTargetProvidedUUID.APPLE && (
											<IOSNotificationTarget env='prod' />
										)}
										{providedNotificationTargets?.data.find((item) => {
											return item.id === notificationTargetProvidedId;
										})?.uuid ===
											NotificationTargetProvidedUUID.APPLE_SANDBOX && (
											<IOSNotificationTarget env='sandbox' />
										)}
										{providedNotificationTargets?.data.find((item) => {
											return item.id === notificationTargetProvidedId;
										})?.uuid === NotificationTargetProvidedUUID.FEISHU && (
											<FeishuNotificationTarget />
										)}
										{providedNotificationTargets?.data.find((item) => {
											return item.id === notificationTargetProvidedId;
										})?.uuid === NotificationTargetProvidedUUID.DINGTALK && (
											<DingTalkNotificationTarget />
										)}
										<FormField
											name='is_public'
											control={form.control}
											render={({ field }) => {
												return (
													<PublicVisibilityField
														label={t('setting_model_provider_is_public')}
														description={t(
															'setting_notification_target_manage_form_is_public_tips',
														)}
														checked={field.value ?? false}
														onCheckedChange={field.onChange}
														disabled={!authorized}
													/>
												);
											}}
										/>
									</>
								)}
								</form>
							</Form>
						)}
					</div>
					<DialogFooter className='sticky bottom-0 z-10 flex flex-row items-center justify-end border-t border-border/60 bg-background px-6 py-4'>
						{!authorized && (
							<Alert className='bg-amber-600/10 dark:bg-amber-600/15 text-amber-500 border-amber-500/50 dark:border-amber-600/50'>
								<ShieldAlert className='size-4' />
								<AlertTitle>
									{t('setting_notification_target_manage_forbidden')}
								</AlertTitle>
							</Alert>
						)}
						{authorized && (
							<>
								<DialogClose asChild>
									<Button type='button' variant={'secondary'}>
										{t('cancel')}
									</Button>
								</DialogClose>
								<Button
									type='submit'
									form='update-form'
									disabled={mutateUpdateNotificationTarget.isPending}>
									{t('confirm')}
									{mutateUpdateNotificationTarget.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
							</>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default UpdateNotificationTarget;
