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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getQueryClient } from '@/lib/get-query-client';
import { addNotificationTarget } from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
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
import { useMutation } from '@tanstack/react-query';
import { Loader2, PlusCircleIcon } from 'lucide-react';

const AddNotificationTarget = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		title: z.string(),
		description: z.string(),
		category: z.number(),
		email: z.string().email().optional(),
	});

	const [showAddDialog, setShowAddDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			category: 0,
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

	const mutateAddNotificationTarget = useMutation({
		mutationFn: addNotificationTarget,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				predicate: (query) => {
					return query.queryKey.includes('notification-target');
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
											<Select
												onValueChange={(value) => field.onChange(Number(value))}
												defaultValue={String(field.value)}>
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
