'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import {
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WechatIcon from '../icons/wechat-icon';
import {
	createWechatOfficialQrcode,
	queryWechatOfficialQrStatus,
} from '@/service/user';
import { setAuthCookies } from '@/lib/auth-cookies';
import { useUserContext } from '@/provider/user-provider';
import { decodeRedirectState } from '@/lib/safe-redirect';

type WechatLoginQrPanelProps = {
	redirectState: string;
	onBack: () => void;
};

const POLL_INTERVAL_MS = 2000;
const QR_SIZE = 224;

const WechatLoginQrPanel = ({
	redirectState,
	onBack,
}: WechatLoginQrPanelProps) => {
	const t = useTranslations();
	const router = useRouter();
	const { refreshMainUserInfo } = useUserContext();

	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [expired, setExpired] = useState(false);
	const [loadFailed, setLoadFailed] = useState(false);

	const sceneRef = useRef<string | null>(null);
	const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancelledRef = useRef(false);

	const clearTimers = () => {
		if (pollTimerRef.current) {
			clearTimeout(pollTimerRef.current);
			pollTimerRef.current = null;
		}
		if (expireTimerRef.current) {
			clearTimeout(expireTimerRef.current);
			expireTimerRef.current = null;
		}
	};

	const onLoginSuccess = async (
		access_token: string,
		refresh_token: string,
	) => {
		setAuthCookies({ access_token, refresh_token });
		refreshMainUserInfo();
		const redirectTo = decodeRedirectState(redirectState);
		router.replace(redirectTo);
	};

	const pollOnce = async (scene: string) => {
		if (cancelledRef.current) return;
		const [res, err] = await utils.to(queryWechatOfficialQrStatus(scene));
		if (cancelledRef.current) return;
		if (err || !res) {
			pollTimerRef.current = setTimeout(
				() => pollOnce(scene),
				POLL_INTERVAL_MS,
			);
			return;
		}
		if (res.status === 'confirmed' && res.access_token && res.refresh_token) {
			clearTimers();
			await onLoginSuccess(res.access_token, res.refresh_token);
			return;
		}
		if (res.status === 'expired') {
			clearTimers();
			setExpired(true);
			return;
		}
		pollTimerRef.current = setTimeout(() => pollOnce(scene), POLL_INTERVAL_MS);
	};

	const startSession = async () => {
		clearTimers();
		cancelledRef.current = false;
		setLoading(true);
		setExpired(false);
		setLoadFailed(false);
		setImageUrl(null);

		const [res, err] = await utils.to(createWechatOfficialQrcode());
		if (cancelledRef.current) return;
		if (err || !res) {
			setLoadFailed(true);
			setLoading(false);
			toast.error(err?.message ?? t('seo_login_wechat_load_failed'));
			return;
		}
		sceneRef.current = res.scene_str;
		setImageUrl(res.image_url);
		setLoading(false);
		expireTimerRef.current = setTimeout(() => {
			setExpired(true);
			clearTimers();
		}, res.expires_in * 1000);
		pollOnce(res.scene_str);
	};

	useEffect(() => {
		startSession();
		return () => {
			cancelledRef.current = true;
			clearTimers();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const showQr = !loading && !loadFailed && !!imageUrl;

	return (
		<>
			<CardHeader className='mb-5 px-0 pb-0 pt-0'>
				<div className='mb-1 flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background/80'>
					<WechatIcon />
				</div>
				<CardTitle className='text-[1.95rem] tracking-tight'>
					{t('seo_login_wechat_scan_title')}
				</CardTitle>
				<CardDescription className='text-sm leading-6'>
					{t('seo_login_wechat_scan_description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='px-0'>
				<div className='flex flex-col items-center gap-3'>
					<div
						className={`relative flex items-center justify-center rounded-xl ${
							showQr ? 'bg-white' : 'bg-muted/40'
						}`}
						style={{ width: QR_SIZE, height: QR_SIZE }}>
						{loading && (
							<div className='flex flex-col items-center gap-2 text-muted-foreground'>
								<Loader2 className='size-5 animate-spin' />
								<span className='text-xs'>
									{t('seo_login_wechat_generating')}
								</span>
							</div>
						)}

						{!loading && loadFailed && (
							<div className='flex flex-col items-center gap-2 px-4 text-center text-muted-foreground'>
								<WifiOff className='size-6' />
								<span className='text-xs leading-5'>
									{t('seo_login_wechat_load_failed')}
								</span>
							</div>
						)}

						{showQr && (
							<>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={imageUrl!}
									alt='WeChat QR code'
									width={QR_SIZE}
									height={QR_SIZE}
									className={`h-full w-full rounded-xl object-contain transition ${
										expired ? 'opacity-20 blur-[2px]' : ''
									}`}
									onError={() => setLoadFailed(true)}
								/>
								{expired && (
									<button
										type='button'
										onClick={startSession}
										className='absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/70 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-background/85'>
										<RefreshCw className='size-5' />
										<span>{t('seo_login_wechat_qr_expired')}</span>
									</button>
								)}
							</>
						)}
					</div>

					<p className='text-center text-xs leading-5 text-muted-foreground'>
						{t('seo_login_wechat_scan_hint')}
					</p>

					{loadFailed && !loading && (
						<Button
							type='button'
							variant='ghost'
							size='sm'
							className='h-8 gap-1 rounded-lg text-xs'
							onClick={startSession}>
							<RefreshCw className='size-3.5' />
							{t('seo_login_wechat_refresh')}
						</Button>
					)}
				</div>
			</CardContent>
			<CardFooter className='pt-3'>
				<Button
					type='button'
					variant='ghost'
					className='h-11 w-full rounded-xl text-muted-foreground shadow-none hover:text-foreground'
					onClick={onBack}>
					<ArrowLeft className='mr-1 size-4' />
					{t('seo_login_wechat_back')}
				</Button>
			</CardFooter>
		</>
	);
};

export default WechatLoginQrPanel;
