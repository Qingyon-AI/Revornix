'use client';

import { toast } from 'sonner';
import { Button } from '../ui/button';
import { unBindGoogle } from '@/service/user';
import { useState } from 'react';
import { GOOGLE_CLIENT_ID } from '@/config/google';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import AccountUnbindConfirmButton from './account-unbind-confirm-button';
import { buildOAuthCallbackUrl } from '@/lib/oauth';
import { beginOAuthState } from '@/lib/oauth-state';
import { isLastLoginMethod } from '@/lib/user-auth-methods';

const GoogleBind = () => {
	const t = useTranslations();
	const [unBindStatus, setUnBindStatus] = useState(false);
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const cannotUnbind = isLastLoginMethod(mainUserInfo);
	const handleBindGoogle = () => {
		// `state` carries a CSRF nonce; the bind callback verifies it before
		// trusting the OAuth code. Without this, an attacker's code could be
		// planted into the victim's browser and silently bound to the
		// victim's Revornix account.
		const state = beginOAuthState('/account');
		const link = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${buildOAuthCallbackUrl('google', 'bind')}&scope=openid email profile&response_type=code&state=${state}`;
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
					<AccountUnbindConfirmButton
						description={cannotUnbind ? t('account_unbind_last_method_description') : t('account_unbind_confirm_description')}
						className='text-xs'
						disabled={unBindStatus || cannotUnbind}
						onConfirm={handleUnBindGoogle}
					/>
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
