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
	const formSchema = z.object({
		notification_source_id: z.number(),
		title: z.string(),
		description: z.string(),
		email: z.string().email().optional(),
		password: z.string().optional(),
		server: z.string().optional(),
		port: z.number().optional(),
	});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_source_id,
			title: '',
			description: '',
			email: '',
			password: '',
			server: '',
			port: undefined,
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
				email: data.email_notification_source?.email ?? '',
				password: data.email_notification_source?.password ?? '',
				server: data.email_notification_source?.server ?? '',
				port: data.email_notification_source?.port ?? undefined,
			};
			// @ts-expect-error
			form.reset(defaultValues);
		}
	}, [data, form, notification_source_id]);

	return (
		<>
			<Button variant={'outline'} onClick={() => setShowUpdateDialog(true)}>
				{t('edit')}
			</Button>
			<Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
				<DialogContent>
					<DialogTitle>编辑源</DialogTitle>
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
							{data?.category === 0 && (
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
