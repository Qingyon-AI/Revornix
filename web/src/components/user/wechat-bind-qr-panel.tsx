'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import { Button } from '@/components/ui/button';
import {
	createWechatOfficialBindQrcode,
	queryWechatOfficialBindStatus,
} from '@/service/user';

type WechatBindQrPanelProps = {
	onBound: () => void;
};

const POLL_INTERVAL_MS = 2000;
const QR_SIZE = 224;

const WechatBindQrPanel = ({ onBound }: WechatBindQrPanelProps) => {
	const t = useTranslations();

	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [expired, setExpired] = useState(false);
	const [loadFailed, setLoadFailed] = useState(false);
	const [bound, setBound] = useState(false);

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

	const pollOnce = async (scene: string) => {
		if (cancelledRef.current) return;
		const [res, err] = await utils.to(queryWechatOfficialBindStatus(scene));
		if (cancelledRef.current) return;
		if (err || !res) {
			pollTimerRef.current = setTimeout(() => pollOnce(scene), POLL_INTERVAL_MS);
			return;
		}
		if (res.status === 'confirmed') {
			clearTimers();
			setBound(true);
			toast.success(t('account_wechat_bind_success'));
			// Give user a beat to see the success state before we close the dialog.
			setTimeout(() => onBound(), 600);
			return;
		}
		if (res.status === 'conflict') {
			clearTimers();
			setExpired(true);
			toast.error(res.message ?? t('account_wechat_bind_conflict'));
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
		setBound(false);

		const [res, err] = await utils.to(createWechatOfficialBindQrcode());
		if (cancelledRef.current) return;
		if (err || !res) {
			setLoadFailed(true);
			setLoading(false);
			toast.error(err?.message ?? t('account_wechat_bind_load_failed'));
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
		<div className='flex flex-col items-center gap-3 py-2'>
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
							{t('account_wechat_bind_load_failed')}
						</span>
					</div>
				)}

				{showQr && (
					<>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={imageUrl!}
							alt='WeChat bind QR code'
							width={QR_SIZE}
							height={QR_SIZE}
							className={`h-full w-full rounded-xl object-contain transition ${
								expired || bound ? 'opacity-20 blur-[2px]' : ''
							}`}
							onError={() => setLoadFailed(true)}
						/>
						{expired && !bound && (
							<button
								type='button'
								onClick={startSession}
								className='absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/70 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-background/85'>
								<RefreshCw className='size-5' />
								<span>{t('seo_login_wechat_qr_expired')}</span>
							</button>
						)}
						{bound && (
							<div className='absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 text-sm font-medium text-foreground backdrop-blur-sm'>
								<CheckCircle2 className='size-6 text-green-600' />
								<span>{t('account_wechat_bind_success')}</span>
							</div>
						)}
					</>
				)}
			</div>

			<p className='text-center text-xs leading-5 text-muted-foreground'>
				{t('account_wechat_bind_scan_hint')}
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
	);
};

export default WechatBindQrPanel;
