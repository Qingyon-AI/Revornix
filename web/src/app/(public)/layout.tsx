'use client';

import NextTopLoader from 'nextjs-toploader';
import { AppSidebar } from '@/components/app/app-sidebar';
import TopNav from '@/components/app/top-nav';
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@/components/ui/sidebar';
import CommandPanel from '@/components/app/command-panel';
import { Button } from '@/components/ui/button';
import { Inbox, Settings } from 'lucide-react';
import Link from 'next/link';
import GithubIcon from '@/components/icons/github-icon';

export default function Page({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<SidebarProvider>
			<AppSidebar variant={'inset'} />
			<SidebarInset>
				<header className='flex h-16 items-center gap-2'>
					<div className='flex items-center px-4 w-full justify-between'>
						<div className='flex gap-2 items-center flex-1'>
							<SidebarTrigger />
							<TopNav />
						</div>
						<div className='flex flex-row gap-2 items-center'>
							<CommandPanel />
							<Link href='/account/notifications'>
								<Button variant='outline' size='icon' type='button'>
									<Inbox />
									<span className='sr-only'>Notifications</span>
								</Button>
							</Link>
							<Link href='/setting'>
								<Button variant='outline' size='icon' type='button'>
									<Settings />
								</Button>
							</Link>
							<Link href='https://github.com/Qingyon-AI/Revornix' target='_blank'>
								<Button variant='outline' size='icon' type='button' >
									<GithubIcon />
									<span className='sr-only'>Github</span>
								</Button>
							</Link>
						</div>
					</div>
				</header>
				{/* flex: '1 1 0' 的目的是强制flex-basis设置为0px而不是0%，因为在父级高度不确定的情况下0%会回滚为auto，导致高度被撑开，overflow-auto失效 */}
				<div
					className='flex flex-col overflow-auto w-full'
					style={{ flex: '1 1 0' }}>
					<NextTopLoader />
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
