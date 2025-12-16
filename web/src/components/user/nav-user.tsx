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
import { useEffect, useMemo, useState } from 'react';
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
import { Badge } from '../ui/badge';

export function NavUser() {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();
	const { isMobile } = useSidebar();
	const { mainUserInfo, logOut, paySystemUserInfo } = useUserContext();

	/** -----------------------------
	 * host（避免 render 阶段直接访问 window）
	 * ----------------------------- */
	const [host, setHost] = useState<string | null>(null);

	useEffect(() => {
		setHost(window.location.host);
	}, []);

	/** -----------------------------
	 * WebSocket token
	 * ----------------------------- */
	const accessToken = useMemo(() => {
		return Cookies.get('access_token');
	}, []);

	const wsUrl = useMemo(() => {
		return accessToken
			? `${NOTIFICATION_WS_API_PREFIX}?access_token=${accessToken}`
			: '';
	}, [accessToken]);

	/** -----------------------------
	 * Notification WebSocket
	 * ----------------------------- */
	const notificationWebsocket = useWebSocket(wsUrl, {
		manual: true,

		onMessage: (e) => {
			try {
				const message = JSON.parse(e.data);
				const notification = message?.notification;
				if (!notification) return;

				let action = undefined;
				if (notification.link) {
					action = {
						label: t('notification_to_view'),
						onClick: () => router.push(notification.link),
					};
				}

				// 浏览器系统通知
				if (typeof Notification !== 'undefined') {
					if (Notification.permission === 'default') {
						Notification.requestPermission();
					}
					if (Notification.permission === 'granted') {
						new Notification(t('notification_receive'), {
							body: notification.content,
							icon: 'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504272029275.png',
						});
					}
				}

				// 站内 toast
				toast.info(t('notification_receive'), {
					description: notification.content,
					action,
				});

				// 刷新通知列表
				queryClient.invalidateQueries({
					queryKey: ['searchMyNotifications', ''],
				});
			} catch (err) {
				console.error('Invalid websocket message:', e.data, err);
			}
		},

		onError: (event) => {
			console.error('Notification websocket error:', event);
		},

		onClose: () => {
			console.log('Notification websocket closed');
		},
	});

	/** -----------------------------
	 * WebSocket lifecycle
	 * ----------------------------- */
	useEffect(() => {
		if (mainUserInfo && wsUrl) {
			notificationWebsocket.connect();
		}

		return () => {
			notificationWebsocket.disconnect();
		};
	}, [mainUserInfo, wsUrl]);

	/** -----------------------------
	 * Logout
	 * ----------------------------- */
	const onLogout = async () => {
		notificationWebsocket.disconnect();
		logOut();
		router.push('/login');
	};

	if (!mainUserInfo) return null;

	const showPlanUpgrade =
		host &&
		(host.includes('app.revornix.com') || host.includes('app.revornix.cn'));

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size='lg'
							className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'>
							<CustomImage
								src={mainUserInfo.avatar!}
								alt='avatar'
								className='object-cover size-8 rounded-lg'
								errorPlaceHolder={
									<div className='rounded-lg size-8 flex items-center justify-center bg-muted'>
										A
									</div>
								}
							/>

							<div className='grid flex-1 text-left text-sm leading-tight'>
								<span className='truncate font-semibold'>
									{mainUserInfo.nickname}
								</span>
								<span className='truncate text-xs text-muted-foreground'>
									{mainUserInfo.slogan || t('user_no_slogan')}
								</span>
							</div>

							<ChevronsUpDown className='ml-auto size-4' />

							{paySystemUserInfo?.userPlan?.plan?.product && (
								<Badge className='flex items-center gap-1 rounded-full border-none bg-linear-to-r from-sky-500 to-indigo-600 text-white'>
									<Sparkles className='size-3' />
									<span>{paySystemUserInfo.userPlan.plan.product.name}</span>
								</Badge>
							)}
						</SidebarMenuButton>
					</DropdownMenuTrigger>

					<DropdownMenuContent
						className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
						side={isMobile ? 'bottom' : 'right'}
						align='end'
						sideOffset={4}>
						<DropdownMenuLabel className='p-0 font-normal'>
							<div className='flex items-center gap-2 px-1 py-1.5'>
								<CustomImage
									src={mainUserInfo.avatar!}
									alt='avatar'
									className='object-cover size-8 rounded-lg'
								/>
								<div className='grid flex-1 text-sm'>
									<span className='font-semibold truncate'>
										{mainUserInfo.nickname}
									</span>
									<span className='text-xs text-muted-foreground truncate'>
										{mainUserInfo.slogan || t('user_no_slogan')}
									</span>
								</div>
							</div>

							<div className='flex gap-1'>
								<Link href='/user/fans' className='flex-1'>
									<Button variant='link' size='sm' className='w-full'>
										<span className='text-xs text-muted-foreground'>
											{t('user_fans')}
										</span>
										<span className='ml-1 font-bold'>{mainUserInfo.fans}</span>
									</Button>
								</Link>
								<Link href='/user/follows' className='flex-1'>
									<Button variant='link' size='sm' className='w-full'>
										<span className='text-xs text-muted-foreground'>
											{t('user_follows')}
										</span>
										<span className='ml-1 font-bold'>
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

						{showPlanUpgrade && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => router.push('/account/plan')}>
									<Sparkles />
									{t('account_plan_upgrade')}
								</DropdownMenuItem>
							</>
						)}

						<DropdownMenuSeparator />

						<DropdownMenuItem onClick={onLogout}>
							<LogOut />
							{t('user_logout')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
