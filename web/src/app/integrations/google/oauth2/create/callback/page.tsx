'use client';

import { createUserByGoogle } from '@/service/user';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { utils } from '@kinda/utils';
import { useUserContext } from '@/provider/user-provider';

const GoogleCreatePage = () => {
	const { refreshUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const router = useRouter();

	const code = searchParams.get('code');

	const onCreateGoogleUser = async (code: string) => {
		const [res, err] = await utils.to(createUserByGoogle({ code }));
		if (err || !res) {
			toast.error(err.message);
			await utils.sleep(1000);
			router.push('/login');
			return;
		}
		Cookies.set('access_token', res.access_token, {
			expires: res.expires_in / 1000,
		});
		Cookies.set('refresh_token', res.refresh_token);
		router.push('/dashboard');
		refreshUserInfo();
	};

	useEffect(() => {
		if (!code) {
			return;
		}
		onCreateGoogleUser(code);
	}, []);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default GoogleCreatePage;
