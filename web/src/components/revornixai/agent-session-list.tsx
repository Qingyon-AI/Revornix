'use client';

/**
 * 会话列表:服务端持久化的会话,搜索 + 选择 + 删除。
 *
 * **桌面从右侧推出,手机仍然从底部。** 会话列表是"挑一条继续聊"的侧栏,不是一次性的确认动作 ——
 * 在宽屏上从底部顶起半张屏幕,会把正在读的那段回答整个盖掉,而用户挑会话时往往正想对照着看。
 * 手机上没有"右侧"可言(推出来就是全屏),底部抽屉反而是原生手势,所以两边用各自合适的那个壳,
 * 列表本身只写一份。
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { HistoryIcon, Loader2Icon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
	SheetTrigger,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useAgentChatStore } from '@/store/agent-chat';

/** 搜索框 + 列表本身。壳(Sheet / Drawer)之外的一切都在这里,两条路径共用。 */
const SessionListBody = ({ onPicked }: { onPicked: () => void }) => {
	const t = useTranslations();
	const [keyword, setKeyword] = useState('');
	const sessions = useAgentChatStore((s) => s.sessions);
	const currentSessionId = useAgentChatStore((s) => s.currentSessionId);
	const sessionsLoading = useAgentChatStore((s) => s.sessionsLoading);
	const loadSessions = useAgentChatStore((s) => s.loadSessions);
	const selectSession = useAgentChatStore((s) => s.selectSession);
	const newSession = useAgentChatStore((s) => s.newSession);
	const removeSession = useAgentChatStore((s) => s.removeSession);

	return (
		<div className='flex min-h-0 flex-1 flex-col gap-2 px-4 pb-6'>
			<div className='flex items-center gap-2'>
				<Input
					value={keyword}
					onChange={(event) => setKeyword(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') void loadSessions(keyword || undefined);
					}}
					placeholder={t('revornix_ai_history_search_placeholder')}
				/>
				<Button
					size='sm'
					variant='outline'
					onClick={() => void loadSessions(keyword || undefined)}>
					{t('search_global')}
				</Button>
			</div>
			<Button
				size='sm'
				variant='outline'
				className='justify-start gap-1.5'
				onClick={async () => {
					await newSession();
					onPicked();
				}}>
				<PlusIcon className='size-4' />
				{t('revornix_ai_new_session')}
			</Button>
			<div className='flex min-h-0 flex-1 flex-col gap-1 overflow-auto'>
				{sessionsLoading && (
					<div className='flex justify-center py-6'>
						<Loader2Icon className='size-4 animate-spin text-muted-foreground' />
					</div>
				)}
				{!sessionsLoading && sessions.length === 0 && (
					<div className='py-6 text-center text-sm text-muted-foreground'>
						{t('revornix_ai_history_empty_title')}
					</div>
				)}
				{sessions.map((session) => (
					<div
						key={session.id}
						className={cn(
							'group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted/60',
							session.id === currentSessionId && 'bg-muted',
						)}>
						<button
							type='button'
							className='min-w-0 flex-1 text-left'
							onClick={async () => {
								await selectSession(session.id);
								onPicked();
							}}>
							<div className='truncate text-sm font-medium'>{session.title}</div>
							<div className='mt-0.5 text-[11px] text-muted-foreground'>
								{session.status === 'running'
									? t('agent_session_running')
									: (session.update_time ?? session.create_time)}
							</div>
						</button>
						<Button
							type='button'
							size='sm'
							variant='ghost'
							/* 触屏没有 hover,删除键靠 group-hover 显形等于在手机上不存在。 */
							className='h-7 w-7 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
							onClick={async () => {
								await removeSession(session.id);
							}}
							title={t('delete')}>
							<Trash2Icon className='size-3.5 text-muted-foreground' />
						</Button>
					</div>
				))}
			</div>
		</div>
	);
};

const AgentSessionList = () => {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const isMobile = useIsMobile();

	const trigger = (
		<Button variant='outline' size='sm' className='gap-1.5'>
			<HistoryIcon className='size-4' />
			<span className='hidden sm:inline'>{t('revornix_ai_history_sessions')}</span>
		</Button>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTrigger asChild>{trigger}</DrawerTrigger>
				<DrawerContent className='max-h-[85dvh]'>
					<DrawerHeader>
						<DrawerTitle>{t('revornix_ai_history_sessions')}</DrawerTitle>
						<DrawerDescription>
							{t('revornix_ai_history_sessions_description')}
						</DrawerDescription>
					</DrawerHeader>
					<SessionListBody onPicked={() => setOpen(false)} />
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>{trigger}</SheetTrigger>
			<SheetContent side='right' className='w-[380px] gap-0 sm:max-w-[380px]'>
				<SheetHeader>
					<SheetTitle>{t('revornix_ai_history_sessions')}</SheetTitle>
					<SheetDescription>
						{t('revornix_ai_history_sessions_description')}
					</SheetDescription>
				</SheetHeader>
				<SessionListBody onPicked={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
};

export default AgentSessionList;
