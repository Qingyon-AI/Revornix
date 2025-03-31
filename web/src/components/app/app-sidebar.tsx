import * as React from 'react';
import {
	BotIcon,
	Flame,
	LayoutDashboard,
	PlusCircle,
	SatelliteDish,
} from 'lucide-react';
import Link from 'next/link';
import { NavUser } from '@/components/user/nav-user';
import { appName, appDescription } from '@/config/base';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar';
import darklogo from '@/static/logo.dark.png';
import logo from '@/static/logo.png';
import AddDocumentBox from '../document/add-document-box';
import Image from 'next/image';
import { Button } from '../ui/button';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size='lg' asChild>
							<Link href='/dashboard'>
								<div className='flex aspect-square size-8 items-center justify-center rounded-lg'>
									<Image src={logo} alt='logo' className='block dark:hidden' />
									<Image
										src={darklogo}
										alt='logo'
										className='hidden dark:block'
									/>
									<SatelliteDish className='size-4' />
								</div>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-semibold'>{appName}</span>
									<span className='truncate text-xs'>{appDescription}</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<AddDocumentBox />
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<div className='w-full'>
										<LayoutDashboard />
										<Link href={'/dashboard'} className='w-full'>
											仪表盘
										</Link>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<div className='w-full'>
										<Flame />
										<Link href={'/hot-search'} className='w-full'>
											热搜集合
										</Link>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<div className='w-full'>
										<BotIcon />
										<Link href={'/revornix-ai'} className='w-full'>
											Revornix AI
										</Link>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel className='w-full justify-between items-center'>
						<div>专栏</div>
						<Link href={'/section/create'}>
							<Button
								variant={'link'}
								className='text-xs text-muted-foreground'>
								创建
								<PlusCircle className='size-3' />
							</Button>
						</Link>
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/section/today'}>今日总结</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/section/community'}>社区专栏</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/section/subscribed'}>订阅专栏</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/section/mine'}>我的专栏</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel className='w-full justify-between items-center'>
						<div>文档</div>
						<Link href={'/document/create'}>
							<Button
								variant={'link'}
								className='text-xs text-muted-foreground'>
								创建
								<PlusCircle className='size-3' />
							</Button>
						</Link>
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/document/unread'}>未读文档</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/document/recent'}>最近阅读</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/document/star'}>星标文档</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<div>
										<Link
											href={'/document/mine'}
											className='flex flex-row w-full items-center gap-2'>
											我的文档
										</Link>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>帮助</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'https://revornix.com'} target='_blank'>
										使用文档
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	);
}
