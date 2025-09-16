'use client';

import { bindWeChat, createUserByWechat } from '@/service/user';
import { useRouter } from 'nextjs-toploader/app';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';

const WeChatCreatePage = () => {
	const { refreshUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const router = useRouter();

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
		refreshUserInfo();
	};

	useEffect(() => {
		if (!code) {
			return;
		}
		onBindWeChatUser(code);
	}, []);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default WeChatCreatePage;
