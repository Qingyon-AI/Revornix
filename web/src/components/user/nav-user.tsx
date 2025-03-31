'use client';

import {
	BadgeCheck,
	Bell,
	ChevronsUpDown,
	LogOut,
	Sparkles,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '../ui/badge';
import { NOTIFICATION_WS_API_PREFIX } from '@/config/api';
import { getQueryClient } from '@/lib/get-query-client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import Link from 'next/link';

export function NavUser({}) {
	const queryClient = getQueryClient();
	const router = useRouter();
	const { isMobile } = useSidebar();
	const { userInfo, logOut } = useUserContext();

	const onLogout = async () => {
		logOut();
		router.push('/login');
	};

	const notificationWebsocket = useWebSocket(NOTIFICATION_WS_API_PREFIX!, {
		manual: true,
		onMessage: (e) => {
			console.log(e);
			const message = JSON.parse(e.data);
			const notification = message.notification;
			let action = null;
			if (notification.link) {
				action = {
					label: '前往查看',
					onClick: () => router.push(notification.link),
				};
			}
			toast.info('收到一条新通知', {
				description: notification.content,
				action: action,
			});
			queryClient.invalidateQueries({
				queryKey: ['searchMyNotifications', ''],
			});
		},
	});

	useEffect(() => {
		if (userInfo) {
			notificationWebsocket.connect();
		}
	}, [userInfo]);

	return (
		<SidebarMenu>
			{userInfo && (
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size='lg'
								className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'>
								<Avatar className='size-8 rounded-lg'>
									<AvatarImage
										src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${userInfo.avatar?.name}`}
										alt={userInfo.avatar?.name}
										className='object-cover'
									/>
									<AvatarFallback className='rounded-lg'>A</AvatarFallback>
								</Avatar>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-semibold line-clamp-1'>
										{userInfo.nickname}
									</span>
									<span className='line-clamp-1 text-xs text-muted-foreground'>
										{userInfo.slogan ? userInfo.slogan : '暂无签名'}
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
									<Avatar className='size-8 rounded-lg'>
										<AvatarImage
											className='object-cover'
											src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${userInfo.avatar?.name}`}
											alt={userInfo.avatar?.name}
										/>
										<AvatarFallback className='rounded-lg'>A</AvatarFallback>
									</Avatar>
									<div className='grid flex-1 text-left text-sm leading-tight'>
										<span className='truncate font-semibold line-clamp-1'>
											{userInfo.nickname}
										</span>
										<span className='line-clamp-1 text-xs text-muted-foreground'>
											{userInfo.slogan ? userInfo.slogan : '暂无签名'}
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
												粉丝
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
												关注
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
									账户
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => router.push('/account/notifications')}>
									<Bell />
									通知
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onLogout}>
								<LogOut />
								退出
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			)}
		</SidebarMenu>
	);
}
