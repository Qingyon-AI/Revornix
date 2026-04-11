'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	AudioLines,
	GitBranch,
	Info,
	Menu,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { UserSectionRole } from '@/enums/section';
import { getMineUserRoleAndAuthority, getSectionDetail } from '@/service/section';
import { useUserContext } from '@/provider/user-provider';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

import { Button } from '../ui/button';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '../ui/sheet';
import SectionDocument from './section-document';
import SectionGraph from './section-graph';
import SectionInfo from './section-info';
import SectionMedia from './section-media';
import SectionOperateAI from './section-operate-ai';
import SectionOperateComment from './section-operate-comment';
import SectionOperateConfiguration from './section-operate-configuration';
import SectionOperateDelete from './section-operate-delete';
import SectionOperateProcess from './section-operate-process';
import SectionOperateShare from './section-operate-share';
import SectionOperateSubscribe from './section-operate-subscribe';

type MobilePanel = 'info' | 'graph' | 'media' | null;

const SectionOperate = ({
	id,
	className,
}: {
	id: number;
	className?: string;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const isCompactViewport = useIsMobile(1280);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});
	const {
		data: sectionUserRoleAndAuthority,
		isFetched: isRoleFetched,
		isError: isRoleError,
	} = useQuery({
		queryKey: ['getMineUserRoleAndAuthority', id],
		queryFn: () => getMineUserRoleAndAuthority({ section_id: id }),
		enabled: mainUserInfo?.id !== undefined,
		retry: false,
	});

	const actionButtonClassName =
		'h-11 w-full justify-center rounded-[20px] border border-border/50 bg-background/40 px-3.5 text-center text-xs font-medium text-foreground shadow-none transition-colors hover:bg-background/80 sm:text-sm';
	const desktopIconButtonClassName =
		'h-11 w-full justify-center rounded-[20px] border border-border/50 bg-background/40 px-0 text-center text-xs font-medium text-foreground shadow-none transition-colors hover:bg-background/80 [&_svg]:size-4.5';
	const mobileActionButtonClassName =
		'h-14 w-full justify-start gap-3 rounded-[20px] border border-border/70 bg-background/70 px-4 text-left text-sm font-medium text-foreground shadow-[0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-background/90 dark:bg-background/45 dark:hover:bg-background/60 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';
	const desktopDockClassName =
		'grid w-full gap-2 rounded-[28px] border border-border/60 bg-background/75 p-2.5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.75)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/65';

	const isCreatorById =
		Boolean(section?.creator?.id !== undefined) &&
		mainUserInfo?.id === section?.creator?.id;
	const isOwner =
		isCreatorById ||
		sectionUserRoleAndAuthority?.role === UserSectionRole.CREATOR;
	const ownershipResolved =
		mainUserInfo !== undefined &&
		(isCreatorById || isRoleFetched || isRoleError);

	const closeMobileMenu = () => {
		setShowMobileMenu(false);
	};

	const openMobilePanel = (panel: Exclude<MobilePanel, null>) => {
		setShowMobileMenu(false);
		window.setTimeout(() => {
			setMobilePanel(panel);
		}, 180);
	};

	const mobilePanelMeta =
		mobilePanel === 'info'
			? {
					title: t('section_mobile_info_title'),
					description: t('section_mobile_info_description'),
			  }
			: mobilePanel === 'graph'
				? {
						title: t('section_graph'),
						description: t('section_graph_description'),
				  }
				: {
						title: t('section_mobile_media_title'),
						description: t('section_mobile_media_description'),
				  };

	const renderMobilePanelAction = ({
		icon: Icon,
		label,
		onClick,
	}: {
		icon: typeof Info;
		label: string;
		onClick: () => void;
	}) => {
		return (
			<Button
				variant='ghost'
				className={mobileActionButtonClassName}
				onClick={onClick}>
				<Icon />
				<span className='truncate'>{label}</span>
			</Button>
		);
	};

	if (!section) {
		return null;
	}

	const desktopActions = [
		<SectionOperateComment
			key='comment'
			section_id={id}
			className={desktopIconButtonClassName}
			iconOnly
		/>,
		<SectionOperateAI
			key='ai'
			section_id={id}
			section_title={section.title}
			disabled={!section.md_file_name && section.documents_count === 0}
			className={desktopIconButtonClassName}
			iconOnly
		/>,
		<SectionDocument
			key='documents'
			section_id={id}
			className={desktopIconButtonClassName}
			iconOnly
		/>,
		...(ownershipResolved
			? isOwner
				? [
						<SectionOperateProcess
							key='process'
							section_id={id}
							className={desktopIconButtonClassName}
							iconOnly
						/>,
						<SectionOperateShare
							key='share'
							section_id={id}
							className={desktopIconButtonClassName}
							showPublishBadge={false}
							iconOnly
						/>,
						<SectionOperateDelete
							key='delete'
							section_id={id}
							className={desktopIconButtonClassName}
							iconOnly
						/>,
						<SectionOperateConfiguration
							key='config'
							section_id={id}
							className={desktopIconButtonClassName}
							iconOnly
						/>,
					]
				: [
						<SectionOperateSubscribe
							key='subscribe'
							section_id={id}
							className={desktopIconButtonClassName}
							iconOnly
						/>,
					]
			: []),
	];

	if (isCompactViewport) {
		return (
			<>
				<Drawer open={showMobileMenu} onOpenChange={setShowMobileMenu}>
					<DrawerTrigger asChild>
						<Button
							size='icon'
							className={cn(
								'size-14 rounded-full border border-border/70 bg-card/92 text-foreground shadow-[0_24px_50px_-26px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-card/78 dark:bg-background/80 dark:supports-[backdrop-filter]:bg-background/65',
								className,
							)}>
							<Menu className='size-5 text-foreground' />
							<span className='sr-only'>{t('section_action_menu_title')}</span>
						</Button>
					</DrawerTrigger>
					<DrawerContent className='rounded-t-[32px] border-border/70 bg-background/96 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-32px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/88 dark:bg-background/92'>
						<DrawerHeader className='items-start px-4 pb-3 pt-2 text-left'>
							<DrawerTitle className='text-lg tracking-tight'>
								{t('section_action_menu_title')}
							</DrawerTitle>
							<DrawerDescription className='text-left max-w-[28rem] text-sm leading-6 text-muted-foreground/90'>
								{t('section_action_menu_description')}
							</DrawerDescription>
						</DrawerHeader>

						<div className='space-y-4 px-4'>
							<div className='space-y-2 border-t border-border/60 pt-4'>
								<p className='px-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
									{t('section_mobile_menu_section_browse')}
								</p>
								<div className='grid grid-cols-2 gap-2.5'>
									{renderMobilePanelAction({
										icon: Info,
										label: t('section_mobile_info_title'),
										onClick: () => openMobilePanel('info'),
									})}
									{renderMobilePanelAction({
										icon: GitBranch,
										label: t('section_graph'),
										onClick: () => openMobilePanel('graph'),
									})}
									{renderMobilePanelAction({
										icon: AudioLines,
										label: t('section_mobile_media_title'),
										onClick: () => openMobilePanel('media'),
									})}
								</div>
							</div>

							<div className='space-y-2 border-t border-border/60 pt-4'>
								<p className='px-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
									{t('section_mobile_menu_section_actions')}
								</p>
								<div className='grid grid-cols-2 gap-2.5'>
									<SectionOperateComment
										section_id={id}
										className={mobileActionButtonClassName}
									/>
									<SectionOperateAI
										section_id={id}
										section_title={section.title}
										disabled={!section.md_file_name && section.documents_count === 0}
										className={mobileActionButtonClassName}
									/>
									<SectionDocument
										section_id={id}
										className={mobileActionButtonClassName}
									/>
									{ownershipResolved ? (
										isOwner ? (
										<>
											<SectionOperateProcess
												section_id={id}
												className={mobileActionButtonClassName}
												onTriggerClick={closeMobileMenu}
											/>
											<SectionOperateShare
												section_id={id}
												className={mobileActionButtonClassName}
												showPublishBadge={false}
											/>
											<SectionOperateConfiguration
												section_id={id}
												className={mobileActionButtonClassName}
											/>
											<SectionOperateDelete
												section_id={id}
												className={mobileActionButtonClassName}
											/>
										</>
										) : (
										<SectionOperateSubscribe
											section_id={id}
											className={mobileActionButtonClassName}
											onTriggerClick={closeMobileMenu}
										/>
										)
									) : null}
								</div>
							</div>
						</div>
					</DrawerContent>
				</Drawer>

				<Sheet
					open={mobilePanel !== null}
					onOpenChange={(open) => {
						if (!open) {
							setMobilePanel(null);
						}
					}}>
					<SheetContent
						side='bottom'
						className='flex h-[86dvh] flex-col gap-0 rounded-t-[32px] border-border/70 bg-background/96 pt-0 shadow-[0_-24px_60px_-32px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/88 dark:bg-background/92'>
						<SheetHeader className='border-b border-border/60 px-5 pb-3 pt-6 text-left'>
							<SheetTitle className='text-xl tracking-tight'>
								{mobilePanelMeta.title}
							</SheetTitle>
							<SheetDescription className='max-w-md text-sm leading-6'>
								{mobilePanelMeta.description}
							</SheetDescription>
						</SheetHeader>
						<div className='min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.06),transparent_28%),radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_24%)] px-4 py-4 sm:px-5 sm:py-5'>
							{mobilePanel === 'info' ? (
								<SectionInfo id={id} />
							) : mobilePanel === 'graph' ? (
								<div className='h-full min-h-[420px] overflow-hidden rounded-[28px] border border-border/60 bg-background/50'>
									<SectionGraph section_id={id} />
								</div>
							) : (
								<SectionMedia section_id={id} />
							)}
						</div>
					</SheetContent>
				</Sheet>
			</>
		);
	}

	return (
		<div
			className={cn(desktopDockClassName, className)}
			style={{
				gridTemplateColumns: `repeat(${Math.max(desktopActions.length, 1)}, minmax(0, 1fr))`,
			}}>
			{desktopActions}
		</div>
	);
};

export default SectionOperate;
