'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, PlusCircleIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';

const AddNotificationTarget = () => {
	const locale = useLocale();
	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		title: z.string(),
		notification_target_provided_id: z.number(),
		description: z.string().optional(),
		config_json: z.string().optional(),
		is_public: z.boolean(),
	});

	const [showAddDialog, setShowAddDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			config_json: '',
			is_public: false,
		},
	});

	const { data: notificationTargets } = useQuery({
		queryKey: ['searchNotificationTargets'],
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
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent>
					<DialogTitle>
						{t('setting_notification_target_manage_add_form_label')}
					</DialogTitle>
					<DialogDescription>
						{t('setting_notification_target_manage_form_desc')}
					</DialogDescription>
					<Form {...form}>
						<form
							onSubmit={onSubmitForm}
							className='space-y-3'
							id='add-notification-target-form'>
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
							{notificationTargets?.data.find((item) => {
								return (
									item.id === form.watch('notification_target_provided_id')
								);
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
											{t('setting_notification_target_manage_form_config_demo')}
										</FormLabel>
										<div className='p-5 rounded bg-muted font-mono text-sm break-all col-span-9'>
											{
												notificationTargets?.data.find((item) => {
													return (
														item.id ===
														form.watch('notification_target_provided_id')
													);
												})?.demo_config
											}
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
													{t('setting_notification_target_is_public')}
												</FormLabel>
												<Switch
													checked={field.value}
													onCheckedChange={(e) => {
														field.onChange(e);
													}}
												/>
											</div>
											<FormDescription>
												{t(
													'setting_notification_target_manage_form_is_public_tips',
												)}
											</FormDescription>
										</FormItem>
									);
								}}
							/>
						</form>
					</Form>
					<DialogFooter>
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
				</DialogContent>
			</Dialog>
		</>
	);
};

export default AddNotificationTarget;
