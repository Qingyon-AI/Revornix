'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
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
import { BadgeCheck, Bell, LayoutDashboard, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { useUserContext } from '@/provider/user-provider';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const NavUser = () => {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const { mainUserInfo, logOut } = useUserContext();
	const onLogout = async () => {
		logOut();
		router.push('/login');
	};

	return (
		<>
			{!mainUserInfo && pathname !== '/login' && (
				<Button
					asChild
					variant='outline'
					size='sm'
					className='rounded-xl border-border/60 bg-background/72 px-3 shadow-none'>
					<Link href={'/login'}>{t('seo_nav_login_in')}</Link>
				</Button>
			)}
			{mainUserInfo && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type='button'
							className='rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring'
							aria-label={mainUserInfo.nickname}>
							<Avatar className='size-8'>
								<AvatarImage
									src={mainUserInfo.avatar}
									alt={mainUserInfo.nickname}
									className='object-cover size-8'
								/>
								<AvatarFallback className='size-8 font-semibold'>
									{mainUserInfo.nickname?.slice(0, 1) || '?'}
								</AvatarFallback>
							</Avatar>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
						side={'bottom'}
						align='end'
						sideOffset={4}>
						<DropdownMenuLabel className='p-0 font-normal'>
							<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
								<Avatar className='size-8 rounded-lg'>
									<AvatarImage
										src={mainUserInfo.avatar}
										alt={mainUserInfo.nickname}
										className='object-cover size-8 rounded-lg'
									/>
									<AvatarFallback className='size-8 rounded-lg font-semibold'>
										{mainUserInfo.nickname?.slice(0, 1) || '?'}
									</AvatarFallback>
								</Avatar>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-semibold line-clamp-1'>
										{mainUserInfo.nickname}
									</span>
									<span className='line-clamp-1 text-xs text-muted-foreground'>
										{mainUserInfo.slogan
											? mainUserInfo.slogan
											: t('user_no_slogan')}
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
										<span className='font-bold ml-1'>{mainUserInfo.fans}</span>
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
										<span className='font-bold ml-1'>
											{mainUserInfo.follows}
										</span>
									</Button>
								</Link>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => router.push('/dashboard')}>
								<LayoutDashboard />
								{t('seo_nav_dashboard')}
							</DropdownMenuItem>
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
