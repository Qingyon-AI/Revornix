'use client';

import { createUserByGoogle } from '@/service/user';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { utils } from '@kinda/utils';
import { useUserContext } from '@/provider/user-provider';
import { decodeRedirectState } from '@/lib/safe-redirect';

const GoogleCreatePage = () => {
	const { refreshMainUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const router = useRouter();

	const code = searchParams.get('code');
	const redirectTo = decodeRedirectState(searchParams.get('state'));

	const onCreateGoogleUser = async (code: string) => {
		const [res, err] = await utils.to(createUserByGoogle({ code }));
		if (err || !res) {
			toast.error(err.message);
			await utils.sleep(1000);
			router.replace(`/login?redirect_to=${encodeURIComponent(redirectTo)}`);
			return;
		}
		Cookies.set('access_token', res.access_token, {
			expires: res.expires_in / 1000,
		});
		Cookies.set('refresh_token', res.refresh_token);
		router.replace(redirectTo);
		refreshMainUserInfo();
	};

	useEffect(() => {
		if (!code) {
			router.replace('/login');
			return;
		}
		onCreateGoogleUser(code);
	}, [code]);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default GoogleCreatePage;
