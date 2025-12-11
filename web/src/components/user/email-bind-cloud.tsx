'use client';

import { FormEvent, useState, useTransition } from 'react';
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
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { bindEmailCodeVerify, bindEmailCode } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { useCountDown } from 'ahooks';

const EmailBindCloud = () => {
	const t = useTranslations();
	const emailFormSchema = z.object({
		email: z.string().email(t('account_email_format_error')),
		code: z.string().length(6),
	});
	const [bindingEmail, startBindEmailTransition] = useTransition();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const [showBindEmailDialog, setShowBindEmailDialog] = useState(false);
	const [codeSending, setCodeSending] = useState(false);

	const [targetDate, setTargetDate] = useState<number>();
	const [countdown] = useCountDown({
		targetDate,
	});

	const onSendCode = async () => {
		form.trigger('email');
		if (form.formState.errors.email) {
			toast.error(form.formState.errors.email.message);
			return;
		}
		setCodeSending(true);
		const [res, err] = await utils.to(
			bindEmailCode({ email: form.getValues('email') })
		);
		if (err || !res) {
			toast.error(err.message);
			setCodeSending(false);
			return;
		}
		setCodeSending(false);
		setTargetDate(Date.now() + 60000);
		toast.success(t('seo_register_form_email_code_send_success_fullly'));
	};

	const form = useForm<z.infer<typeof emailFormSchema>>({
		resolver: zodResolver(emailFormSchema),
		defaultValues: {
			email: '',
			code: '',
		},
	});

	const onSubmitBindEmailForm = async (event: FormEvent<HTMLFormElement>) => {
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
		values: z.infer<typeof emailFormSchema>
	) => {
		startBindEmailTransition(async () => {
			const [res, err] = await utils.to(bindEmailCodeVerify(values));
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success(t('account_email_update_success'));
			refreshMainUserInfo();
			setShowBindEmailDialog(false);
			form.reset();
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			{mainUserInfo && !mainUserInfo.email_info && (
				<Button
					variant={'link'}
					className='text-xs'
					onClick={() => {
						setShowBindEmailDialog(true);
					}}>
					{t('account_email_bind')}
				</Button>
			)}

			{mainUserInfo && mainUserInfo.email_info && (
				<>
					<div className='flex flex-row items-center'>
						<div className='font-bold text-xs'>
							{mainUserInfo.email_info.email}
						</div>
						<Button
							variant={'link'}
							className='text-xs'
							onClick={() => {
								setShowBindEmailDialog(true);
							}}>
							{t('account_email_update')}
						</Button>
					</div>
				</>
			)}

			<Dialog open={showBindEmailDialog} onOpenChange={setShowBindEmailDialog}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>
							{mainUserInfo?.email_info
								? t('account_email_update')
								: t('account_email_bind')}
						</DialogTitle>
						<DialogDescription>
							{mainUserInfo?.email_info
								? t('account_email_update_description')
								: t('account_email_bind_description')}
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={onSubmitBindEmailForm} className='space-y-5'>
							<div className='grid gap-4'>
								<FormField
									control={form.control}
									name='email'
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Input
													placeholder={
														mainUserInfo?.email_info
															? t('account_email_update_placeholder')
															: t('account_email_bind_placeholder')
													}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='code'
									render={({ field }) => (
										<FormItem>
											<div className='flex w-full items-center gap-3'>
												<FormControl>
													<Input
														placeholder={t(
															'seo_register_form_email_code_placeholder'
														)}
														{...field}
													/>
												</FormControl>
												<Button
													type='button'
													onClick={onSendCode}
													disabled={!!countdown || codeSending}>
													{!countdown && t('seo_register_form_email_code_send')}
													{!!countdown && `${Math.round(countdown / 1000)}`}
													{codeSending && (
														<Loader2 className='size-4 animate-spin' />
													)}
												</Button>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<DialogFooter className='sm:justify-end'>
								<Button type='submit' disabled={bindingEmail}>
									{t('account_email_update_confirm')}
									{bindingEmail && <Loader2 className='size-4 animate-spin' />}
								</Button>
								<DialogClose asChild>
									<Button type='button' variant='secondary'>
										{t('account_email_update_cancel')}
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

export default EmailBindCloud;
