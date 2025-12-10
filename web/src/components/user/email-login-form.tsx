'use client';

import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import Cookies from 'js-cookie';
import {
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
import { Loader2, Phone } from 'lucide-react';
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
import GithubIcon from '../icons/github-icon';
import { GOOGLE_CLIENT_ID } from '@/config/google';
import { GITHUB_CLIENT_ID } from '@/config/github';
import { useLoginProvider } from '@/provider/login-provider';
import WechatIcon from '../icons/wechat-icon';

const EmailLoginForm = () => {
	const t = useTranslations();

	const emailFormSchema = z.object({
		email: z.string().email(t('seo_login_email_format_error')),
		password: z.string().min(8, t('seo_login_password_no_less_than')),
	});

	const { loginWay, setLoginWay } = useLoginProvider();

	const searchParams = useSearchParams();
	const redirect_page = searchParams.get('redirect_to') || '/dashboard';
	const [submitLoading, setSubmitLoading] = useState(false);
	const router = useRouter();
	const { refreshMainUserInfo } = useUserContext();
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
			refreshMainUserInfo();
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

	const handleGitHubLogin = () => {
		// redirect the user to github
		const link = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&response_type=code&redirect_uri=${window.location.origin}/integrations/github/oauth2/create/callback`;
		window.location.assign(link);
	};

	return (
		<Form {...emailForm}>
			<form onSubmit={onSubmitEmailForm} className='space-y-2 min-w-100'>
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
					<Button disabled={submitLoading} type='submit' className='w-full'>
						{submitLoading && <Loader2 className='mr-1 size-4 animate-spin' />}
						{t('seo_login_submit')}
					</Button>
					{process.env.NEXT_PUBLIC_ALLOW_THIRD_PARTY_AUTH === 'true' && (
						<>
							<div className='my-2 w-full relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border'>
								<span className='relative z-10 bg-background px-2 text-muted-foreground'>
									OR
								</span>
							</div>
							<div className='w-full grid grid-cols-4 gap-2'>
								<Link
									href={`https://open.weixin.qq.com/connect/qrconnect?appid=${
										process.env.NEXT_PUBLIC_WECHAT_APP_ID
									}&redirect_uri=${encodeURIComponent(
										`https://app.revornix.com/integrations/wechat/oauth/create/callback`
									)}&response_type=code&scope=snsapi_login&state=ndkasnl#wechat_redirect`}>
									<Button type='button' className='w-full'>
										<WechatIcon />
									</Button>
								</Link>
								<Button
									type='button'
									className='w-full'
									onClick={handleGoogleLogin}>
									<GoogleIcon />
								</Button>
								<Button
									type='button'
									className='w-full'
									onClick={handleGitHubLogin}>
									<GithubIcon />
								</Button>
								<Button
									type='button'
									className='w-full'
									onClick={() => setLoginWay('phone')}>
									<Phone />
								</Button>
							</div>
						</>
					)}
					<div className='w-full'>
						<div className='mt-4 text-center text-sm'>
							<span className='mr-2'>{t('seo_login_no_account')}</span>
							<Link href='/register' className='underline'>
								{t('seo_login_go_to_register')}
							</Link>
						</div>
					</div>
				</CardFooter>
			</form>
		</Form>
	);
};

export default EmailLoginForm;
