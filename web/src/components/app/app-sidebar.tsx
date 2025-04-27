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
import { useTranslations } from 'next-intl';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const t = useTranslations();
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
									<span className='truncate font-semibold'>
										{t('website_title')}
									</span>
									<span className='truncate text-xs'>
										{t('website_description')}
									</span>
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
											{t('sidebar_dashboard')}
										</Link>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<div className='w-full'>
										<Flame />
										<Link href={'/hot-search'} className='w-full'>
											{t('sidebar_hot_search')}
										</Link>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<div className='w-full'>
										<BotIcon />
										<Link href={'/revornix-ai'} className='w-full'>
											{t('sidebar_revornix_ai')}
										</Link>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel className='w-full justify-between items-center'>
						<div>{t('sidebar_section')}</div>
						<Link href={'/section/create'}>
							<Button
								variant={'link'}
								className='text-xs text-muted-foreground'>
								{t('sidebar_section_create')}
								<PlusCircle className='size-3' />
							</Button>
						</Link>
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/section/today'}>
										{t('sidebar_day_summary')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/section/community'}>
										{t('sidebar_social_section')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/section/subscribed'}>
										{t('sidebar_subscribed_section')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/section/mine'}>
										{t('sidebar_mine_section')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel className='w-full justify-between items-center'>
						<div>{t('sidebar_document')}</div>
						<Link href={'/document/create'}>
							<Button
								variant={'link'}
								className='text-xs text-muted-foreground'>
								{t('sidebar_document_create')}
								<PlusCircle className='size-3' />
							</Button>
						</Link>
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/document/unread'}>
										{t('sidebar_unread_document')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/document/recent'}>
										{t('sidebar_recent_read_document')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'/document/star'}>
										{t('sidebar_star_document')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<div>
										<Link
											href={'/document/mine'}
											className='flex flex-row w-full items-center gap-2'>
											{t('sidebar_mine_document')}
										</Link>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>{t('sidebar_help')}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'https://revornix.com'} target='_blank'>
										{t('sidebar_user_guide')}
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
