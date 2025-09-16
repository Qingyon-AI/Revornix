'use client';

import { createUserByWechat } from '@/service/user';
import { useRouter } from 'nextjs-toploader/app';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';

const WeChatCreatePage = () => {
	const { refreshUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const router = useRouter();

	const code = searchParams.get('code');

	const onCreateWeChatUser = async (code: string) => {
		const [res, err] = await utils.to(createUserByWechat({ code }));
		if (err) {
			toast.error(err.message);
			await utils.sleep(1000);
			router.push('/login');
			return;
		}
		if (!res) return;
		Cookies.set('access_token', res.access_token);
		Cookies.set('refresh_token', res.refresh_token);
		refreshUserInfo();
		router.push('/dashboard');
	};

	useEffect(() => {
		if (!code) {
			return;
		}
		onCreateWeChatUser(code);
	}, []);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default WeChatCreatePage;
