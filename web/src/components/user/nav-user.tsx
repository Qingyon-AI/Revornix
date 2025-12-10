'use client';

import {
	BadgeCheck,
	Bell,
	ChevronsUpDown,
	LogOut,
	Sparkles,
} from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Cookies from 'js-cookie';
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar';
import { useEffect } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { toast } from 'sonner';
import { useUserContext } from '@/provider/user-provider';
import { useWebSocket } from 'ahooks';
import { NOTIFICATION_WS_API_PREFIX } from '@/config/api';
import { getQueryClient } from '@/lib/get-query-client';
import { Button } from '../ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import CustomImage from '../ui/custom-image';

export function NavUser() {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const router = useRouter();
	const { isMobile } = useSidebar();
	const { mainUserInfo, logOut } = useUserContext();

	const onLogout = async () => {
		logOut();
		router.push('/login');
	};

	const notificationWebsocket = useWebSocket(
		`${NOTIFICATION_WS_API_PREFIX!}?access_token=${Cookies.get(
			'access_token'
		)}`,
		{
			manual: true,
			onOpen(event, instance) {
				console.log('websocket opened', event, instance);
			},
			onMessage: (e) => {
				const message = JSON.parse(e.data);
				const notification = message.notification;
				let action = null;
				if (notification.link) {
					action = {
						label: t('notification_to_view'),
						onClick: () => router.push(notification.link),
					};
				}
				if (Notification.permission === 'granted') {
					new Notification(t('notification_receive'), {
						body: notification.content,
						icon: 'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504272029275.png',
					});
				}
				toast.info(t('notification_receive'), {
					description: notification.content,
					action: action,
				});
				queryClient.invalidateQueries({
					queryKey: ['searchMyNotifications', ''],
				});
			},
			onClose(event, instance) {
				console.log('websocket closed', event, instance);
			},
			onError(event, instance) {
				console.log('websocket error', event, instance);
			},
		}
	);

	useEffect(() => {
		if (mainUserInfo) {
			notificationWebsocket.connect();
		}
	}, [mainUserInfo]);

	return (
		<SidebarMenu>
			{mainUserInfo && (
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size='lg'
								className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'>
								<CustomImage
									src={mainUserInfo.avatar!}
									alt={'avatar'}
									className='object-cover size-8 rounded-lg'
									errorPlaceHolder={
										<div className='rounded-lg size-8 flex justify-center items-center bg-muted'>
											A
										</div>
									}
								/>
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
								<ChevronsUpDown className='ml-auto size-4' />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
							side={isMobile ? 'bottom' : 'right'}
							align='end'
							sideOffset={4}>
							<DropdownMenuLabel className='p-0 font-normal'>
								<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
									<CustomImage
										src={mainUserInfo.avatar!}
										alt={'avatar'}
										className='object-cover size-8 rounded-lg'
										errorPlaceHolder={
											<div className='rounded-lg size-8 flex justify-center items-center bg-muted'>
												A
											</div>
										}
									/>
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
											<span className='font-bold ml-1'>
												{mainUserInfo.fans}
											</span>
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
							<DropdownMenuGroup>
								<DropdownMenuItem onClick={() => router.push('/account/plan')}>
									<Sparkles />
									{t('account_plan_upgrade')}
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onLogout}>
								<LogOut />
								{t('user_logout')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			)}
		</SidebarMenu>
	);
}
