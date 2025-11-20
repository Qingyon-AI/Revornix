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
	getProvidedNotificationSources,
	updateNotificationSource,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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

const UpdateNotificationSource = ({
	user_notification_source_id,
}: {
	user_notification_source_id: number;
}) => {
	const { data, isFetching } = useQuery({
		queryKey: ['notification-source-detail', user_notification_source_id],
		queryFn: async () => {
			return await getMineNotificationSourceDetail({
				user_notification_source_id: user_notification_source_id,
			});
		},
	});

	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		user_notification_source_id: z.number(),
		title: z.string(),
		description: z.string().optional().nullable(),
		config_json: z.string().optional().nullable(),
		notification_source_id: z.number().optional().nullable(),
	});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			user_notification_source_id: user_notification_source_id,
			title: '',
			description: '',
			config_json: '',
		},
	});

	const { data: notificationSources } = useQuery({
		queryKey: ['provided-notification-source'],
		queryFn: getProvidedNotificationSources,
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
				queryKey: ['notification-source-detail', user_notification_source_id],
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
				user_notification_source_id,
				title: data.title,
				description: data.description,
				notification_source_id: data.notification_source_id,
				config_json: data.config_json,
			};
			form.reset(defaultValues);
		}
	}, [data, form, user_notification_source_id]);

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
												value={field.value ? field.value : ''}
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
												{t('setting_notification_source_manage_form_category')}
											</FormLabel>
											<Select
												value={field.value ? field.value.toString() : undefined}
												disabled>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'setting_notification_source_manage_form_category_placeholder'
														)}
													/>
												</SelectTrigger>
												<SelectContent className='w-full'>
													<SelectGroup>
														{notificationSources?.data.map((item) => {
															return (
																<SelectItem
																	key={item.id}
																	value={String(item.id)}>
																	{item.name}
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
							{notificationSources?.data.find((item) => {
								return item.id === form.watch('notification_source_id');
							})?.demo_config && (
								<>
									<FormField
										name='config_json'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t(
															'setting_notification_source_manage_form_config_json'
														)}
													</FormLabel>
													<Textarea
														placeholder={t(
															'setting_notification_source_manage_form_config_json_placeholder'
														)}
														className='font-mono break-all'
														{...field}
														value={field.value ?? ''}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormLabel>
										{t('setting_notification_source_manage_form_config_json_demo')}
									</FormLabel>
									<div className='p-5 rounded bg-muted font-mono text-sm break-all'>
										{
											notificationSources?.data.find((item) => {
												return item.id === form.watch('notification_source_id');
											})?.demo_config
										}
									</div>
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
