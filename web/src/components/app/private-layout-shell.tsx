'use client';

import { AppSidebar } from '@/components/app/app-sidebar';
import {
	AppRightSidebar,
	RightSidebarTrigger,
} from '@/components/app/app-right-sidebar';
import CommandPanel from '@/components/app/command-panel';
import HashHighlighter from '@/components/app/hash-highlighter';
import TopNav from '@/components/app/top-nav';
import GithubIcon from '@/components/icons/github-icon';
import { Button } from '@/components/ui/button';
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@/components/ui/sidebar';
import { RightSidebarProvider } from '@/provider/right-sidebar-provider';
import { Inbox, Settings } from 'lucide-react';
import Link from 'next/link';

const PrivateLayoutShell = ({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) => {
	return (
		<SidebarProvider>
			<RightSidebarProvider>
				<AppSidebar />
				<SidebarInset
					style={
						{
							'--private-top-header-height': '3.5rem',
						} as React.CSSProperties
					}>
					<HashHighlighter />
					<div className='pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]'>
						<div className='absolute inset-0'>
							<div className='absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent' />
						</div>
					</div>

					<header className='sticky top-0 z-20 h-[var(--private-top-header-height)] px-5 backdrop-blur'>
						<div className='flex h-full items-center justify-between backdrop-blur-xl'>
							<div className='flex min-w-0 flex-1 items-center gap-1.5'>
								<SidebarTrigger className='size-6 shrink-0 rounded-xl' />
								<TopNav />
							</div>
							<div className='flex shrink-0 flex-row items-center gap-1.5'>
								<CommandPanel />
								<Link href='/account/notifications'>
									<Button
										variant='outline'
										size='icon-sm'
										type='button'
										className='rounded-xl'>
										<Inbox />
										<span className='sr-only'>Notifications</span>
									</Button>
								</Link>
								<Link href='/setting'>
									<Button
										variant='outline'
										size='icon-sm'
										type='button'
										className='rounded-xl'>
										<Settings />
									</Button>
								</Link>
								<Link
									href='https://github.com/Qingyon-AI/Revornix'
									target='_blank'>
									<Button
										variant='outline'
										size='icon-sm'
										type='button'
										className='rounded-xl'>
										<GithubIcon />
										<span className='sr-only'>Github</span>
									</Button>
								</Link>
								<RightSidebarTrigger />
							</div>
						</div>
					</header>
					<div className='relative flex min-h-0 min-w-0 w-full flex-1 flex-col'>
						{children}
					</div>
				</SidebarInset>
				<AppRightSidebar />
			</RightSidebarProvider>
		</SidebarProvider>
	);
};

export default PrivateLayoutShell;
