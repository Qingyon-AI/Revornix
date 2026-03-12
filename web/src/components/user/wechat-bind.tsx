'use client';

import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/hybrid-tooltip';
import Link from 'next/link';
import { unBindWeChat } from '@/service/user';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { WeChatInfo } from '@/generated';
import AccountUnbindConfirmButton from './account-unbind-confirm-button';

const getWechatPlatformLabel = (
	t: ReturnType<typeof useTranslations>,
	platform: number
) => {
	switch (platform) {
		case 1:
			return t('account_wechat_platform_web');
		case 2:
			return t('account_wechat_platform_mini_program');
		case 3:
			return t('account_wechat_platform_official_account');
		default:
			return t('account_wechat_platform_unknown');
	}
};

const WeChatBind = () => {
	const t = useTranslations();
	const [unBindStatus, setUnBindStatus] = useState(false);
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const wechatInfos = mainUserInfo?.wechat_infos ?? [];

	const wechatAuthUrl = useMemo(() => {
		const origin = window.location.origin; // 这里一定有值（client）
		const redirectUri = `${origin}/integrations/wechat/oauth/bind/callback`;

		return `https://open.weixin.qq.com/connect/qrconnect?appid=${
			process.env.NEXT_PUBLIC_WECHAT_APP_ID
		}&redirect_uri=${encodeURIComponent(
			redirectUri,
		)}&response_type=code&scope=snsapi_login&state=${crypto.randomUUID()}#wechat_redirect`;
	}, []);

	const handleUnBindWeChat = async () => {
		setUnBindStatus(true);
		const [res, err] = await utils.to(unBindWeChat());
		if (err || !res) {
			toast.error(err.message);
			setUnBindStatus(false);
			return;
		}
		toast.success(t('account_unbind_successfully'));
		setUnBindStatus(false);
		refreshMainUserInfo();
	};

	const wechatBindings = useMemo(
		() =>
			wechatInfos.map((item: WeChatInfo) => ({
				...item,
				platformLabel: getWechatPlatformLabel(t, item.platform),
				displayName: item.nickname?.trim() || getWechatPlatformLabel(t, item.platform),
			})),
		[t, wechatInfos]
	);

	return (
		<div>
			{wechatBindings.length > 0 && (
				<div className='flex flex-col items-end gap-2'>
					<div className='flex flex-col items-end gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end'>
						{wechatBindings.map((item) => (
							<div
								key={`${item.platform}-${item.wechat_open_id}`}
								className='flex w-fit max-w-full shrink-0 flex-col items-end gap-1 rounded-xl border border-border/60 bg-muted/35 px-3 py-2 text-right'>
								<div className='flex items-center gap-2'>
									<Badge variant='outline' className='rounded-full'>
										{item.platformLabel}
									</Badge>
									<span className='text-xs font-bold'>{item.displayName}</span>
								</div>
							</div>
						))}
						<div className='flex w-fit shrink-0 items-center'>
							<AccountUnbindConfirmButton
								description={t('account_wechat_unbind_confirm_description')}
								className='h-auto px-0 text-xs'
								disabled={unBindStatus}
								onConfirm={handleUnBindWeChat}
							/>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type='button'
											variant='ghost'
											size='icon-sm'
											className='size-6 rounded-full text-muted-foreground'
											aria-label={t('account_wechat_unbind_all_hint')}>
											<Info className='size-3.5' />
										</Button>
									</TooltipTrigger>
									<TooltipContent side='right'>
										{t('account_wechat_unbind_all_hint')}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				</div>
			)}

			{mainUserInfo && wechatBindings.length === 0 && (
				<Link href={wechatAuthUrl}>
					<Button type='button' variant={'outline'}>
						{t('account_go_bind')}
					</Button>
				</Link>
			)}
		</div>
	);
};

export default WeChatBind;
