'use client';

import { useEffect, useState } from 'react';
import {
	KeyRound,
	Loader2,
	Plus,
	ShieldCheck,
	ShieldOff,
	Smartphone,
	Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import QRCode from 'qrcode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { setAuthCookies } from '@/lib/auth-cookies';
import { createPasskeyCredential } from '@/lib/webauthn';
import {
	createPasskeyRegistrationOptions,
	createTotpRegistrationOptions,
	deletePasskey,
	deleteTotp,
	getTotpStatus,
	listPasskeys,
	type PasskeyInfo,
	type TotpInfo,
	updateMfaStatus,
	verifyPasskeyRegistration,
	verifyTotpRegistration,
} from '@/service/user';
import { useUserContext } from '@/provider/user-provider';

const PasskeyManage = () => {
	const t = useTranslations();
	const { mainUserInfo, refreshMainUserInfo, tempUpdateUserInfo } = useUserContext();
	const queryClient = useQueryClient();
	const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
	const [totp, setTotp] = useState<TotpInfo>({ enabled: false });
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);
	const [registering, setRegistering] = useState(false);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [totpSetup, setTotpSetup] = useState<{
		challenge_id: string;
		secret: string;
		otpauth_uri: string;
	} | null>(null);
	const [totpCode, setTotpCode] = useState('');
	const [totpQrCode, setTotpQrCode] = useState('');
	const [totpRegistering, setTotpRegistering] = useState(false);
	const [totpVerifying, setTotpVerifying] = useState(false);
	const [totpDeleting, setTotpDeleting] = useState(false);
	const passkeyEnabled = passkeys.length > 0;
	const hasMfaMethod = passkeyEnabled || totp.enabled;
	const enabled = Boolean(mainUserInfo?.mfa_enabled);
	const cannotRemoveLastMfaMethod = enabled && passkeys.length + (totp.enabled ? 1 : 0) <= 1;
	const currentHost =
		typeof window === 'undefined' ? undefined : window.location.hostname;

	const syncMfaEnabled = (nextEnabled: boolean) => {
		const cachedUserInfo = queryClient.getQueryData<typeof mainUserInfo>(['myInfo']);
		const baseUserInfo = cachedUserInfo ?? mainUserInfo;
		if (!baseUserInfo) return;
		const nextUserInfo = {
			...baseUserInfo,
			mfa_enabled: nextEnabled,
		};
		queryClient.setQueryData(['myInfo'], nextUserInfo);
		tempUpdateUserInfo(nextUserInfo);
	};

	const resetTotpSetup = () => {
		setTotpSetup(null);
		setTotpQrCode('');
		setTotpCode('');
		setTotpVerifying(false);
	};

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			resetTotpSetup();
		}
	};

	const refreshMfaMethods = async () => {
		setLoading(true);
		const [res, err] = await utils.to(
			Promise.all([listPasskeys(), getTotpStatus()]),
		);
		if (err || !res) {
			toast.error(err?.message ?? t('account_mfa_load_failed'));
			setLoading(false);
			return;
		}
		setPasskeys(res[0]);
		setTotp(res[1]);
		setLoading(false);
	};

	useEffect(() => {
		refreshMfaMethods();
	}, []);

	const handleRegister = async () => {
		setRegistering(true);
		const [optionsRes, optionsErr] = await utils.to(
			createPasskeyRegistrationOptions(),
		);
		if (optionsErr || !optionsRes) {
			toast.error(optionsErr?.message ?? t('account_mfa_register_challenge_failed'));
			setRegistering(false);
			return;
		}

		const [credential, credentialErr] = await utils.to(
			createPasskeyCredential(optionsRes.options),
		);
		if (credentialErr || !credential) {
			toast.error(credentialErr?.message ?? t('account_mfa_register_cancelled'));
			setRegistering(false);
			return;
		}

		const [tokenRes, verifyErr] = await utils.to(
			verifyPasskeyRegistration({
				challenge_id: optionsRes.challenge_id,
				credential,
				name: t('account_mfa_passkey_default_name'),
			}),
		);
		if (verifyErr || !tokenRes) {
			toast.error(verifyErr?.message ?? t('account_mfa_register_failed'));
			setRegistering(false);
			return;
		}

		setAuthCookies(tokenRes);
		await refreshMainUserInfo();
		await refreshMfaMethods();
		setRegistering(false);
		toast.success(t('account_mfa_register_success'));
	};

	const handleDelete = async (credentialId: number) => {
		if (cannotRemoveLastMfaMethod && passkeys.length <= 1) {
			toast.error(t('account_mfa_remove_last_method_blocked'));
			return;
		}
		setDeletingId(credentialId);
		const [tokenRes, err] = await utils.to(
			deletePasskey({ credential_id: credentialId }),
		);
		if (err || !tokenRes) {
			toast.error(err?.message ?? t('account_mfa_delete_failed'));
			setDeletingId(null);
			return;
		}
		setAuthCookies(tokenRes);
		await refreshMainUserInfo();
		await refreshMfaMethods();
		setDeletingId(null);
		toast.success(t('account_mfa_delete_success'));
	};

	const handleStartTotpSetup = async () => {
		setTotpRegistering(true);
		const [res, err] = await utils.to(createTotpRegistrationOptions());
		if (err || !res) {
			toast.error(err?.message ?? t('account_mfa_totp_setup_failed'));
			setTotpRegistering(false);
			return;
		}
		const [qrCodeDataUrl, qrCodeErr] = await utils.to(
			QRCode.toDataURL(res.otpauth_uri, {
				width: 184,
				margin: 1,
			}),
		);
		if (qrCodeErr || !qrCodeDataUrl) {
			toast.error(t('account_mfa_totp_qr_failed'));
			setTotpRegistering(false);
			return;
		}
		setTotpSetup(res);
		setTotpQrCode(qrCodeDataUrl);
		setTotpCode('');
		setTotpRegistering(false);
	};

	const handleVerifyTotpSetup = async () => {
		if (!totpSetup) return;
		setTotpVerifying(true);
		const [tokenRes, err] = await utils.to(
			verifyTotpRegistration({
				challenge_id: totpSetup.challenge_id,
				code: totpCode,
				name: t('account_mfa_totp_title'),
			}),
		);
		if (err || !tokenRes) {
			toast.error(err?.message ?? t('account_mfa_totp_verify_failed'));
			setTotpVerifying(false);
			return;
		}
		setAuthCookies(tokenRes);
		await refreshMainUserInfo();
		await refreshMfaMethods();
		resetTotpSetup();
		toast.success(t('account_mfa_totp_enabled_success'));
	};

	const handleDeleteTotp = async () => {
		if (cannotRemoveLastMfaMethod) {
			toast.error(t('account_mfa_remove_last_method_blocked'));
			return;
		}
		setTotpDeleting(true);
		const [tokenRes, err] = await utils.to(deleteTotp());
		if (err || !tokenRes) {
			toast.error(err?.message ?? t('account_mfa_totp_delete_failed'));
			setTotpDeleting(false);
			return;
		}
		setAuthCookies(tokenRes);
		await refreshMainUserInfo();
		await refreshMfaMethods();
		setTotpDeleting(false);
		toast.success(t('account_mfa_totp_delete_success'));
	};

	const updateMfaStatusMutation = useMutation({
		mutationFn: updateMfaStatus,
		onMutate: async ({ enabled: nextEnabled }) => {
			await queryClient.cancelQueries({ queryKey: ['myInfo'] });
			const previousMainUserInfo = queryClient.getQueryData<typeof mainUserInfo>(['myInfo']);
			syncMfaEnabled(nextEnabled);
			return { previousMainUserInfo };
		},
		onSuccess: (tokenRes, { enabled: nextEnabled }) => {
			setAuthCookies(tokenRes);
			syncMfaEnabled(nextEnabled);
			toast.success(nextEnabled ? t('account_mfa_enabled_success') : t('account_mfa_disabled_success'));
		},
		onError: (err: any, _variables, context) => {
			if (context?.previousMainUserInfo) {
				queryClient.setQueryData(['myInfo'], context.previousMainUserInfo);
				tempUpdateUserInfo(context.previousMainUserInfo);
			}
			toast.error(err?.message ?? t('account_mfa_update_failed'));
		},
		onSettled: (_data, error) => {
			if (!error) {
				void queryClient.invalidateQueries({ queryKey: ['myInfo'] });
			}
		},
	});

	const handleMfaStatusChange = (checked: boolean) => {
		if (checked && !hasMfaMethod) {
			toast.error(t('account_mfa_enable_requires_method'));
			return;
		}
		updateMfaStatusMutation.mutate({ enabled: checked });
	};

	if (loading) {
		return (
			<div className='flex items-center gap-2 text-xs text-muted-foreground'>
				<Loader2 className='size-4 animate-spin' />
				{t('account_password_initial_password_loading')}
			</div>
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<div className='flex items-center justify-end gap-2'>
				<Badge
					variant='outline'
					className='h-9 gap-1 rounded-lg px-3'>
					{enabled ? (
						<ShieldCheck className='size-3.5 text-emerald-600' />
					) : (
						<ShieldOff className='size-3.5 text-muted-foreground' />
					)}
					{enabled ? t('account_mfa_enabled') : t('account_mfa_disabled')}
				</Badge>
				<DialogTrigger asChild>
					<Button
						type='button'
						variant={enabled ? 'outline' : 'default'}
						className='h-9 gap-1 rounded-lg'>
						{enabled ? t('account_mfa_manage') : t('account_mfa_enable')}
					</Button>
				</DialogTrigger>
			</div>
			<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-2xl'>
				<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
					<DialogTitle>{t('account_mfa_dialog_title')}</DialogTitle>
					<DialogDescription>
						{t('account_mfa_dialog_description')}
					</DialogDescription>
				</DialogHeader>
				<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
					<div className='space-y-4'>
						<div className='flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between'>
							<div className='space-y-1'>
								<div className='flex items-center gap-2 text-sm font-medium'>
									{enabled ? (
										<ShieldCheck className='size-4 text-emerald-600' />
									) : (
										<ShieldOff className='size-4 text-muted-foreground' />
									)}
									{t('account_mfa_status_title')}
								</div>
								<p className='text-xs leading-5 text-muted-foreground'>
									{t('account_mfa_status_description')}
								</p>
							</div>
							<div className='flex items-center gap-3'>
								{updateMfaStatusMutation.isPending && <Loader2 className='size-4 animate-spin text-muted-foreground' />}
								<Switch
									checked={enabled}
									disabled={updateMfaStatusMutation.isPending || (!enabled && !hasMfaMethod)}
									onCheckedChange={handleMfaStatusChange}
									aria-label={t('account_mfa_status_title')}
								/>
							</div>
						</div>

						<div className='space-y-3 rounded-lg border border-border p-4'>
							<div className='flex items-start justify-between gap-4'>
								<div className='space-y-1'>
									<div className='flex items-center gap-2 text-sm font-medium'>
										<KeyRound className='size-4 text-muted-foreground' />
										{t('account_mfa_passkey_title')}
									</div>
									<p className='text-xs leading-5 text-muted-foreground'>
										{t('account_mfa_passkey_description')}
									</p>
									<p className='text-xs leading-5 text-muted-foreground'>
										{t('account_mfa_passkey_domain_hint', {
											domain: currentHost ?? '-',
										})}
									</p>
								</div>
								<Badge
									variant='outline'
									className='shrink-0 rounded-lg'>
									{passkeyEnabled
										? t('account_mfa_configured')
										: t('account_mfa_not_configured')}
								</Badge>
							</div>

							<div className='space-y-2'>
								{passkeys.length === 0 && (
									<div className='rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground'>
										{t('account_mfa_no_passkeys')}
									</div>
								)}
								{passkeys.map((passkey) => (
									<div
										key={passkey.id}
										className='flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2'>
										<div className='flex min-w-0 items-center gap-2'>
											<KeyRound className='size-4 shrink-0 text-muted-foreground' />
											<div className='min-w-0'>
												<div className='truncate text-sm font-medium'>
													{passkey.name || t('account_mfa_passkey_default_name')}
												</div>
												<div className='text-xs text-muted-foreground'>
													{passkey.rp_id
														? t('account_mfa_passkey_domain', { domain: passkey.rp_id })
														: passkey.backed_up
															? t('account_mfa_configured')
															: t('account_mfa_passkey_title')}
												</div>
											</div>
										</div>
										<Button
											type='button'
											variant='ghost'
											size='icon'
											className='size-8 shrink-0 rounded-md'
											disabled={deletingId === passkey.id || (cannotRemoveLastMfaMethod && passkeys.length <= 1)}
											onClick={() => handleDelete(passkey.id)}
											aria-label={t('account_mfa_remove_passkey')}>
											{deletingId === passkey.id ? (
												<Loader2 className='size-4 animate-spin' />
											) : (
												<Trash2 className='size-4' />
											)}
										</Button>
									</div>
								))}
							</div>

							<Button
								type='button'
								className='h-10 w-full gap-1 rounded-lg'
								disabled={registering}
								onClick={handleRegister}>
								{registering ? (
									<Loader2 className='size-4 animate-spin' />
								) : (
									<Plus className='size-4' />
								)}
								{t('account_mfa_add_passkey')}
							</Button>
						</div>

						<div className='rounded-lg border border-border p-4'>
							<div className='flex items-start justify-between gap-4'>
								<div className='space-y-1'>
									<div className='flex items-center gap-2 text-sm font-medium'>
										<Smartphone className='size-4 text-muted-foreground' />
										{t('account_mfa_totp_title')}
									</div>
									<p className='text-xs leading-5 text-muted-foreground'>
										{t('account_mfa_totp_description')}
									</p>
								</div>
								<Badge
									variant='outline'
									className='shrink-0 rounded-lg'>
									{totp.enabled
										? t('account_mfa_configured')
										: t('account_mfa_not_configured')}
								</Badge>
							</div>

								{totpSetup ? (
									<div className='mt-4 space-y-4 rounded-lg border border-dashed border-border bg-muted/20 p-4'>
										<div className='flex items-center justify-between gap-3'>
											<div className='text-sm font-medium'>
												{t('account_mfa_totp_setup_title')}
											</div>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												className='h-8 rounded-md px-2'
												disabled={totpVerifying}
												onClick={resetTotpSetup}>
												{t('cancel')}
											</Button>
										</div>
										<div className='grid gap-4 sm:grid-cols-[180px_1fr]'>
										<div className='space-y-2'>
											<div className='text-xs font-medium'>
												{t('account_mfa_totp_qr_label')}
											</div>
											<div className='flex size-[180px] items-center justify-center rounded-lg border border-border bg-white p-3 shadow-sm'>
												<img
													src={totpQrCode}
													alt={t('account_mfa_totp_qr_alt')}
													className='size-full'
												/>
											</div>
										</div>
										<div className='space-y-2 rounded-lg bg-background/70 p-3'>
											<div className='text-xs font-medium'>
												{t('account_mfa_totp_secret_label')}
											</div>
											<div className='break-all rounded-md border border-border/60 bg-muted px-3 py-2 font-mono text-xs'>
												{totpSetup.secret}
											</div>
											<p className='text-xs leading-5 text-muted-foreground'>
												{t('account_mfa_totp_secret_hint')}
											</p>
										</div>
									</div>
									<div className='flex flex-col gap-2 sm:flex-row'>
										<Input
											className='h-11 rounded-lg bg-background'
											inputMode='numeric'
											autoComplete='one-time-code'
											maxLength={6}
											placeholder={t('account_mfa_totp_code_placeholder')}
											value={totpCode}
											onChange={(event) => setTotpCode(event.target.value)}
											disabled={totpVerifying}
										/>
										<Button
											type='button'
											className='h-11 shrink-0 rounded-lg px-6'
											disabled={totpVerifying || totpCode.trim().length !== 6}
											onClick={handleVerifyTotpSetup}>
											{totpVerifying && (
												<Loader2 className='mr-1 size-4 animate-spin' />
											)}
											{t('account_mfa_totp_verify')}
										</Button>
									</div>
								</div>
							) : null}

							<div className='mt-4'>
								{totp.enabled ? (
									<Button
										type='button'
										variant='outline'
										className='h-10 w-full rounded-lg'
										disabled={totpDeleting || cannotRemoveLastMfaMethod}
										onClick={handleDeleteTotp}>
										{totpDeleting && (
											<Loader2 className='mr-1 size-4 animate-spin' />
										)}
										{t('account_mfa_totp_remove')}
									</Button>
								) : !totpSetup ? (
									<Button
										type='button'
										variant='outline'
										className='h-10 w-full rounded-lg'
										disabled={totpRegistering || Boolean(totpSetup)}
										onClick={handleStartTotpSetup}>
										{totpRegistering && (
											<Loader2 className='mr-1 size-4 animate-spin' />
										)}
										{t('account_mfa_totp_enable')}
									</Button>
								) : null}
							</div>
						</div>

					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default PasskeyManage;
