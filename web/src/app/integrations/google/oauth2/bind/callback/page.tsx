'use client';

import { useUserContext } from '@/provider/user-provider';
import { bindGoogle } from '@/service/user';
import { utils } from '@kinda/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

const GoogleBindPage = () => {
	const { refreshMainUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const router = useRouter();

	const code = searchParams.get('code');

	const onBindGoogleUser = async (code: string) => {
		const [res, err] = await utils.to(bindGoogle({ code }));
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
		onBindGoogleUser(code);
	}, []);

	return (
		<div className='flex h-screen w-full items-center justify-center px-4'>
			Redirecting...
		</div>
	);
};

export default GoogleBindPage;
