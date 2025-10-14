'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { PrivateUserInfo } from '@/generated';
import { useQuery } from '@tanstack/react-query';
import { getMyInfo } from '@/service/user';
import Link from 'next/link';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BadgeCheck, Bell, LogOut } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { useSidebar } from '../ui/sidebar';
import { useUserContext } from '@/provider/user-provider';

const NavUser = () => {
	const t = useTranslations();
	const router = useRouter();
	const { userInfo, logOut } = useUserContext();
	const onLogout = async () => {
		logOut();
		router.push('/login');
	};

	return (
		<>
			{!userInfo && (
				<Link href={'/login'}>
					<Button variant={'outline'}>{t('seo_nav_login_in')}</Button>
				</Link>
			)}
			{userInfo && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Link className='text-xs' href={'/dashboard'}>
							<img
								src={userInfo.avatar}
								alt='avatar'
								className='rounded-full size-8 object-cover'
							/>
						</Link>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
						side={'bottom'}
						align='end'
						sideOffset={4}>
						<DropdownMenuLabel className='p-0 font-normal'>
							<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
								<img
									src={userInfo.avatar!}
									alt={'avatar'}
									className='object-cover size-8 rounded-lg'
								/>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-semibold line-clamp-1'>
										{userInfo.nickname}
									</span>
									<span className='line-clamp-1 text-xs text-muted-foreground'>
										{userInfo.slogan ? userInfo.slogan : t('user_no_slogan')}
									</span>
								</div>
							</div>
							<div className='flex flex-row items-center gap-1'>
								<Link href={'/user/fans'} className='flex-1'>
									<Button
										variant={'link'}
										className='shadow-none w-full'
										size={'sm'}>
										<span className='text-muted-foreground text-xs'>
											{t('user_fans')}
										</span>
										<span className='font-bold ml-1'>{userInfo.fans}</span>
									</Button>
								</Link>
								<Link href={'/user/follows'} className='flex-1'>
									<Button
										variant={'link'}
										className='shadow-none w-full'
										size={'sm'}>
										<span className='text-muted-foreground text-xs'>
											{t('user_follows')}
										</span>
										<span className='font-bold ml-1'>{userInfo.follows}</span>
									</Button>
								</Link>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => router.push('/account')}>
								<BadgeCheck />
								{t('user_account')}
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => router.push('/account/notifications')}>
								<Bell />
								{t('user_notifications')}
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onLogout}>
							<LogOut />
							{t('user_logout')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</>
	);
};

export default NavUser;
