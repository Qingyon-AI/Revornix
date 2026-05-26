'use client';

import { useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { setAuthCookies } from '@/lib/auth-cookies';
import { getSafeRedirectPage } from '@/lib/safe-redirect';
import { getPasskeyCredential } from '@/lib/webauthn';
import {
	createPasskeyAuthenticationOptions,
	verifyTotpAuthentication,
	verifyPasskeyAuthentication,
} from '@/service/user';
import { useUserContext } from '@/provider/user-provider';

const PasskeyMfaLogin = ({
	challengeId,
	redirectTo,
	methods,
}: {
	challengeId: string;
	redirectTo: string;
	methods: string[];
}) => {
	const t = useTranslations();
	const router = useRouter();
	const { refreshMainUserInfo } = useUserContext();
	const [passkeyLoading, setPasskeyLoading] = useState(false);
	const [totpLoading, setTotpLoading] = useState(false);
	const [totpCode, setTotpCode] = useState('');
	const availableMethods = methods.length ? methods : ['passkey'];
	const canUsePasskey = availableMethods.includes('passkey');
	const canUseTotp = availableMethods.includes('totp');
	const loading = passkeyLoading || totpLoading;

	const handleVerify = async () => {
		setPasskeyLoading(true);
		const [optionsRes, optionsErr] = await utils.to(
			createPasskeyAuthenticationOptions({ challenge_id: challengeId }),
		);
		if (optionsErr || !optionsRes) {
			toast.error(optionsErr?.message ?? t('seo_login_mfa_challenge_expired'));
			setPasskeyLoading(false);
			router.replace('/login');
			return;
		}

		const [credential, credentialErr] = await utils.to(
			getPasskeyCredential(optionsRes.options),
		);
		if (credentialErr || !credential) {
			toast.error(credentialErr?.message ?? t('seo_login_mfa_passkey_cancelled'));
			setPasskeyLoading(false);
			return;
		}

		const [tokenRes, tokenErr] = await utils.to(
			verifyPasskeyAuthentication({
				challenge_id: optionsRes.challenge_id,
				credential,
			}),
		);
		if (tokenErr || !tokenRes) {
			toast.error(tokenErr?.message ?? t('seo_login_mfa_passkey_failed'));
			setPasskeyLoading(false);
			return;
		}

		setAuthCookies(tokenRes);
		await refreshMainUserInfo();
		router.replace(getSafeRedirectPage(redirectTo));
	};

	const handleVerifyTotp = async () => {
		setTotpLoading(true);
		const [tokenRes, tokenErr] = await utils.to(
			verifyTotpAuthentication({
				challenge_id: challengeId,
				code: totpCode,
			}),
		);
		if (tokenErr || !tokenRes) {
			toast.error(tokenErr?.message ?? t('seo_login_mfa_totp_failed'));
			setTotpLoading(false);
			return;
		}

		setAuthCookies(tokenRes);
		await refreshMainUserInfo();
		router.replace(getSafeRedirectPage(redirectTo));
	};

	return (
		<>
			<CardHeader className='mb-5 px-0 pb-0 pt-0'>
				<div className='mb-1 flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background/80'>
					<ShieldCheck className='size-5' />
				</div>
				<CardTitle className='text-[1.95rem] tracking-tight'>
					{t('seo_login_mfa_title')}
				</CardTitle>
				<CardDescription className='text-sm leading-6'>
					{t('seo_login_mfa_description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-3 px-0'>
				{canUsePasskey ? (
					<div className='rounded-xl border border-border/70 bg-background/70 p-3'>
						<div className='mb-3 flex items-start gap-3'>
							<div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70'>
								<KeyRound className='size-4' />
							</div>
							<div>
								<div className='text-sm font-medium'>
									{t('seo_login_mfa_passkey_title')}
								</div>
								<div className='mt-1 text-xs leading-5 text-muted-foreground'>
									{t('seo_login_mfa_passkey_description')}
								</div>
							</div>
						</div>
						<Button
							type='button'
							className='h-11 w-full rounded-xl'
							disabled={loading}
							onClick={handleVerify}>
							{passkeyLoading && <Loader2 className='mr-1 size-4 animate-spin' />}
							{t('seo_login_mfa_continue_passkey')}
						</Button>
					</div>
				) : null}
				{canUseTotp ? (
					<div className='rounded-xl border border-border/70 bg-background/70 p-3'>
						<div className='mb-3 flex items-start gap-3'>
							<div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70'>
								<ShieldCheck className='size-4' />
							</div>
							<div>
								<div className='text-sm font-medium'>
									{t('seo_login_mfa_totp_title')}
								</div>
								<div className='mt-1 text-xs leading-5 text-muted-foreground'>
									{t('seo_login_mfa_totp_description')}
								</div>
							</div>
						</div>
						<div className='flex gap-2'>
							<Input
								className='h-11 rounded-xl'
								inputMode='numeric'
								autoComplete='one-time-code'
								maxLength={6}
								placeholder={t('seo_login_mfa_totp_placeholder')}
								value={totpCode}
								onChange={(event) => setTotpCode(event.target.value)}
								disabled={loading}
							/>
							<Button
								type='button'
								className='h-11 shrink-0 rounded-xl'
								disabled={loading || totpCode.trim().length !== 6}
								onClick={handleVerifyTotp}>
								{totpLoading && <Loader2 className='mr-1 size-4 animate-spin' />}
								{t('seo_login_mfa_verify_totp')}
							</Button>
						</div>
					</div>
				) : null}
				{!canUsePasskey && !canUseTotp ? (
					<div className='rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground'>
						{t('seo_login_mfa_no_supported_methods')}
					</div>
				) : null}
			</CardContent>
			<CardFooter className='px-0 pt-2'>
				<Button
					type='button'
					variant='ghost'
					className='h-10 w-full rounded-xl text-muted-foreground'
					onClick={() => router.replace('/login')}
					disabled={loading}>
					{t('seo_login_mfa_use_other_method')}
				</Button>
			</CardFooter>
		</>
	);
};

export default PasskeyMfaLogin;
