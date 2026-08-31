'use client';

/** 会话列表:服务端持久化的会话,搜索 + 选择 + 删除。 */
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
import { cn } from '@/lib/utils';
import { useAgentChatStore } from '@/store/agent-chat';

const AgentSessionList = () => {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [keyword, setKeyword] = useState('');
	const sessions = useAgentChatStore((s) => s.sessions);
	const currentSessionId = useAgentChatStore((s) => s.currentSessionId);
	const sessionsLoading = useAgentChatStore((s) => s.sessionsLoading);
	const loadSessions = useAgentChatStore((s) => s.loadSessions);
	const selectSession = useAgentChatStore((s) => s.selectSession);
	const newSession = useAgentChatStore((s) => s.newSession);
	const removeSession = useAgentChatStore((s) => s.removeSession);

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button variant='outline' size='sm' className='gap-1.5'>
					<HistoryIcon className='size-4' />
					<span className='hidden sm:inline'>{t('revornix_ai_history_sessions')}</span>
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>{t('revornix_ai_history_sessions')}</DrawerTitle>
					<DrawerDescription>
						{t('revornix_ai_history_sessions_description')}
					</DrawerDescription>
				</DrawerHeader>
				<div className='flex flex-col gap-2 px-4 pb-6'>
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
						<Button
							size='sm'
							onClick={async () => {
								await newSession();
								setOpen(false);
							}}>
							<PlusIcon className='mr-1 size-4' />
							{t('revornix_ai_new_session')}
						</Button>
					</div>
					<div className='flex max-h-[50vh] flex-col gap-1 overflow-auto'>
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
										setOpen(false);
									}}>
									<div className='truncate text-sm font-medium'>
										{session.title}
									</div>
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
									className='h-7 w-7 p-0 opacity-0 group-hover:opacity-100'
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
			</DrawerContent>
		</Drawer>
	);
};

export default AgentSessionList;
