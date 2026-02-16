'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { unBindWeChat } from '@/service/user';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getOrigin } from '@/lib/utils';

const WeChatBind = () => {
	const t = useTranslations();
	const [unBindStatus, setUnBindStatus] = useState(false);
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();

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

	const redirectUri = `${getOrigin()}/integrations/wechat/oauth/bind/callback`;

	return (
		<div>
			{mainUserInfo &&
				mainUserInfo.wechat_infos &&
				mainUserInfo.wechat_infos.length > 0 && (
					<div className='flex flex-row items-center'>
						<div className='font-bold text-xs'>
							{t('account_wechat')}:{' '}
							{mainUserInfo.wechat_infos.map((item) => item.nickname).join(',')}
						</div>
						<Button
							variant={'link'}
							className='text-xs'
							disabled={unBindStatus}
							onClick={handleUnBindWeChat}>
							{t('account_unbind')}
							{unBindStatus && <Loader2 className='size-4 animate-spin' />}
						</Button>
					</div>
				)}

			{mainUserInfo && !mainUserInfo.wechat_infos?.length && (
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
