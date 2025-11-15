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
	getMineNotificationTargetDetail,
	updateNotificationTarget,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { NotificationSourceCategory } from '@/enums/notification';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';

const UpdateNotificationTarget = ({
	notification_target_id,
}: {
	notification_target_id: number;
}) => {
	const { data, isFetching } = useQuery({
		queryKey: ['notification-target-detail', notification_target_id],
		queryFn: async () => {
			return await getMineNotificationTargetDetail({
				notification_target_id: notification_target_id,
			});
		},
	});

	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z
		.object({
			notification_target_id: z.number(),
			title: z.string(),
			description: z.string().nullable(),
			category: z.number(),
			email: z.string().email().optional(),
			device_token: z.string().optional(),
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
			}
			if (data.category === NotificationSourceCategory.IOS) {
				if (!data.device_token) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['device_token'],
						message: 'Device token is required when category is 1',
					});
				}
			}
		});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_target_id,
			title: '',
			description: '',
			email: '',
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

	const mutateUpdateNotificationTarget = useMutation({
		mutationFn: updateNotificationTarget,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				queryKey: ['notification-target'],
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

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateUpdateNotificationTarget.mutate(values);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	useEffect(() => {
		if (data) {
			const defaultValues: z.infer<typeof formSchema> = {
				notification_target_id,
				title: data.title,
				description: data.description,
				category: data.category,
				email: data.email_notification_target?.email,
				device_token: data.ios_notification_target?.device_token,
			};
			form.reset(defaultValues);
		}
	}, [data, form, notification_target_id]);

	return (
		<>
			<Button variant={'outline'} onClick={() => setShowUpdateDialog(true)}>
				{t('edit')}
			</Button>
			<Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
				<DialogContent>
					<DialogTitle>
						{t('setting_notification_target_manage_update_form_label')}
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
												{t('setting_notification_target_manage_form_title')}
											</FormLabel>
											<Input
												{...field}
												placeholder={t(
													'setting_notification_target_manage_form_title_placeholder'
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
													'setting_notification_target_manage_form_description'
												)}
											</FormLabel>
											<Input
												{...field}
												placeholder={t(
													'setting_notification_target_manage_form_description_placeholder'
												)}
												value={field.value ? field.value : ''}
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
												{t('setting_notification_target_manage_form_category')}
											</FormLabel>
											<Select value={field.value.toString()} disabled>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'setting_notification_target_manage_form_category_placeholder'
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
														{t('setting_notification_target_manage_form_email')}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_target_manage_form_email_placeholder'
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
										name='device_token'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_target_manage_form_device_token'
														)}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'setting_notification_target_manage_form_device_token_placeholder'
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
							disabled={mutateUpdateNotificationTarget.isPending}>
							{t('submit')}
							{mutateUpdateNotificationTarget.isPending && (
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

export default UpdateNotificationTarget;
