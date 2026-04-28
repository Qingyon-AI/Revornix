'use client';

import { createUserByGithub } from '@/service/user';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { setAuthCookies } from '@/lib/auth-cookies';
import { utils } from '@kinda/utils';
import { useUserContext } from '@/provider/user-provider';
import { decodeRedirectState } from '@/lib/safe-redirect';
import { buildPublicAppUrl } from '@/lib/oauth';

const GitHubCreatePage = () => {
	const { refreshMainUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const consumed = useRef(false);

	const code = searchParams.get('code');
	const redirectTo = decodeRedirectState(searchParams.get('state'));

	const onCreateGitHubUser = async (code: string) => {
		const [res, err] = await utils.to(createUserByGithub({ code }));
		if (err || !res) {
			toast.error(err?.message ?? 'GitHub login failed');
			await utils.sleep(1000);
			window.location.replace(
				buildPublicAppUrl(`/login?redirect_to=${encodeURIComponent(redirectTo)}`)
			);
			return;
		}
		setAuthCookies(res);
		refreshMainUserInfo();
		window.location.replace(buildPublicAppUrl(redirectTo));
	};

	useEffect(() => {
		if (!code) {
			window.location.replace(buildPublicAppUrl('/login'));
			return;
		}
		if (consumed.current) return;
		consumed.current = true;
		onCreateGitHubUser(code);
	}, [code]);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default GitHubCreatePage;
