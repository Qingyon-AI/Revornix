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
	useSidebar,
} from '@/components/ui/sidebar';
import {
	RightSidebarProvider,
	useRightSidebar,
} from '@/provider/right-sidebar-provider';
import { Inbox, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { useEffect, useRef } from 'react';

const EDITABLE_SELECTOR =
	'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]';
const OVERLAY_SELECTOR =
	'[role="dialog"], [role="menu"], [role="listbox"]';
const SHORTCUT_SEQUENCE_TIMEOUT = 1_200;

const isEditableTarget = (target: EventTarget | null) => {
	if (!(target instanceof HTMLElement)) return false;

	return target.isContentEditable || Boolean(target.closest(EDITABLE_SELECTOR));
};

const isOverlayTarget = (target: EventTarget | null) => {
	return target instanceof HTMLElement && Boolean(target.closest(OVERLAY_SELECTOR));
};

const GlobalPrivateShortcuts = () => {
	const router = useRouter();
	const { isMobile, openMobile, setOpenMobile } = useSidebar();
	const {
		hasContent: hasRightSidebarContent,
		open: rightSidebarOpen,
		setOpen: setRightSidebarOpen,
	} = useRightSidebar();
	const shortcutSequenceRef = useRef<{
		key: string;
		startedAt: number;
	} | null>(null);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;

			const isPrimaryKey = event.metaKey || event.ctrlKey;
			const key = event.key.toLowerCase();
			const isEditable = isEditableTarget(event.target);
			const now = Date.now();
			const shortcutSequence = shortcutSequenceRef.current;

			if (
				isPrimaryKey &&
				!event.altKey &&
				!event.shiftKey &&
				key === 'n' &&
				!isEditable
			) {
				event.preventDefault();
				router.push('/document/create');
				return;
			}

			if (
				isPrimaryKey &&
				!event.altKey &&
				event.shiftKey &&
				key === 'n' &&
				!isEditable
			) {
				event.preventDefault();
				router.push('/section/create');
				return;
			}

			if (
				isPrimaryKey &&
				!event.altKey &&
				!event.shiftKey &&
				event.key === ',' &&
				!isEditable
			) {
				event.preventDefault();
				router.push('/setting');
				return;
			}

			if (
				!isPrimaryKey &&
				!event.altKey &&
				!event.shiftKey &&
				!isEditable &&
				key.length === 1
			) {
				if (key === 'n') {
					shortcutSequenceRef.current = { key, startedAt: now };
					return;
				}

				const isFreshSequence =
					shortcutSequence?.key === 'n' &&
					now - shortcutSequence.startedAt <= SHORTCUT_SEQUENCE_TIMEOUT;

				if (isFreshSequence && key === 'd') {
					event.preventDefault();
					shortcutSequenceRef.current = null;
					router.push('/document/create');
					return;
				}

				if (isFreshSequence && key === 's') {
					event.preventDefault();
					shortcutSequenceRef.current = null;
					router.push('/section/create');
					return;
				}

				shortcutSequenceRef.current = null;
			}

			if (
				event.key === 'Escape' &&
				!event.metaKey &&
				!event.ctrlKey &&
				!event.altKey &&
				!event.shiftKey
			) {
				shortcutSequenceRef.current = null;

				if (
					isOverlayTarget(event.target) ||
					document.querySelector(OVERLAY_SELECTOR)
				) {
					return;
				}

				if (rightSidebarOpen && hasRightSidebarContent) {
					event.preventDefault();
					setRightSidebarOpen(false);
					return;
				}

				if (isMobile && openMobile) {
					event.preventDefault();
					setOpenMobile(false);
				}
			}
		};

		document.addEventListener('keydown', onKeyDown, true);
		return () => document.removeEventListener('keydown', onKeyDown, true);
	}, [
		hasRightSidebarContent,
		isMobile,
		openMobile,
		rightSidebarOpen,
		router,
		setOpenMobile,
		setRightSidebarOpen,
	]);

	return null;
};

const PrivateLayoutShell = ({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) => {

	return (
		<SidebarProvider>
			<RightSidebarProvider>
				<GlobalPrivateShortcuts />
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
