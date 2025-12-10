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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const NicknameUpdate = () => {
	const t = useTranslations();

	const nicknameFormSchema = z.object({
		nickname: z.string().min(1, t('account_nickname_no_less_than')),
	});
	const { refreshMainUserInfo } = useUserContext();
	const mutation = useMutation({
		mutationFn: async (newUserInfo: UserInfoUpdateRequest) => {
			return updateUserInfo(newUserInfo);
		},
		onSuccess: () => {
			refreshMainUserInfo();
			toast.success('Name updated successfully');
		},
		onError: (error) => {
			toast.error(error.message);
		},
		onSettled: () => {
			setFormSubmitStatus(false);
			setShowNicknameUpdateFormDialog(false);
		},
	});
	const { mainUserInfo } = useUserContext();
	const [formSubmitStatus, setFormSubmitStatus] = useState(false);
	const [showNicknameUpdateFormDialog, setShowNicknameUpdateFormDialog] =
		useState(false);
	const form = useForm<z.infer<typeof nicknameFormSchema>>({
		resolver: zodResolver(nicknameFormSchema),
		defaultValues: {
			nickname: '',
		},
	});

	const onSubmitNicknameUpdateForm = async (
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
		values: z.infer<typeof nicknameFormSchema>
	) => {
		setFormSubmitStatus(true);
		mutation.mutate({
			nickname: values.nickname,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<div className='flex flex-row items-center'>
				{mainUserInfo && mainUserInfo.nickname && (
					<div className='font-bold text-xs'>{mainUserInfo.nickname}</div>
				)}
				<Button
					variant={'link'}
					className='text-xs'
					onClick={() => setShowNicknameUpdateFormDialog(true)}
					type='button'>
					{t('account_nickname_update')}
				</Button>
			</div>
			<Dialog
				open={showNicknameUpdateFormDialog}
				onOpenChange={setShowNicknameUpdateFormDialog}>
				<DialogContent
					className='sm:max-w-md'
					onOpenAutoFocus={(e) => e.preventDefault()}>
					<DialogHeader>
						<DialogTitle>{t('account_nickname_update')}</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={onSubmitNicknameUpdateForm} className='space-y-5'>
							<div className='space-y-5'>
								<FormField
									control={form.control}
									name='nickname'
									render={({ field }) => (
										<FormItem>
											<div className='flex flex-col gap-2'>
												<FormControl>
													<Input
														type='text'
														placeholder={t(
															'account_nickname_update_placeholder'
														)}
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
									{t('account_nickname_update_confirm')}
									{formSubmitStatus && (
										<Loader2 className='size-4 animate-spin' />
									)}
								</Button>
								<DialogClose asChild>
									<Button type='button' variant='secondary'>
										{t('account_nickname_update_cancel')}
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

export default NicknameUpdate;
