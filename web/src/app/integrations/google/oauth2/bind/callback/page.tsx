'use client';

import { useUserContext } from '@/provider/user-provider';
import { bindGoogle } from '@/service/user';
import { utils } from '@kinda/utils';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { buildOAuthCallbackUrl, buildPublicAppUrl } from '@/lib/oauth';
import { consumeOAuthState } from '@/lib/oauth-state';

const GoogleBindPage = () => {
	const { refreshMainUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const consumed = useRef(false);

	const code = searchParams.get('code');

	const onBindGoogleUser = async (code: string) => {
		const [res, err] = await utils.to(bindGoogle({
			code,
			redirect_uri: buildOAuthCallbackUrl('google', 'bind'),
		}));
		if (err || !res) {
			toast.error(err.message);
			await utils.sleep(1000);
			window.location.replace(buildPublicAppUrl('/account'));
			return;
		}
		refreshMainUserInfo();
		window.location.replace(buildPublicAppUrl('/account'));
	};

	useEffect(() => {
		if (!code) {
			return;
		}
		if (consumed.current) return;
		consumed.current = true;
		const handleCallback = async () => {
			const oauthState = consumeOAuthState(searchParams.get('state'));
			if (!oauthState.ok) {
				toast.error('OAuth request expired or could not be verified');
				await utils.sleep(1000);
				window.location.replace(buildPublicAppUrl('/account'));
				return;
			}
			onBindGoogleUser(code);
		};
		handleCallback();
	}, [code, searchParams]);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default GoogleBindPage;
