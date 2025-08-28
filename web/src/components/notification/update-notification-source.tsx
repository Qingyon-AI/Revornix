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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getQueryClient } from '@/lib/get-query-client';
import {
	getMineNotificationSourceDetail,
	updateNotificationSource,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Tooltip, TooltipTrigger } from '../ui/hybrid-tooltip';
import { Info, Loader2 } from 'lucide-react';
import { TooltipContent } from '../ui/tooltip';
import { useMutation, useQuery } from '@tanstack/react-query';
import { NotificationSourceCategory } from '@/enums/notification';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

const UpdateNotificationSource = ({
	notification_source_id,
}: {
	notification_source_id: number;
}) => {
	const { data, isFetching } = useQuery({
		queryKey: ['notification-source-detail', notification_source_id],
		queryFn: async () => {
			return await getMineNotificationSourceDetail({
				notification_source_id: notification_source_id,
			});
		},
	});

	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z
		.object({
			notification_source_id: z.number(),
			title: z.string(),
			description: z.string(),
			category: z.number(),
			email: z.string().email().optional(),
			password: z.string().optional(),
			server: z.string().optional(),
			port: z.number().optional(),
			team_id: z.string().optional(),
			private_key: z.string().optional(),
			key_id: z.string().optional(),
			app_bundle_id: z.string().optional(),
		})
		.superRefine((data, ctx) => {
			if (data.category === NotificationSourceCategory.EMAIL) {
				if (!data.email) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['email'],
						message: 'Email is required when category is 0',
					});
				}
				if (!data.password) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['password'],
						message: 'Password is required when category is 0',
					});
				}
				if (!data.server) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['server'],
						message: 'Server is required when category is 0',
					});
				}
				if (data.port === undefined) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['port'],
						message: 'Port is required when category is 0',
					});
				}
			}

			if (data.category === NotificationSourceCategory.IOS) {
				if (!data.team_id) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['team_id'],
						message: 'Team ID is required when category is 1',
					});
				}
				if (!data.private_key) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['private_key'],
						message: 'Private key is required when category is 1',
					});
				}
				if (!data.key_id) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['key_id'],
						message: 'Key ID is required when category is 1',
					});
				}
				if (!data.app_bundle_id) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['app_bundle_id'],
						message: 'App Bundle ID is required when category is 1',
					});
				}
			}
		});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_source_id,
			title: '',
			description: '',
			category: undefined,
			password: '',
			server: '',
			port: undefined,
			team_id: '',
			private_key: '',
			key_id: '',
			app_bundle_id: '',
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

	const mutateUpdateNotificationSource = useMutation({
		mutationFn: updateNotificationSource,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				queryKey: ['notification-source'],
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

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateUpdateNotificationSource.mutate(values);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	// ✅ 数据加载后同步到表单
	useEffect(() => {
		if (data) {
			const defaultValues: z.infer<typeof formSchema> = {
				notification_source_id,
				title: data.title,
				description: data.description,
				category: data.category,
				email: data.email_notification_source?.email,
				password: data.email_notification_source?.password,
				server: data.email_notification_source?.server,
				port: data.email_notification_source?.port,
				team_id: data.ios_notification_source?.team_id,
				private_key: data.ios_notification_source?.private_key,
				key_id: data.ios_notification_source?.key_id,
				app_bundle_id: data.ios_notification_source?.app_bundle_id,
			};
			form.reset(defaultValues);
		}
	}, [data, form, notification_source_id]);

	return (
		<>
			<Button variant={'outline'} onClick={() => setShowUpdateDialog(true)}>
				{t('edit')}
			</Button>
			<Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
				<DialogContent className='max-h-[80vh] overflow-auto'>
					<DialogTitle>
						{t('setting_notification_source_manage_update_form_label')}
					</DialogTitle>
					<Form {...form}>
						<form
							onSubmit={onSubmitForm}
							className='space-y-3'
							id='update-form'>
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>
												{t('setting_notification_source_manage_form_title')}
											</FormLabel>
											<Input
												{...field}
												placeholder={t(
													'setting_notification_source_manage_form_title_placeholder'
												)}
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
											<FormLabel>
												{t(
													'setting_notification_source_manage_form_description'
												)}
											</FormLabel>
											<Input
												{...field}
												placeholder={t(
													'setting_notification_source_manage_form_description_placeholder'
												)}
											/>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='category'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>
												{t('setting_notification_source_manage_form_category')}
											</FormLabel>
											<Select value={field.value.toString()} disabled>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'setting_notification_source_manage_form_category_placeholder'
														)}
													/>
												</SelectTrigger>
												<SelectContent className='w-full'>
													<SelectGroup>
														<SelectItem value='0'>email</SelectItem>
														<SelectItem value='1'>ios</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							{form.watch('category') === 0 && (
								<>
									<FormField
										name='email'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('setting_notification_source_manage_form_email')}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_email_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='password'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_source_manage_form_password'
														)}
														<Tooltip>
															<TooltipTrigger>
																<Info size={15} />
															</TooltipTrigger>
															<TooltipContent>
																{t(
																	'setting_notification_source_manage_form_password_alert'
																)}
															</TooltipContent>
														</Tooltip>
													</FormLabel>
													<Input
														type='password'
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_password_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='server'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_source_manage_form_server'
														)}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_server_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='port'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('setting_notification_source_manage_form_port')}
													</FormLabel>
													<Input
														type={'number'}
														{...field}
														onChange={(e) =>
															field.onChange(e.target.valueAsNumber)
														}
														placeholder={t(
															'setting_notification_source_manage_form_port_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</>
							)}
							{form.watch('category') === 1 && (
								<>
									<FormField
										name='team_id'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_source_manage_form_team_id'
														)}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_team_id_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='key_id'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_source_manage_form_key_id'
														)}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_key_id_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='app_bundle_id'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_source_manage_form_app_bundle_id'
														)}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_app_bundle_id_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='private_key'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_source_manage_form_private_key'
														)}
													</FormLabel>
													<Textarea
														{...field}
														placeholder={t(
															'setting_notification_source_manage_form_private_key_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</>
							)}
						</form>
					</Form>
					<DialogFooter>
						<Button
							type='submit'
							form='update-form'
							disabled={mutateUpdateNotificationSource.isPending}>
							{t('submit')}
							{mutateUpdateNotificationSource.isPending && (
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

export default UpdateNotificationSource;
