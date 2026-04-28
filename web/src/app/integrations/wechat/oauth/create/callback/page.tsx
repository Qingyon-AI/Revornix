'use client';

import { createUserByWechat } from '@/service/user';
import { useRouter } from 'nextjs-toploader/app';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { setAuthCookies } from '@/lib/auth-cookies';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { decodeRedirectState } from '@/lib/safe-redirect';

const WeChatCreatePage = () => {
	const { refreshMainUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const router = useRouter();
	const consumed = useRef(false);

	const code = searchParams.get('code');
	const redirectTo = decodeRedirectState(searchParams.get('state'));

	const onCreateWeChatUser = async (code: string) => {
		const [res, err] = await utils.to(createUserByWechat({ code }));
		if (err || !res) {
			toast.error(err?.message ?? 'WeChat login failed');
			await utils.sleep(1000);
			router.replace(`/login?redirect_to=${encodeURIComponent(redirectTo)}`);
			return;
		}
		setAuthCookies(res);
		refreshMainUserInfo();
		router.replace(redirectTo);
	};

	useEffect(() => {
		if (!code) {
			router.replace('/login');
			return;
		}
		if (consumed.current) return;
		consumed.current = true;
		onCreateWeChatUser(code);
	}, [code]);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default WeChatCreatePage;
