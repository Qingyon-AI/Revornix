'use client';

import { createUserByGoogle } from '@/service/user';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { setAuthCookies } from '@/lib/auth-cookies';
import { utils } from '@kinda/utils';
import { useUserContext } from '@/provider/user-provider';
import { buildOAuthCallbackUrl, buildPublicAppUrl } from '@/lib/oauth';
import { consumeOAuthState } from '@/lib/oauth-state';
import { buildMfaLoginPath, hasAuthTokens, isMfaRequired } from '@/lib/auth-response';

const GoogleCreatePage = () => {
	const { refreshMainUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const consumed = useRef(false);

	const code = searchParams.get('code');

	const onCreateGoogleUser = async (code: string, redirectTo: string) => {
		const [res, err] = await utils.to(createUserByGoogle({
			code,
			redirect_uri: buildOAuthCallbackUrl('google', 'create'),
		}));
		if (err || !res) {
			toast.error(err?.message ?? 'Google login failed');
			await utils.sleep(1000);
			window.location.replace(
				buildPublicAppUrl(`/login?redirect_to=${encodeURIComponent(redirectTo)}`)
			);
			return;
		}
		if (isMfaRequired(res)) {
			window.location.replace(buildPublicAppUrl(buildMfaLoginPath(res.challenge_id!, redirectTo, res.methods)));
			return;
		}
		if (!hasAuthTokens(res)) {
			toast.error('Google login failed');
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
		const handleCallback = async () => {
			const oauthState = consumeOAuthState(searchParams.get('state'));
			if (!oauthState.ok) {
				toast.error('OAuth request expired or could not be verified');
				await utils.sleep(1000);
				window.location.replace(
					buildPublicAppUrl(`/login?redirect_to=${encodeURIComponent(oauthState.redirect)}`)
				);
				return;
			}
			onCreateGoogleUser(code, oauthState.redirect);
		};
		handleCallback();
	}, [code, searchParams]);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default GoogleCreatePage;
