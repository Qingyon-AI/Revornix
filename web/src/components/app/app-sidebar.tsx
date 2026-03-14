import * as React from 'react';
import {
	BotIcon,
	BookOpen,
	FileText,
	Flame,
	LayoutDashboard,
	LifeBuoy,
	PlusCircle,
	ChartNetwork,
	SatelliteDish
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
			<SidebarHeader className='p-3'>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size='lg' asChild>
							<Link href='/dashboard'>
								<div className='flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 via-sky-400/10 to-transparent ring-1 ring-sidebar-border/70 shadow-sm'>
									<Image src={logo} alt='logo' className='block dark:hidden' />
									<Image
										src={darklogo}
										alt='logo'
										className='hidden dark:block'
									/>
									<SatelliteDish className='size-4 text-emerald-700/80 dark:text-emerald-200/80' />
								</div>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-semibold tracking-tight'>
										{t('website_title')}
									</span>
									<span className='truncate text-xs text-sidebar-foreground/70'>
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
										<ChartNetwork />
										<Link href={'/graph'} className='w-full'>
											{t('sidebar_graph')}
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
						<div className='flex items-center gap-2'>
							<BookOpen className='size-3.5 text-emerald-600 dark:text-emerald-300' />
							<div>{t('sidebar_section')}</div>
						</div>
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
						<div className='flex items-center gap-2'>
							<FileText className='size-3.5 text-sky-600 dark:text-sky-300' />
							<div>{t('sidebar_document')}</div>
						</div>
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
					<SidebarGroupLabel>
						<div className='flex items-center gap-2'>
							<LifeBuoy className='size-3.5 text-amber-600 dark:text-amber-300' />
							<div>{t('sidebar_help')}</div>
						</div>
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'https://revornix.com'} target='_blank'>
										{t('sidebar_user_guide')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link
										href={'https://github.com/Qingyon-AI/Revornix'}
										target='_blank'>
										{t('sidebar_github')}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={'https://discord.gg/3XZfz84aPN'} target='_blank'>
										{t('sidebar_discord')}
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
