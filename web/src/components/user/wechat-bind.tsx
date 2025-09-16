'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { unBindWeChat } from '@/service/user';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

const WeChatBind = () => {
	const t = useTranslations();
	const [unBindStatus, setUnBindStatus] = useState(false);
	const { userInfo, refreshUserInfo } = useUserContext();
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
		refreshUserInfo();
	};
	return (
		<div>
			{userInfo && userInfo.wechat_info && (
				<div className='flex flex-row items-center'>
					<div className='font-bold text-xs'>
						{t('account_wechat')}: {userInfo.wechat_info.nickname}
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

			{userInfo && !userInfo.wechat_info && (
				<Link
					href={`https://open.weixin.qq.com/connect/qrconnect?appid=${
						process.env.NEXT_PUBLIC_WECHAT_WEBSITE_APP_ID
					}&redirect_uri=${encodeURIComponent(
						`https://app.revornix.com/integrations/wechat/oauth/bind/callback`
					)}&response_type=code&scope=snsapi_login&state=ndkasnl#wechat_redirect`}>
					<Button type='button' variant={'outline'}>
						{t('account_go_bind')}
					</Button>
				</Link>
			)}
		</div>
	);
};

export default WeChatBind;
