'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import Cookies from 'js-cookie';
import {
	Card,
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
import { createEmailUserVerify } from '@/service/user';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

export function RegisterForm() {
	const t = useTranslations();

	const formSchema = z
		.object({
			email: z.string().email(t('seo_register_email_format_error')),
			password: z.string().min(8, t('seo_register_password_no_less_than')),
			passwordAgain: z.string().min(8, t('seo_register_password_no_less_than')),
		})
		.refine((data) => data.password === data.passwordAgain, {
			message: t('seo_register_password_again_different'),
			path: ['passwordAgain'],
		});

	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
	const { refreshUserInfo } = useUserContext();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: '',
			passwordAgain: '',
		},
	});

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
			createEmailUserVerify({
				email: values.email,
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
		<Card className='mx-auto max-w-sm'>
			<Form {...form}>
				<form onSubmit={onSubmit} className='space-y-2 min-w-80'>
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
						<div className='grid gap-2'>
							<FormField
								control={form.control}
								name='password'
								render={({ field }) => (
									<FormItem className='mb-5'>
										<FormLabel>{t('seo_register_form_password')}</FormLabel>
										<FormControl>
											<Input
												type='password'
												placeholder={t(
													'seo_register_form_password_placeholder'
												)}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className='grid gap-2'>
							<FormField
								control={form.control}
								name='passwordAgain'
								render={({ field }) => (
									<FormItem className='mb-5'>
										<FormLabel>
											{t('seo_register_form_password_again')}
										</FormLabel>
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
						</div>
						<Button className='w-full' type='submit' disabled={submitting}>
							{t('seo_register_submit')}
							{submitting && <Loader2 className='mr-1 size-4 animate-spin' />}
						</Button>
						<div className='mt-4 text-center text-sm'>
							{t('seo_register_already_have_account')}
							<Link href='/login' className='underline'>
								{t('seo_login_go_to_login')}
							</Link>
						</div>
					</CardContent>
				</form>
			</Form>
		</Card>
	);
}
