'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
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
	getMineNotificationSourceDetail,
	getProvidedNotificationSources,
	updateNotificationSource,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2, ShieldAlert, XCircleIcon } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { diffValues } from '@/lib/utils';
import { Spinner } from '../ui/spinner';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { useUserContext } from '@/provider/user-provider';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Alert, AlertTitle } from '../ui/alert';
import {
	InifiniteScrollPagnitionNotificationSource,
	NotificationSource,
} from '@/generated';
import { mapInfiniteQueryElements } from '@/lib/infinite-query-cache';
import { NotificationSourceProvidedUUID } from '@/enums/notification';
import EmailNotificationSource from './email-notification-source';
import IOSNotificationSource from './ios-notification-source';
import FeiShuNotificationSource from './feishu-notification-source';
import TelegramNotificationSource from './telegram-notification-source';

const UpdateNotificationSource = ({
	notification_source_id,
}: {
	notification_source_id: number;
}) => {
	const t = useTranslations();
	const locale = useLocale();

	const queryClient = getQueryClient();

	const { mainUserInfo } = useUserContext();

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);

	const [notificationSourceProvidedId, setNotificationSourceProvidedId] =
		useState<number>();

	const formSchema = z.object({
		notification_source_id: z.number(),
		title: z.string(),
		description: z.string().optional().nullable(),
		is_public: z.boolean().optional(),
			email_source_form: z
				.object({
					host: z.string(),
					port: z.coerce.number().int().min(1).max(65535),
					username: z.string(),
					password: z.string(),
				})
				.optional(),
		ios_source_form: z
			.object({
				team_id: z.string(),
				key_id: z.string(),
				private_key: z.string(),
				apns_topic: z.string(),
			})
			.optional(),
		feishu_source_form: z
			.object({
				app_id: z.string(),
				app_secret: z.string(),
			})
			.optional(),
		telegram_source_form: z
			.object({
				bot_token: z.string(),
			})
			.optional(),
	});

	type UpdateNotificationSourceFormValues = z.infer<typeof formSchema>;

	const form = useForm<UpdateNotificationSourceFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_source_id: notification_source_id,
			title: '',
			description: '',
		},
	});

	const initialValuesRef = useRef<UpdateNotificationSourceFormValues | null>(
		null,
	);

	const { data, isFetching, isError, error, isSuccess, refetch } = useQuery({
		queryKey: ['notification-source-detail', notification_source_id],
		queryFn: async () => {
			return await getMineNotificationSourceDetail({
				notification_source_id: notification_source_id,
			});
		},
		enabled: showUpdateDialog,
	});

	const { data: providedNotificationSources } = useQuery({
		queryKey: ['searchProvidedNotificationSources'],
		queryFn: getProvidedNotificationSources,
	});

	const mutateUpdateNotificationSource = useMutation({
		mutationFn: updateNotificationSource,
		onSuccess(data, variables, context) {
			mapInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationSource,
				NotificationSource
			>(queryClient, ['searchNotificationSources'], (item) => {
				if (item.id !== notification_source_id) return item;
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
				queryKey: ['notification-source-detail', notification_source_id],
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
		const payload: Parameters<typeof updateNotificationSource>[0] = {
			notification_source_id: notification_source_id,
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
			providedNotificationSources?.data.find((item) => {
				return item.id === notificationSourceProvidedId;
			})?.uuid ?? data?.notification_source_provided.uuid;

		const isChanged = (currentValue: unknown, initialValue: unknown) => {
			return (
				JSON.stringify(currentValue ?? null) !==
				JSON.stringify(initialValue ?? null)
			);
		};

		switch (currentTargetProvidedUuid) {
			case NotificationSourceProvidedUUID.EMAIL:
				if (
					values.email_source_form &&
					isChanged(values.email_source_form, initialValues.email_source_form)
				) {
					payload.email_source_form = values.email_source_form;
				}
				break;
			case NotificationSourceProvidedUUID.APPLE:
			case NotificationSourceProvidedUUID.APPLE_SANDBOX:
				if (
					values.ios_source_form &&
					isChanged(values.ios_source_form, initialValues.ios_source_form)
				) {
					payload.ios_source_form = values.ios_source_form;
				}
				break;
			case NotificationSourceProvidedUUID.FEISHU:
				if (
					values.feishu_source_form &&
					isChanged(values.feishu_source_form, initialValues.feishu_source_form)
				) {
					payload.feishu_source_form = values.feishu_source_form;
				}
				break;
			case NotificationSourceProvidedUUID.DINGTALK:
				break;
			case NotificationSourceProvidedUUID.TELEGRAM:
				if (
					values.telegram_source_form &&
					isChanged(
						values.telegram_source_form,
						initialValues.telegram_source_form,
					)
				) {
					payload.telegram_source_form = values.telegram_source_form;
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
		mutateUpdateNotificationSource.mutate(payload);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	// ✅ 数据加载后同步到表单
	useEffect(() => {
		if (!data) return;

		const initialFormValues: z.infer<typeof formSchema> = {
			notification_source_id,
			title: data.title,
			description: data.description,
			is_public: data.is_public,
		};

		const cfg = JSON.parse(data.config_json ?? '{}');

		setNotificationSourceProvidedId(data.notification_source_provided.id);

		switch (
			providedNotificationSources?.data.find((item) => {
				return item.id === data.notification_source_provided.id;
			})?.uuid
		) {
			case NotificationSourceProvidedUUID.EMAIL:
				initialFormValues.email_source_form = {
					host: cfg.host ?? '',
					port: cfg.port ?? 0,
					username: cfg.username ?? '',
					password: cfg.password ?? '',
				};
				break;

			case NotificationSourceProvidedUUID.APPLE_SANDBOX:
				initialFormValues.ios_source_form = {
					team_id: cfg.team_id ?? '',
					key_id: cfg.key_id ?? '',
					private_key: cfg.private_key ?? '',
					apns_topic: cfg.apns_topic ?? '',
				};
				break;

			case NotificationSourceProvidedUUID.APPLE:
				initialFormValues.ios_source_form = {
					team_id: cfg.team_id ?? '',
					key_id: cfg.key_id ?? '',
					private_key: cfg.private_key ?? '',
					apns_topic: cfg.apns_topic ?? '',
				};
				break;

			case NotificationSourceProvidedUUID.FEISHU:
				initialFormValues.feishu_source_form = {
					app_id: cfg.app_id ?? '',
					app_secret: cfg.app_secret ?? '',
				};
				break;

			case NotificationSourceProvidedUUID.DINGTALK:
				break;

			case NotificationSourceProvidedUUID.TELEGRAM:
				initialFormValues.telegram_source_form = {
					bot_token: cfg.bot_token ?? '',
				};
				break;

			default:
				break;
		}

		form.reset(initialFormValues);
		initialValuesRef.current = initialFormValues; // ✅ 存表单结构
	}, [data, notification_source_id, showUpdateDialog]);

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
				<DialogContent className='max-h-[80vh] overflow-auto'>
					<DialogTitle>
						{t('setting_notification_source_manage_update_form_label')}
					</DialogTitle>

					{!data && isFetching && (
						<div className='bg-muted text-xs text-muted-foreground p-5 rounded flex flex-row items-center justify-center gap-2'>
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
									name='notification_source_id'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<div className='grid grid-cols-12 gap-2'>
													<FormLabel className='col-span-3'>
														{t(
															'setting_notification_source_manage_form_category',
														)}
													</FormLabel>
													<div className='col-span-9'>
														<Select
															value={notificationSourceProvidedId?.toString()}
															disabled>
															<SelectTrigger className='w-full '>
																<SelectValue
																	placeholder={t(
																		'setting_notification_source_manage_form_category_placeholder',
																	)}
																/>
															</SelectTrigger>
															<SelectContent className='w-full'>
																<SelectGroup>
																	{providedNotificationSources?.data.map(
																		(item) => {
																			return (
																				<SelectItem
																					key={item.id}
																					value={String(item.id)}>
																					{locale === 'zh'
																						? item.name_zh
																						: item.name}
																				</SelectItem>
																			);
																		},
																	)}
																</SelectGroup>
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
														{t('setting_notification_source_manage_form_title')}
													</FormLabel>
													<Input
														disabled={!authorized}
														className='col-span-9'
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_title_placeholder',
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
															'setting_notification_source_manage_form_description',
														)}
													</FormLabel>
													<Textarea
														disabled={!authorized}
														className='col-span-9'
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_description_placeholder',
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
										{providedNotificationSources?.data.find((item) => {
											return item.id === notificationSourceProvidedId;
										})?.uuid === NotificationSourceProvidedUUID.EMAIL && (
											<EmailNotificationSource />
										)}
										{providedNotificationSources?.data.find((item) => {
											return item.id === notificationSourceProvidedId;
										})?.uuid === NotificationSourceProvidedUUID.APPLE && (
											<IOSNotificationSource env={'prod'} />
										)}
										{providedNotificationSources?.data.find((item) => {
											return item.id === notificationSourceProvidedId;
										})?.uuid ===
											NotificationSourceProvidedUUID.APPLE_SANDBOX && (
											<IOSNotificationSource env={'sandbox'} />
										)}
										{providedNotificationSources?.data.find((item) => {
											return item.id === notificationSourceProvidedId;
										})?.uuid === NotificationSourceProvidedUUID.FEISHU && (
											<FeiShuNotificationSource />
										)}
										{providedNotificationSources?.data.find((item) => {
											return item.id === notificationSourceProvidedId;
										})?.uuid === NotificationSourceProvidedUUID.TELEGRAM && (
											<TelegramNotificationSource />
										)}
										<FormField
											name='is_public'
											control={form.control}
											render={({ field }) => {
												return (
													<FormItem className='rounded-lg border border-input p-3'>
														<div className='flex flex-row gap-1 items-center'>
															<FormLabel className='flex flex-row gap-1 items-center'>
																{t('setting_model_provider_is_public')}
															</FormLabel>
															<Switch
																disabled={!authorized}
																checked={field.value}
																onCheckedChange={(e) => {
																	field.onChange(e);
																}}
															/>
														</div>
														<FormDescription>
															{t(
																'setting_notification_source_manage_form_is_public_tips',
															)}
														</FormDescription>
													</FormItem>
												);
											}}
										/>
									</>
								)}
							</form>
						</Form>
					)}

					<Separator />
					<DialogFooter className='flex flex-row items-center justify-end'>
						{!authorized && (
							<Alert className='bg-amber-600/10 dark:bg-amber-600/15 text-amber-500 border-amber-500/50 dark:border-amber-600/50'>
								<ShieldAlert className='size-4' />
								<AlertTitle>
									{t('setting_notification_source_manage_forbidden')}
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
									disabled={mutateUpdateNotificationSource.isPending}>
									{t('confirm')}
									{mutateUpdateNotificationSource.isPending && (
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

export default UpdateNotificationSource;
