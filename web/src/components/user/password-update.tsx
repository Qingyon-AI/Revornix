'use client';

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
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
import { Label } from '@/components/ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getMyInitialPassword, updatePassword } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';
import { useQuery } from '@tanstack/react-query';
import { useCopyToClipboard } from 'react-use';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

const PassWordUpdate = () => {
	const t = useTranslations();
	const passwordFormSchema = z.object({
		origin_password: z.string(),
		password: z
			.string()
			.min(8, t('account_password_update_form_password_no_less_than')),
	});
	const { userInfo, refreshUserInfo } = useUserContext();
	const [isSubmitting, startSubmittingTransition] = useTransition();
	const [copiedText, copy] = useCopyToClipboard();
	const [initialPassword, setInitialPassword] = useState<string>();
	const [showInitialPasswordDialog, setShowInitialPasswordDialog] =
		useState(false);
	const [showPasswordUpdateDialog, setShowPasswordUpdateDialog] =
		useState(false);

	const onSubmitUpdatePasswordForm = async (
		event: FormEvent<HTMLFormElement>
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

	const form = useForm<z.infer<typeof passwordFormSchema>>({
		resolver: zodResolver(passwordFormSchema),
		defaultValues: {
			origin_password: '',
			password: '',
		},
	});

	const onFormValidateSuccess = async (
		values: z.infer<typeof passwordFormSchema>
	) => {
		startSubmittingTransition(async () => {
			const [res, err] = await utils.to(
				updatePassword({
					origin_password: values.origin_password,
					new_password: values.password,
				})
			);
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success(t('account_password_update_success'));
			form.reset();
			refreshUserInfo();
			setShowPasswordUpdateDialog(false);
		});
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error(t('form_validate_failed'));
	};

	const {
		isFetching: isInitialPasswordFetching,
		refetch: refetchInitialPassword,
	} = useQuery({
		enabled: false,
		retry: false,
		queryKey: ['getMyInitialPassword', userInfo],
		queryFn: getMyInitialPassword,
	});

	return (
		<>
			{userInfo && userInfo.email_info && (
				<>
					<Dialog
						open={showInitialPasswordDialog}
						onOpenChange={(v) => {
							setShowInitialPasswordDialog(v);
							if (!v) {
								refreshUserInfo();
							}
						}}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{t('account_password_initial_password')}
								</DialogTitle>
								<DialogDescription>
									{t('account_password_initial_password_description')}
								</DialogDescription>
							</DialogHeader>
							<div>
								<div className='flex items-center space-x-2'>
									<div className='grid flex-1 gap-2'>
										{!initialPassword && isInitialPasswordFetching ? (
											<p className='text-sm text-muted-foreground'>
												{t('account_password_initial_password_loading')}
											</p>
										) : (
											<Input id='link' value={initialPassword} readOnly />
										)}
									</div>
									<Button
										onClick={() => {
											initialPassword && copy(initialPassword);
											toast.success(t('copied'));
										}}
										size='sm'
										className='px-3'>
										<span className='sr-only'>Copy</span>
										<Copy />
									</Button>
								</div>
							</div>
							<DialogFooter>
								<DialogClose asChild>
									<Button>{t('confirm')}</Button>
								</DialogClose>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<div className='flex flex-row gap-5'>
						{userInfo.email_info.is_initial_password &&
							!userInfo.email_info.has_seen_initial_password && (
								<Button
									onClick={async () => {
										setShowInitialPasswordDialog(true);
										const { data, error, isError } =
											await refetchInitialPassword();
										if (isError) {
											toast.error(error.message);
											return;
										}
										data && setInitialPassword(data.password);
									}}>
									{t('account_password_see_initial_password')}
								</Button>
							)}
						<Button
							variant='outline'
							onClick={() => {
								setShowPasswordUpdateDialog(true);
							}}>
							{t('account_password_update')}
						</Button>
					</div>
					<Dialog
						open={showPasswordUpdateDialog}
						onOpenChange={setShowPasswordUpdateDialog}>
						<DialogContent className='sm:max-w-md'>
							<DialogHeader>
								<DialogTitle>{t('account_password_update')}</DialogTitle>
							</DialogHeader>
							<Form {...form}>
								<form
									onSubmit={onSubmitUpdatePasswordForm}
									className='space-y-5'>
									<div className='space-y-5'>
										<FormField
											control={form.control}
											name='origin_password'
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input
															type='password'
															placeholder={t(
																'account_password_origin_placeholder'
															)}
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name='password'
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input
															type='password'
															placeholder={t(
																'account_password_new_placeholder'
															)}
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
									<DialogFooter className='sm:justify-end'>
										<Button type='submit' disabled={isSubmitting}>
											{t('account_password_update_confirm')}
											{isSubmitting && (
												<Loader2 className='size-4 animate-spin' />
											)}
										</Button>
										<DialogClose asChild>
											<Button type='button' variant='secondary'>
												{t('account_password_update_cancel')}
											</Button>
										</DialogClose>
									</DialogFooter>
								</form>
							</Form>
						</DialogContent>
					</Dialog>
				</>
			)}
		</>
	);
};

export default PassWordUpdate;
