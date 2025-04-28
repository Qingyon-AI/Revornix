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
	FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { bindEmailVerify } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

const EmailBind = () => {
	const t = useTranslations();
	const emailFormSchema = z.object({
		email: z.string().email(t('account_email_format_error')),
	});
	const [bindingEmail, startBindEmailTransition] = useTransition();
	const { userInfo, refreshUserInfo } = useUserContext();
	const [showBindEmailDialog, setShowBindEmailDialog] = useState(false);

	const form = useForm<z.infer<typeof emailFormSchema>>({
		resolver: zodResolver(emailFormSchema),
		defaultValues: {
			email: '',
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
			const [res, err] = await utils.to(bindEmailVerify(values));
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success(t('account_email_update_success'));
			refreshUserInfo();
			setShowBindEmailDialog(false);
			form.reset();
		});
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			{userInfo && userInfo.email_info && (
				<>
					<div className='flex flex-row items-center'>
						<div className='font-bold text-xs'>{userInfo.email_info.email}</div>
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
						<DialogTitle>{t('account_email_update')}</DialogTitle>
						<DialogDescription>
							{t('account_email_update_description')}
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={onSubmitBindEmailForm} className='space-y-5'>
							<div className='grid gap-4'>
								<div className='grid gap-2'>
									<FormField
										control={form.control}
										name='email'
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input
														placeholder={t('account_email_update_placeholder')}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
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

export default EmailBind;
