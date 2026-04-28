'use client';

import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { setAuthCookies } from '@/lib/auth-cookies';
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
import { encodeRedirectState, getSafeRedirectPage } from '@/lib/safe-redirect';
import { isEnvEnabled } from '@/lib/env';
import { buildOAuthCallbackUrl, buildWechatCallbackUrl } from '@/lib/oauth';

const EmailLoginForm = () => {
	const t = useTranslations();

	const emailFormSchema = z.object({
		email: z.string().email(t('seo_login_email_format_error')),
		password: z.string().min(8, t('seo_login_password_no_less_than')),
	});

	const { loginWay, setLoginWay } = useLoginProvider();

	const searchParams = useSearchParams();
	const redirect_page = getSafeRedirectPage(searchParams.get('redirect_to'));
	const redirectState = encodeRedirectState(searchParams.get('redirect_to'));
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
			toast.error(err?.message ?? t('seo_login_failed'));
			setSubmitLoading(false);
		} else {
			setAuthCookies(res);
			toast.success(t('seo_login_success'));
			setSubmitLoading(false);
			void refreshMainUserInfo();
			router.replace(redirect_page);
		}
	};

	const onEmailSubmitError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const handleGoogleLogin = () => {
		const link = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${buildOAuthCallbackUrl('google', 'create')}&scope=openid email profile&response_type=code&state=${redirectState}`;
		window.location.assign(link);
	};

	const handleGitHubLogin = () => {
		const link = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&response_type=code&redirect_uri=${buildOAuthCallbackUrl('github', 'create')}&state=${redirectState}`;
		window.location.assign(link);
	};

	const wechatCreateRedirectUri = buildWechatCallbackUrl('create');

	return (
		<Form {...emailForm}>
			<form onSubmit={onSubmitEmailForm} className='w-full space-y-2'>
				<CardHeader className='mb-5 px-0 pb-0 pt-0'>
					<CardTitle className='text-[1.95rem] tracking-tight'>
						{t('seo_login')}
					</CardTitle>
					<CardDescription className='text-sm leading-6'>
						{t('seo_login_description')}
					</CardDescription>
				</CardHeader>
				<CardContent className='px-0'>
					<FormField
						control={emailForm.control}
						name='email'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_login_form_email')}</FormLabel>
								<FormControl>
									<Input
										className='h-11 rounded-xl border-border/70 bg-background/80 shadow-none'
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
										className='h-11 rounded-xl border-border/70 bg-background/80 shadow-none'
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
				<CardFooter className='flex flex-col gap-3 px-0 pb-0 pt-0'>
					<Button
						disabled={submitLoading}
						type='submit'
						className='h-11 w-full rounded-xl'>
						{submitLoading && <Loader2 className='mr-1 size-4 animate-spin' />}
						{t('seo_login_submit')}
					</Button>
					{isEnvEnabled(process.env.NEXT_PUBLIC_ALLOW_THIRD_PARTY_AUTH) && (
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
										wechatCreateRedirectUri
									)}&response_type=code&scope=snsapi_login&state=${redirectState}#wechat_redirect`}>
									<Button type='button' variant='outline' className='h-11 w-full rounded-xl shadow-none'>
										<WechatIcon />
									</Button>
								</Link>
								<Button
									type='button'
									variant='outline'
									className='h-11 w-full rounded-xl shadow-none'
									onClick={handleGoogleLogin}>
									<GoogleIcon />
								</Button>
								<Button
									type='button'
									variant='outline'
									className='h-11 w-full rounded-xl shadow-none'
									onClick={handleGitHubLogin}>
									<GithubIcon />
								</Button>
								<Button
									type='button'
									variant='outline'
									className='h-11 w-full rounded-xl shadow-none'
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
