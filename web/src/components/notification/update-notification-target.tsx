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
import { Textarea } from '../ui/textarea';
import { useUserContext } from '@/provider/user-provider';
import { diffValues } from '@/lib/utils';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Spinner } from '../ui/spinner';
import { Separator } from '../ui/separator';
import { Alert, AlertTitle } from '../ui/alert';
import { Switch } from '../ui/switch';

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
		config_json: z.string().optional().nullable(),
		is_public: z.boolean().optional(),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_target_id: notification_target_id,
			title: '',
			description: '',
			config_json: '',
		},
	});

	const initialValuesRef = useRef<z.infer<typeof formSchema> | null>(null);

	const { data, isFetching, isError, error, isSuccess, refetch } = useQuery({
		queryKey: ['notification-target-detail', notification_target_id],
		queryFn: async () => {
			return await getMineNotificationTargetDetail({
				notification_target_id: notification_target_id,
			});
		},
		enabled: showUpdateDialog,
	});

	const { data: notificationTargets } = useQuery({
		queryKey: ['provided-notification-target'],
		queryFn: getProvidedNotificationTargets,
	});

	const mutateUpdateNotificationTarget = useMutation({
		mutationFn: updateNotificationTarget,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				queryKey: ['searchNotificationTargets'],
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

		const patch = diffValues(values, initialValuesRef.current);

		// 如果啥都没改
		if (Object.keys(patch).length === 0) {
			toast.info(t('form_no_change'));
			return;
		}

		mutateUpdateNotificationTarget.mutate({
			...values,
			notification_target_id: notification_target_id,
		});
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
			config_json: data.config_json,
			is_public: data.is_public,
		};

		setNotificationTargetProvidedId(data.notification_target_provided.id);

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
				<DialogContent>
					<DialogTitle>
						{t('setting_notification_target_manage_update_form_label')}
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
																<SelectGroup>
																	{notificationTargets?.data.map((item) => {
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
															</SelectContent>
														</Select>
													</div>
												</div>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
								{notificationTargets?.data.find((item) => {
									return item.id === form.watch('notification_target_id');
								})?.demo_config && (
									<>
										<FormField
											name='config_json'
											control={form.control}
											render={({ field }) => {
												return (
													<FormItem>
														<div className='grid grid-cols-12 gap-2'>
															<FormLabel className='col-span-3'>
																{t(
																	'setting_notification_target_manage_form_config_json',
																)}
															</FormLabel>
															<Textarea
																placeholder={t(
																	'setting_notification_target_manage_form_config_json_placeholder',
																)}
																className='font-mono break-all col-span-9'
																{...field}
																value={field.value ?? ''}
															/>
														</div>
														<FormMessage />
													</FormItem>
												);
											}}
										/>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t(
													'setting_notification_target_manage_form_config_demo',
												)}
											</FormLabel>
											<div className='p-5 rounded bg-muted font-mono text-sm break-all col-span-9'>
												{
													notificationTargets?.data.find((item) => {
														return (
															item.id === form.watch('notification_target_id')
														);
													})?.demo_config
												}
											</div>
										</div>
									</>
								)}
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
										{data.notification_target_provided.demo_config && (
											<>
												<FormField
													name='config_json'
													control={form.control}
													render={({ field }) => {
														return (
															<FormItem>
																<div className='grid grid-cols-12 gap-2'>
																	<FormLabel className='col-span-3'>
																		{t(
																			'setting_notification_source_manage_form_config_json',
																		)}
																	</FormLabel>
																	<div className='col-span-9'>
																		<Textarea
																			disabled={!authorized}
																			placeholder={t(
																				'setting_notification_source_manage_form_config_json_placeholder',
																			)}
																			className='font-mono break-all'
																			{...field}
																			value={field.value ?? ''}
																		/>
																	</div>
																</div>
																<FormMessage />
															</FormItem>
														);
													}}
												/>
												<div className='grid grid-cols-12 gap-2'>
													<FormLabel className='col-span-3'>
														{t(
															'setting_notification_source_manage_form_config_json_demo',
														)}
													</FormLabel>
													<div className='col-span-9 p-5 rounded bg-muted font-mono text-sm break-all'>
														{data.notification_target_provided.demo_config}
													</div>
												</div>
											</>
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
									{t(
										'setting_notification_source_manage_form_config_json_demo',
									)}
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
