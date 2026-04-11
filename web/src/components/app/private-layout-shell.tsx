'use client';

import { AppSidebar } from '@/components/app/app-sidebar';
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
import { Inbox, Settings } from 'lucide-react';
import Link from 'next/link';

const PrivateLayoutShell = ({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) => {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className='bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_left_top,rgba(59,130,246,0.08),transparent_24%)]'>
				<HashHighlighter />
				<div className='pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]'>
					<div className='absolute inset-0'>
						<div className='absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl' />
						<div className='absolute right-[-6rem] top-12 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl' />
						<div className='absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent' />
					</div>
				</div>

				<header className='sticky top-0 z-20 px-5 pt-3 pb-3 backdrop-blur'>
					<div className='flex min-h-13 items-center justify-between rounded-2xl border border-border/60 bg-card/80 px-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.32)] backdrop-blur-xl'>
						<div className='flex gap-1.5 items-center flex-1'>
							<SidebarTrigger className='size-6 rounded-xl' />
							<TopNav />
						</div>
						<div className='flex flex-row gap-1.5 items-center'>
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
						</div>
					</div>
				</header>
				<div className='relative flex min-h-0 min-w-0 w-full flex-1 flex-col'>
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
};

export default PrivateLayoutShell;
