'use client';

import type { ReactNode } from 'react';

import { useMemo, useState } from 'react';
import {
	AudioLines,
	BookOpenText,
	BookText,
	GitBranch,
	Globe2,
	Info,
	Menu,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/provider/audio-player-provider';

type SeoMobileSidebarMenuProps = {
	browseLabel: string;
	menuTitle: string;
	menuDescription: string;
	panels: Array<{
		key: string;
		icon:
			| 'info'
			| 'graph'
			| 'audio'
			| 'documents'
			| 'source'
			| 'sections'
			| 'community';
		title: string;
		description: string;
		content?: ReactNode;
	}>;
	className?: string;
};

const mobileActionButtonClassName =
	'h-14 w-full justify-start gap-3 rounded-[20px] border border-border/70 bg-background/70 px-4 text-left text-sm font-medium text-foreground shadow-[0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-background/90 dark:bg-background/45 dark:hover:bg-background/60 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

const iconMap = {
	info: Info,
	graph: GitBranch,
	audio: AudioLines,
	documents: BookOpenText,
	source: Globe2,
	sections: BookText,
	community: BookText,
} as const;

const SeoMobileSidebarMenu = ({
	browseLabel,
	menuTitle,
	menuDescription,
	panels,
	className,
}: SeoMobileSidebarMenuProps) => {
	const isCompactViewport = useIsMobile(1280);
	const { track } = useAudioPlayer();
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [activePanelKey, setActivePanelKey] = useState<string | null>(null);
	const activePanel = useMemo(
		() => panels.find((panel) => panel.key === activePanelKey) ?? null,
		[activePanelKey, panels],
	);

	if (!isCompactViewport || panels.length === 0) {
		return null;
	}

	return (
		<>
			<Drawer open={showMobileMenu} onOpenChange={setShowMobileMenu}>
				<div
					className={cn(
						'fixed right-4 z-50 transition-[bottom] duration-200',
						track
							? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
							: 'bottom-[calc(1rem+env(safe-area-inset-bottom))]',
					)}>
					<DrawerTrigger asChild>
						<Button
							size='icon'
							className={cn(
								'size-14 rounded-full border border-border/70 bg-card/92 text-foreground shadow-[0_24px_50px_-26px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-card/78 dark:bg-background/80 dark:supports-[backdrop-filter]:bg-background/65',
								className,
							)}>
							<Menu className='size-5 text-foreground' />
							<span className='sr-only'>{menuTitle}</span>
						</Button>
					</DrawerTrigger>
				</div>
				<DrawerContent className='flex max-h-[86dvh] flex-col overflow-hidden rounded-t-[32px] border-border/70 bg-background/96 shadow-[0_-24px_60px_-32px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/88 dark:bg-background/92'>
					<DrawerHeader className='items-start px-4 pb-3 pt-2 text-left'>
						<DrawerTitle className='text-lg tracking-tight'>
							{menuTitle}
						</DrawerTitle>
						<DrawerDescription className='max-w-[28rem] text-left text-sm leading-6 text-muted-foreground/90'>
							{menuDescription}
						</DrawerDescription>
					</DrawerHeader>

					<div className='min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'>
						<div className='space-y-4'>
							<div className='space-y-2 border-t border-border/60 pt-4'>
								<p className='px-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
									{browseLabel}
								</p>
								<div className='grid grid-cols-2 gap-2.5'>
									{panels.map((panel) => {
										const Icon = iconMap[panel.icon];
										return (
											<Button
												key={panel.key}
												variant='ghost'
												className={mobileActionButtonClassName}
												onClick={() => {
													setShowMobileMenu(false);
													setActivePanelKey(panel.key);
												}}>
												<Icon />
												<span className='truncate'>{panel.title}</span>
											</Button>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				</DrawerContent>
			</Drawer>

			<Sheet
				open={activePanel !== null}
				onOpenChange={(open) => {
					if (!open) {
						setActivePanelKey(null);
					}
				}}>
				<SheetContent
					side='bottom'
					className='flex h-[86dvh] flex-col gap-0 rounded-t-[32px] border-border/70 bg-background/96 pt-0 shadow-[0_-24px_60px_-32px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/88 dark:bg-background/92'>
					<SheetHeader className='border-b border-border/60 px-5 pb-3 pt-6 text-left'>
						<SheetTitle className='text-xl tracking-tight'>
							{activePanel?.title}
						</SheetTitle>
						<SheetDescription className='max-w-md text-sm leading-6'>
							{activePanel?.description}
						</SheetDescription>
					</SheetHeader>
					<div
						className={cn(
							'min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.06),transparent_28%),radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_24%)] sm:px-5 sm:py-5',
							activePanel?.icon === 'audio' ? 'px-0 py-0' : 'px-4 py-4',
						)}>
						<div
							className={cn(
								activePanel?.icon === 'audio'
									? ''
									: 'rounded-[28px] border border-border/60 bg-background/70 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.18)]',
							)}>
							{activePanel?.content ?? null}
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
};

export default SeoMobileSidebarMenu;
