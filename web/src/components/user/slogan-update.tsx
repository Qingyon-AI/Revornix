'use client';

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUserContext } from '@/provider/user-provider';
import { useMutation } from '@tanstack/react-query';
import { updateUserInfo } from '@/service/user';
import { UserInfoUpdateRequest } from '@/generated';
import { useTranslations } from 'next-intl';

const SloganUpdate = () => {
	const t = useTranslations();

	const sloganFormSchema = z.object({
		slogan: z.string().min(1, t('account_slogan_no_less_than')),
	});
	const { refreshUserInfo } = useUserContext();
	const mutation = useMutation({
		mutationFn: async (newUserInfo: UserInfoUpdateRequest) => {
			return updateUserInfo(newUserInfo);
		},
		onSuccess: () => {
			refreshUserInfo();
		},
	});
	const { userInfo } = useUserContext();
	const [formSubmitStatus, setFormSubmitStatus] = useState(false);
	const [showSloganUpdateFormDialog, setShowSloganUpdateFormDialog] =
		useState(false);
	const form = useForm<z.infer<typeof sloganFormSchema>>({
		resolver: zodResolver(sloganFormSchema),
		defaultValues: {
			slogan: '',
		},
	});

	const onSubmitSloganUpdateForm = async (
		event: React.FormEvent<HTMLFormElement>
	) => {
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

	const onFormValidateSuccess = async (
		values: z.infer<typeof sloganFormSchema>
	) => {
		setFormSubmitStatus(true);
		await mutation.mutateAsync({ slogan: values.slogan });
		if (mutation.isError) {
			toast.error(mutation.error.message);
			setFormSubmitStatus(false);
			return;
		}
		toast.success(t('account_slogan_update_success'));
		setFormSubmitStatus(false);
		setShowSloganUpdateFormDialog(false);
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<div className='flex flex-row items-center'>
				{userInfo && userInfo.slogan && (
					<div className='font-bold text-xs line-clamp-1 max-w-40'>
						{userInfo.slogan}
					</div>
				)}
				<Button
					variant={'link'}
					className='text-xs'
					onClick={() => setShowSloganUpdateFormDialog(true)}
					type='button'>
					{t('account_slogan_update')}
				</Button>
			</div>
			<Dialog
				open={showSloganUpdateFormDialog}
				onOpenChange={setShowSloganUpdateFormDialog}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>{t('account_slogan_update')}</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={onSubmitSloganUpdateForm} className='space-y-5'>
							<div className='space-y-5'>
								<FormField
									control={form.control}
									name='slogan'
									render={({ field }) => (
										<FormItem>
											<div className='flex flex-col gap-2'>
												<FormControl>
													<Textarea
														className='min-h-52'
														placeholder={t('account_slogan_update_placeholder')}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</div>
										</FormItem>
									)}
								/>
							</div>
							<DialogFooter className='sm:justify-end'>
								<Button type='submit' disabled={formSubmitStatus}>
									{t('account_slogan_update_confirm')}
									{formSubmitStatus && (
										<Loader2 className='size-4 animate-spin' />
									)}
								</Button>
								<DialogClose asChild>
									<Button type='button' variant='secondary'>
										{t('account_slogan_update_cancel')}
									</Button>
								</DialogClose>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SloganUpdate;
