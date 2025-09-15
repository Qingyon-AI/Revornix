'use client';

import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import Cookies from 'js-cookie';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginUser } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import GoogleIcon from '../icons/google-icon';
import { GOOGLE_CLIENT_ID } from '@/config/google';

const EmailLoginForm = () => {
	const t = useTranslations();

	const emailFormSchema = z.object({
		email: z.string().email(t('seo_login_email_format_error')),
		password: z.string().min(8, t('seo_login_password_no_less_than')),
	});

	const searchParams = useSearchParams();
	const redirect_page = searchParams.get('redirect_to') || '/dashboard';
	const [submitLoading, setSubmitLoading] = useState(false);
	const router = useRouter();
	const { refreshUserInfo } = useUserContext();
	const emailForm = useForm<z.infer<typeof emailFormSchema>>({
		resolver: zodResolver(emailFormSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	});

	const onSubmitEmailForm = async (event: React.FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return emailForm.handleSubmit(
			onEmailSubmitSuccess,
			onEmailSubmitError
		)(event);
	};

	const onEmailSubmitSuccess = async (
		values: z.infer<typeof emailFormSchema>
	) => {
		setSubmitLoading(true);
		const [res, err] = await utils.to(
			loginUser({
				email: values.email,
				password: values.password,
			})
		);
		if (err || !res) {
			toast.error(err.message);
			setSubmitLoading(false);
		} else {
			Cookies.set('access_token', res.access_token);
			Cookies.set('refresh_token', res.refresh_token);
			toast.success(t('seo_login_success'));
			setSubmitLoading(false);
			refreshUserInfo();
			router.push(redirect_page);
		}
	};

	const onEmailSubmitError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const handleGoogleLogin = () => {
		// redirect the user to github
		const link = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${window.location.origin}/integrations/google/oauth2/create/callback&scope=openid email profile&response_type=code`;
		window.location.assign(link);
	};

	return (
		<Card>
			<Form {...emailForm}>
				<form onSubmit={onSubmitEmailForm} className='space-y-2 min-w-80'>
					<CardHeader className='mb-5'>
						<CardTitle className='text-2xl'>{t('seo_login')}</CardTitle>
						<CardDescription>{t('seo_login_description')}</CardDescription>
					</CardHeader>
					<CardContent>
						<FormField
							control={emailForm.control}
							name='email'
							render={({ field }) => (
								<FormItem className='mb-5'>
									<FormLabel>{t('seo_login_form_email')}</FormLabel>
									<FormControl>
										<Input
											placeholder={t('seo_login_form_email_placeholder')}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={emailForm.control}
							name='password'
							render={({ field }) => (
								<FormItem className='mb-5'>
									<FormLabel>{t('seo_login_form_password')}</FormLabel>
									<FormControl>
										<Input
											type='password'
											placeholder={t('seo_login_form_password_placeholder')}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter className='flex flex-col gap-2'>
						<div className='w-full'>
							<Button disabled={submitLoading} type='submit' className='w-full'>
								{submitLoading && (
									<Loader2 className='mr-1 size-4 animate-spin' />
								)}
								{t('seo_login_submit')}
							</Button>
							<div className='mt-4 text-center text-sm'>
								{t('seo_login_no_account')}
								<Link href='/register' className='underline'>
									{t('seo_login_go_to_register')}
								</Link>
							</div>
						</div>
						<div className='my-2 w-full relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border'>
							<span className='relative z-10 bg-background px-2 text-muted-foreground'>
								OR
							</span>
						</div>
						<div className='w-full grid grid-cols-1 gap-2'>
							<Button type='button' className='w-full' onClick={handleGoogleLogin}>
								<GoogleIcon />
							</Button>
						</div>
					</CardFooter>
				</form>
			</Form>
		</Card>
	);
};

export default EmailLoginForm;
