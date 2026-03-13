import {
	BotIcon,
	Clock5,
	DatabaseZap,
	History,
	Menu,
	MessageSquareText,
	PlusIcon,
	Search,
	Sparkles,
	Trash2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer';
import { Badge } from '../ui/badge';
import { useMemo, useState } from 'react';
import { useAiChatStore } from '@/store/ai-chat';
import { cloneDeep } from 'lodash-es';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useLocale, useTranslations } from 'next-intl';
import { zhCN } from 'date-fns/locale/zh-CN';
import { SessionItem } from '@/types/ai';
import { createEmptySession, sortSessionsByRecent } from '@/lib/ai-session';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const ChatHistory = ({
	compactTrigger = false,
	showCreateAction = false,
}: {
	compactTrigger?: boolean;
	showCreateAction?: boolean;
}) => {
	const t = useTranslations();
	const locale = useLocale();
	const isMobile = useIsMobile();
	const sessions = useAiChatStore((state) => state.sessions);
	const deleteSession = useAiChatStore((state) => state.deleteSession);
	const setCurrentSessionId = useAiChatStore(
		(state) => state.setCurrentSessionId
	);
	const addSession = useAiChatStore((state) => state.addSession);
	const currentSessionId = useAiChatStore((state) => state.currentSessionId);
	const [showHistory, setShowHistory] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const getSessionTitle = (session: SessionItem) => {
		return session.message_count > 0
			? session.title
			: t('revornix_ai_new_session');
	};

	const getSessionPreview = (session: SessionItem) => {
		if (session.message_count === 0) {
			return t('revornix_ai_empty_session_description');
		}

		return session.preview || t('revornix_ai_history_empty_description');
	};

	const sortedSessions = useMemo(() => {
		return sortSessionsByRecent(sessions);
	}, [sessions]);
	const filteredSessions = useMemo(() => {
		const normalizedSearch = searchQuery.trim().toLowerCase();
		if (!normalizedSearch) {
			return sortedSessions;
		}

		return sortedSessions.filter((session) => {
			const searchableParts = [
				getSessionTitle(session),
				getSessionPreview(session),
				session.model_name,
				...session.messages.map((message) => message.content),
			];

			return searchableParts.some((part) =>
				(part ?? '').toLowerCase().includes(normalizedSearch),
			);
		});
	}, [searchQuery, sortedSessions]);

	const handleCreateNewSession = () => {
		const newSession = createEmptySession();
		addSession(newSession);
		setCurrentSessionId(newSession.id);
		setShowHistory(false);
	};

	const handleSwitchSession = (session: SessionItem) => {
		setCurrentSessionId(session.id);
		setShowHistory(false);
	};

	const handleDeleteSession = (session: SessionItem) => {
		const originSessions = cloneDeep(sessions);
		deleteSession(session.id);
		if (session.id === currentSessionId) {
			if (originSessions.length > 1) {
				const nextSession = sortSessionsByRecent(
					originSessions.filter((item) => item.id !== session.id),
				)[0];
				if (nextSession) {
					handleSwitchSession(nextSession);
				} else {
					handleCreateNewSession();
				}
			} else {
				handleCreateNewSession();
			}
		}
	};

	const handleOpenChange = (open: boolean) => {
		setShowHistory(open);
		if (!open) {
			setSearchQuery('');
		}
	};
	const trigger = compactTrigger && isMobile ? (
		<Button
			variant='outline'
			size='icon'
			className='size-10 rounded-2xl border-border/60 bg-background/70 shadow-sm'
			aria-label={t('revornix_ai_mobile_menu')}>
			<Menu className='size-4.5' />
		</Button>
	) : (
		<Button
			variant='outline'
			className='rounded-2xl border-border/60 bg-background/70 shadow-sm'>
			{t('revornix_ai_history_sessions')}
			<History />
		</Button>
	);

	const content = (
		<>
			<div className='border-b border-border/60 px-5 py-3'>
				<div className='relative'>
					<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={t('revornix_ai_history_search_placeholder')}
						className='h-10 rounded-2xl border-border/60 bg-background/70 pl-9 pr-3 text-sm shadow-none'
					/>
				</div>
			</div>
			{showCreateAction ? (
				<div className='border-b border-border/60 px-5 py-3'>
					<Button
						onClick={handleCreateNewSession}
						className='h-11 w-full rounded-2xl bg-foreground text-background shadow-[0_18px_36px_-28px_rgba(15,23,42,0.68)] hover:bg-foreground/90'>
						{t('revornix_ai_add_session')}
						<PlusIcon className='size-4' />
					</Button>
				</div>
			) : null}
			<div className='flex-1 overflow-auto px-4 py-4'>
				{sortedSessions.length === 0 ? (
					<div className='flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-background/55 px-6 text-center'>
						<div className='max-w-sm'>
							<div className='mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-foreground text-background'>
								<BotIcon className='size-6' />
							</div>
							<h3 className='text-lg font-semibold tracking-tight'>
								{t('revornix_ai_history_empty_title')}
							</h3>
							<p className='mt-2 text-sm leading-7 text-muted-foreground'>
								{t('revornix_ai_history_empty_description')}
							</p>
						</div>
					</div>
				) : filteredSessions.length === 0 ? (
					<div className='flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/55 px-6 text-center'>
						<div className='max-w-sm'>
							<div className='mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-background/80 text-foreground'>
								<Search className='size-5' />
							</div>
							<h3 className='text-base font-semibold tracking-tight'>
								{t('revornix_ai_history_search_empty_title')}
							</h3>
							<p className='mt-2 text-sm leading-6 text-muted-foreground'>
								{t('revornix_ai_history_search_empty_description')}
							</p>
						</div>
					</div>
				) : (
					<div className='flex flex-col gap-2'>
						{filteredSessions.map((session) => {
							const isActive = session.id === currentSessionId;
							const timeLocale = locale === 'zh' ? zhCN : enUS;
							return (
								<div
									key={session.id}
									role='button'
									tabIndex={0}
									aria-pressed={isActive}
									onClick={() => {
										handleSwitchSession(session);
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleSwitchSession(session);
										}
									}}
									className={cn(
										'group w-full cursor-pointer rounded-[22px] border px-3.5 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
										isActive
											? 'border-foreground/20 bg-foreground/[0.04] shadow-[0_20px_44px_-42px_rgba(15,23,42,0.55)]'
											: 'border-border/60 bg-background/72 hover:border-border hover:bg-background/88',
									)}>
									<div className='flex items-start justify-between gap-3'>
										<div className='min-w-0 flex-1'>
											<div className='flex flex-wrap items-center gap-2'>
												<p className='line-clamp-1 text-sm font-semibold tracking-tight'>
													{getSessionTitle(session)}
												</p>
												{isActive ? (
													<Badge className='h-5 rounded-full px-2 text-[10px]'>
														{t('revornix_ai_current_session')}
													</Badge>
												) : null}
											</div>
											<p className='mt-1.5 line-clamp-1 text-xs leading-5 text-muted-foreground'>
												{getSessionPreview(session)}
											</p>
										</div>
										<Button
											size={'icon'}
											variant={'ghost'}
											className='size-8 shrink-0 rounded-xl border border-border/60 bg-background/70 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100'
											aria-label={t('delete')}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleDeleteSession(session);
											}}>
											<Trash2 className='size-4' />
										</Button>
									</div>
									<div className='mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground'>
										<div className='inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2 py-0.5'>
											<MessageSquareText className='size-3' />
											<span>{session.message_count}</span>
										</div>
										<div className='inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2 py-0.5'>
											<DatabaseZap className='size-3' />
											<span>{session.source_count}</span>
										</div>
										{session.model_name ? (
											<div className='inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2 py-0.5'>
												<span className='truncate'>{session.model_name}</span>
											</div>
										) : null}
									</div>
									<div className='mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80'>
										<div className='inline-flex items-center gap-1.5'>
											<Clock5 className='size-3' />
											<span>
												{t('revornix_ai_history_updated')} ·{' '}
												{formatDistanceToNow(new Date(session.updated_at), {
													addSuffix: true,
													locale: timeLocale,
												})}
											</span>
										</div>
										<div>
											{t('revornix_ai_history_created')} ·{' '}
											{format(new Date(session.created_at), 'MM-dd HH:mm')}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</>
	);

	if (isMobile) {
		return (
			<Drawer open={showHistory} onOpenChange={handleOpenChange}>
				<DrawerTrigger asChild>{trigger}</DrawerTrigger>
				<DrawerContent className='flex max-h-[85vh] flex-col gap-0 rounded-t-[28px] border-t border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-0 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.4)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.18),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))]'>
					<DrawerHeader className='border-b border-border/60 px-5 pb-4 pt-5 text-left'>
						<div className='space-y-2'>
							<div className='flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground'>
								<Sparkles className='size-3' />
								<span>{t('website_title')}</span>
							</div>
							<DrawerTitle className='text-xl tracking-tight'>
								{t('revornix_ai_history_sessions')}
							</DrawerTitle>
						</div>
						<DrawerDescription className='text-sm leading-6'>
							{t('revornix_ai_history_sessions_description')}
						</DrawerDescription>
					</DrawerHeader>
					{content}
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Sheet open={showHistory} onOpenChange={handleOpenChange}>
			<SheetTrigger asChild>{trigger}</SheetTrigger>
			<SheetContent className='flex w-[min(520px,100vw)] max-w-[min(520px,100vw)] flex-col gap-0 border-l border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-0 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.4)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.18),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))]'>
				<SheetHeader className='border-b border-border/60 px-5 pb-4 pt-6 text-left'>
					<div className='space-y-2'>
						<div className='flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground'>
							<Sparkles className='size-3' />
							<span>{t('website_title')}</span>
						</div>
						<SheetTitle className='text-xl tracking-tight'>
							{t('revornix_ai_history_sessions')}
						</SheetTitle>
					</div>
					<SheetDescription className='text-sm leading-6'>
						{t('revornix_ai_history_sessions_description')}
					</SheetDescription>
				</SheetHeader>
				{content}
			</SheetContent>
		</Sheet>
	);
};

export default ChatHistory;
