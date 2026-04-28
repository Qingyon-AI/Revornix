'use client';

import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { createSMSUserVerify, createUserSMSCode } from '@/service/user';
import { setAuthCookies } from '@/lib/auth-cookies';
import {
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { useCountDown } from 'ahooks';
import { useLoginProvider } from '@/provider/login-provider';
import { utils } from '@kinda/utils';
import { useUserContext } from '@/provider/user-provider';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import GoogleIcon from '../icons/google-icon';
import GithubIcon from '../icons/github-icon';
import { GOOGLE_CLIENT_ID } from '@/config/google';
import { GITHUB_CLIENT_ID } from '@/config/github';
import WechatIcon from '../icons/wechat-icon';
import { encodeRedirectState, getSafeRedirectPage } from '@/lib/safe-redirect';
import { isEnvEnabled } from '@/lib/env';
import { buildOAuthCallbackUrl, buildWechatCallbackUrl } from '@/lib/oauth';

const phoneFormSchema = z.object({
	phone: z.string().min(2).max(50),
	code: z.string().min(6).max(50),
});

const PhoneLoginForm = () => {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const redirect_page = getSafeRedirectPage(searchParams.get('redirect_to'));
	const redirectState = encodeRedirectState(searchParams.get('redirect_to'));
	const router = useRouter();
	const { setLoginWay } = useLoginProvider();
	const { refreshMainUserInfo } = useUserContext();
	const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
		resolver: zodResolver(phoneFormSchema),
		defaultValues: {
			phone: '',
			code: '',
		},
	});

	const [sendingCode, setSendingCode] = useState(false);
	const [submitLoading, setSubmitLoading] = useState(false);
	const [targetDate, setTargetDate] = useState<number>();
	const [countdown] = useCountDown({
		targetDate,
	});

	const onSubmitPhoneForm = async (event: React.FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return phoneForm.handleSubmit(
			onPhoneSubmitSuccess,
			onPhoneSubmitError
		)(event);
	};

	const onPhoneSubmitSuccess = async (
		values: z.infer<typeof phoneFormSchema>
	) => {
		setSubmitLoading(true);
		const [res, err] = await utils.to(
			createSMSUserVerify({
				phone: values.phone,
				code: values.code,
			})
		);
		if (err || !res) {
			toast.error(err.message);
			setSubmitLoading(false);
		} else {
			setAuthCookies(res);
			toast.success(t('seo_login_success'));
			setSubmitLoading(false);
			refreshMainUserInfo();
			router.replace(redirect_page);
		}
	};

	const onPhoneSubmitError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const onSendCode = async () => {
		setSendingCode(true);
		phoneForm.trigger('phone');
		if (phoneForm.formState.errors.phone) {
			toast.error(phoneForm.formState.errors.phone.message);
			setSendingCode(false);
			return;
		}
		const [res, err] = await utils.to(
			createUserSMSCode({ phone: phoneForm.getValues('phone') })
		);
		if (err || !res) {
			toast.error(err.message);
			setSendingCode(false);
			return;
		}
		setSendingCode(false);
		setTargetDate(Date.now() + 60000);
		toast.success(t('seo_login_form_send_code_successfully'));
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
		<Form {...phoneForm}>
			<form onSubmit={onSubmitPhoneForm} className='w-full space-y-2'>
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
						control={phoneForm.control}
						name='phone'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_login_form_phone')}</FormLabel>
								<FormControl>
									<Input
										className='h-11 rounded-xl border-border/70 bg-background/80 shadow-none'
										placeholder={t('seo_login_form_phone_placeholder')}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={phoneForm.control}
						name='code'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_login_form_code')}</FormLabel>
								<div className='flex flex-col space-y-2'>
									<div className='flex w-full flex-row items-center space-x-2'>
										<FormControl className='flex-1'>
											<Input
												className='h-11 rounded-xl border-border/70 bg-background/80 shadow-none'
												placeholder={t('seo_login_form_code_placeholder')}
												{...field}
											/>
										</FormControl>
										<Button
											type='button'
											onClick={onSendCode}
											className='h-11 rounded-xl'
											disabled={sendingCode || !!countdown}>
											{sendingCode && (
												<Loader2 className='size-4 animate-spin' />
											)}
											{!sendingCode &&
												!countdown &&
												t('seo_login_form_send_code')}
											{!!countdown && `${Math.round(countdown / 1000)}s`}
										</Button>
									</div>
									<FormMessage />
								</div>
							</FormItem>
						)}
					/>
				</CardContent>
				<CardFooter className='flex flex-col gap-3 px-0 pb-0 pt-0'>
					<Button
						disabled={submitLoading}
						type='submit'
						className='h-11 w-full rounded-xl'>
						{submitLoading && <Loader2 className='size-4 animate-spin' />}
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
									disabled={submitLoading}
									type='button'
									variant='outline'
									className='h-11 w-full rounded-xl shadow-none'
									onClick={() => {
										setLoginWay('email');
									}}>
									<Mail />
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

export default PhoneLoginForm;
