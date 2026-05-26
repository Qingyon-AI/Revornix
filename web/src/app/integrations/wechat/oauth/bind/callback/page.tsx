'use client';

import { bindWeChat } from '@/service/user';
import { useRouter } from 'nextjs-toploader/app';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { consumeOAuthState } from '@/lib/oauth-state';

const WeChatCreatePage = () => {
	const { refreshMainUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const router = useRouter();
	const consumed = useRef(false);

	const code = searchParams.get('code');

	const onBindWeChatUser = async (code: string) => {
		const [res, err] = await utils.to(bindWeChat({ code }));
		if (err || !res) {
			toast.error(err.message);
			await utils.sleep(1000);
			router.push('/account');
			return;
		}
		router.push('/account');
		refreshMainUserInfo();
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
				router.push('/account');
				return;
			}
			onBindWeChatUser(code);
		};
		handleCallback();
	}, [code, router, searchParams]);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default WeChatCreatePage;
