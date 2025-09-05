'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { PrivateUserInfo } from '@/generated';
import { useQuery } from '@tanstack/react-query';
import { getMyInfo } from '@/service/user';
import Link from 'next/link';

const NavUser = () => {
	const t = useTranslations();
	const [userInfo, setUserInfo] = useState<PrivateUserInfo | undefined>(
		undefined
	);
	// 2. 获取用户信息
	const { data, refetch: refreshUserInfo } = useQuery({
		enabled: false,
		queryKey: ['myInfo'],
		queryFn: getMyInfo,
	});
	// 3. 在查询成功时更新 userInfo
	useEffect(() => {
		if (data) {
			setUserInfo(data);
		}
	}, [data]);

	return (
		<>
			{!userInfo && (
				<Link href={'/login'} >
					<Button variant={'outline'}>{t('seo_nav_login_in')}</Button>
				</Link>
			)}
			{userInfo && (
				<Link className='text-xs' href={'/dashboard'}>
					<img
						src={userInfo.avatar}
						alt='avatar'
						className='rounded-full size-8 object-cover'
					/>
				</Link>
			)}
		</>
	);
};

export default NavUser;
