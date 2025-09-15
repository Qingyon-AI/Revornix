'use client';

import { unBindGitHub } from '@/service/user';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GITHUB_CLIENT_ID } from '@/config/github';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

const GitHubBind = () => {
	const t = useTranslations();
	const [unBindStatus, setUnBindStatus] = useState(false);
	const { userInfo, refreshUserInfo } = useUserContext();
	const handleBindGitHub = () => {
		// redirect the user to github
		const link = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&response_type=code&redirect_uri=${window.location.origin}/integrations/github/oauth2/bind/callback`;
		window.location.assign(link);
	};
	const handleUnBindGitHub = async () => {
		setUnBindStatus(true);
		const [res, err] = await utils.to(unBindGitHub());
		if (err) {
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
			{userInfo && userInfo.github_info && (
				<div className='flex flex-row items-center'>
					<div className='font-bold text-xs'>
						ID: {userInfo.github_info.github_user_id}
					</div>
					<Button
						variant={'link'}
						className='text-xs'
						disabled={unBindStatus}
						onClick={handleUnBindGitHub}>
						{t('account_unbind')}
						{unBindStatus && <Loader2 className='size-4 animate-spin' />}
					</Button>
				</div>
			)}

			{userInfo && !userInfo.github_info && (
				<Button onClick={handleBindGitHub} variant={'outline'}>
					{t('account_go_bind')}
				</Button>
			)}
		</div>
	);
};

export default GitHubBind;
