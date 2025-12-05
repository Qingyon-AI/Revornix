'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import Cookies from 'js-cookie';
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
	createEmailUser,
	createEmailUserCode,
	createEmailUserCodeVerify,
} from '@/service/user';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { useCountDown } from 'ahooks';

export function RegisterFormCloud() {
	const t = useTranslations();

	const formSchema = z
		.object({
			email: z.string().email(t('seo_register_email_format_error')),
			password: z.string().min(8, t('seo_register_password_no_less_than')),
			passwordAgain: z.string().min(8, t('seo_register_password_no_less_than')),
			code: z.string().length(6),
		})
		.refine((data) => data.password === data.passwordAgain, {
			message: t('seo_register_password_again_different'),
			path: ['passwordAgain'],
		});

	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
	const [codeSending, setCodeSending] = useState(false);

	const { refreshUserInfo } = useUserContext();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: '',
			passwordAgain: '',
			code: '',
		},
	});

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
			createEmailUserCode({ email: form.getValues('email') })
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

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onSuccess, onError)(event);
	};

	const onSuccess = async (values: z.infer<typeof formSchema>) => {
		setSubmitting(true);
		const [res, err] = await utils.to(
			createEmailUserCodeVerify({
				email: values.email,
				code: values.code,
				password: values.password,
			})
		);
		if (err || !res) {
			toast.error(err.message);
			setSubmitting(false);
			return;
		}
		toast.success(t('seo_register_success'));
		Cookies.set('access_token', res.access_token);
		Cookies.set('refresh_token', res.refresh_token);
		refreshUserInfo();
		router.push('/dashboard');
		setSubmitting(false);
	};

	const onError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<Form {...form}>
			<form onSubmit={onSubmit} className='space-y-2 min-w-100'>
				<CardHeader className='mb-5'>
					<CardTitle className='text-2xl'>{t('seo_register')}</CardTitle>
					<CardDescription>{t('seo_register_description')}</CardDescription>
				</CardHeader>
				<CardContent>
					<FormField
						control={form.control}
						name='email'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_register_form_email')}</FormLabel>
								<FormControl>
									<Input
										placeholder={t('seo_register_form_email_placeholder')}
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
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_register_form_email_code')}</FormLabel>
								<div className='flex w-full max-w-sm items-center space-x-2'>
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
										{codeSending && <Loader2 className='size-4 animate-spin' />}
									</Button>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='password'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_register_form_password')}</FormLabel>
								<FormControl>
									<Input
										type='password'
										placeholder={t('seo_register_form_password_placeholder')}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='passwordAgain'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_register_form_password_again')}</FormLabel>
								<FormControl>
									<Input
										type='password'
										placeholder={t(
											'seo_register_form_password_again_placeholder'
										)}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button className='w-full' type='submit' disabled={submitting}>
						{t('seo_register_submit')}
						{submitting && <Loader2 className='mr-1 size-4 animate-spin' />}
					</Button>
					<div className='mt-4 text-center text-sm'>
						<span className='mr-2'>
							{t('seo_register_already_have_account')}
						</span>
						<Link href='/login' className='underline'>
							{t('seo_login_go_to_login')}
						</Link>
					</div>
				</CardContent>
			</form>
		</Form>
	);
}
