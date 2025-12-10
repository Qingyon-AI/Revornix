'use client';

import { toast } from 'sonner';
import { Button } from '../ui/button';
import { unBindGoogle } from '@/service/user';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GOOGLE_CLIENT_ID } from '@/config/google';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

const GoogleBind = () => {
	const t = useTranslations();
	const [unBindStatus, setUnBindStatus] = useState(false);
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const handleBindGoogle = () => {
		// redirect the user to google
		const link = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${window.location.origin}/integrations/google/oauth2/bind/callback&scope=openid email profile&response_type=code`;
		window.location.assign(link);
	};
	const handleUnBindGoogle = async () => {
		setUnBindStatus(true);
		const [res, err] = await utils.to(unBindGoogle());
		if (err) {
			toast.error(err.message);
			setUnBindStatus(false);
			return;
		}
		toast.success(t('account_unbind_successfully'));
		setUnBindStatus(false);
		refreshMainUserInfo();
	};
	return (
		<div>
			{mainUserInfo && mainUserInfo.google_info && (
				<div className='flex flex-row items-center'>
					<div className='font-bold text-xs'>
						ID: {mainUserInfo.google_info.google_user_id}
					</div>
					<Button
						variant={'link'}
						className='text-xs'
						disabled={unBindStatus}
						onClick={handleUnBindGoogle}>
						{t('account_unbind')}
						{unBindStatus && <Loader2 className='size-4 animate-spin' />}
					</Button>
				</div>
			)}

			{mainUserInfo && !mainUserInfo.google_info && (
				<Button onClick={handleBindGoogle} variant={'outline'}>
					{t('account_go_bind')}
				</Button>
			)}
		</div>
	);
};

export default GoogleBind;
