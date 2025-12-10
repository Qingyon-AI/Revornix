'use client';
import React, { useTransition } from 'react';

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from '@/components/ui/form';
import { bindPhoneCode, bindPhoneVerify, unBindPhone } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useCountDown } from 'ahooks';
import { useTranslations } from 'next-intl';

const phoneFormSchema = z.object({
	phone: z.string().min(8).max(40),
	code: z.string().min(1).max(40),
});

const PhoneBind = () => {
	const t = useTranslations();
	const [targetDate, setTargetDate] = useState<number>();
	const [countdown] = useCountDown({
		targetDate,
	});
	const [bindingPhone, startBindPhoneTransition] = useTransition();
	const [unBindingPhone, startUnBindPhoneTransition] = useTransition();
	const [sendingCode, startSendingCodeTransition] = useTransition();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const [showPhoneBindFormDialog, setShowPhoneBindFormDialog] = useState(false);

	const form = useForm<z.infer<typeof phoneFormSchema>>({
		resolver: zodResolver(phoneFormSchema),
		defaultValues: {
			phone: '',
			code: '',
		},
	});

	const onSubmitPhoneBindForm = async (
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
		values: z.infer<typeof phoneFormSchema>
	) => {
		startBindPhoneTransition(async () => {
			const [res, err] = await utils.to(bindPhoneVerify(values));
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success(t('account_bind_successfullt'));
			refreshMainUserInfo();
			setShowPhoneBindFormDialog(false);
		});
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error(t('form_validate_error'));
	};

	const onSendCode = () => {
		form.trigger('phone');
		if (form.formState.errors.phone) {
			toast.error(form.formState.errors.phone.message);
			return;
		}
		startSendingCodeTransition(async () => {
			const [res, err] = await utils.to(
				bindPhoneCode({ phone: form.getValues('phone') })
			);
			console.log(res, err);
			if (err || !res) {
				toast.error(err.message);
				return;
			}
			setTargetDate(Date.now() + 60000);
			toast.success(t('account_phone_code_send_successfully'));
		});
	};

	const handleUnBindPhone = () => {
		startUnBindPhoneTransition(async () => {
			const [res, err] = await utils.to(unBindPhone());
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success(t('account_unbind_successfully'));
			refreshMainUserInfo();
			form.reset();
			setShowPhoneBindFormDialog(false);
		});
	};

	return (
		<>
			{mainUserInfo && !mainUserInfo.phone_info && (
				<Button
					variant='outline'
					onClick={() => {
						setShowPhoneBindFormDialog(true);
					}}>
					{t('account_go_bind')}
				</Button>
			)}

			{mainUserInfo && mainUserInfo.phone_info && (
				<div className='flex flex-row items-center'>
					<div className='font-bold text-xs'>
						{mainUserInfo.phone_info.phone}
					</div>
					<Button
						variant={'link'}
						className='text-xs'
						disabled={unBindingPhone}
						onClick={handleUnBindPhone}>
						{t('account_unbind')}
						{unBindingPhone && <Loader2 className='size-4 animate-spin' />}
					</Button>
				</div>
			)}

			<Dialog
				open={showPhoneBindFormDialog}
				onOpenChange={setShowPhoneBindFormDialog}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>{t('account_go_bind')}</DialogTitle>
						<DialogDescription>
							{t('account_phone_bind_form_description')}
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={onSubmitPhoneBindForm} className='space-y-5'>
							<div className='space-y-5'>
								<FormField
									control={form.control}
									name='phone'
									render={({ field }) => (
										<FormItem>
											<div className='flex flex-col gap-2'>
												<FormControl>
													<Input
														type='text'
														placeholder={t(
															'account_phone_bind_form_phone_placeholder'
														)}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</div>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='code'
									render={({ field }) => (
										<FormItem className='flex flex-col'>
											<div className='flex flex-row gap-2 flex-1 items-center w-full'>
												<FormControl className='flex-1'>
													<Input
														type='text'
														placeholder={t(
															'account_phone_bind_form_code_placeholder'
														)}
														{...field}
													/>
												</FormControl>
												<Button
													type='button'
													onClick={onSendCode}
													disabled={sendingCode || !!countdown}>
													{!countdown && t('account_phone_bind_form_send_code')}
													{!!countdown && `${Math.round(countdown / 1000)}s`}
													{sendingCode && (
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
								<Button type='submit' disabled={bindingPhone}>
									{t('confirm')}
									{bindingPhone && <Loader2 className='size-4 animate-spin' />}
								</Button>
								<DialogClose asChild>
									<Button type='button' variant='secondary'>
										{t('cancel')}
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

export default PhoneBind;
