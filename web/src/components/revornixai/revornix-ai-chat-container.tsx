'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { BotIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentChatStore } from '@/store/agent-chat';
import AgentMessageCard, { AgentTimeline } from './agent-message-card';
import AgentSendForm from './agent-send-form';
import AgentSessionList from './agent-session-list';
import AgentConfirmations from './agent-confirmations';

const RevornixAI = () => {
	const t = useTranslations();
	const currentSession = useAgentChatStore((s) => s.currentSession);
	const currentSessionId = useAgentChatStore((s) => s.currentSessionId);
	const messages = useAgentChatStore((s) => s.messages);
	const stream = useAgentChatStore((s) => s.stream);
	const messagesLoading = useAgentChatStore((s) => s.messagesLoading);
	const selectSession = useAgentChatStore((s) => s.selectSession);
	const newSession = useAgentChatStore((s) => s.newSession);
	const loadSessions = useAgentChatStore((s) => s.loadSessions);

	const containerRef = useRef<HTMLDivElement | null>(null);
	const shouldStickToBottomRef = useRef(true);
	const scrollFrameRef = useRef<number | null>(null);

	// 进场:拉会话列表;没有当前会话就开一个新的(或选中最近一个)。
	useEffect(() => {
		void (async () => {
			await loadSessions();
			if (useAgentChatStore.getState().currentSessionId !== null) return;
			const sessions = useAgentChatStore.getState().sessions;
			if (sessions.length > 0) {
				await selectSession(sessions[0].id);
			} else {
				await newSession();
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isNearBottom = useCallback(() => {
		const el = containerRef.current;
		if (!el) return true;
		return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
	}, []);

	const handleScroll = useCallback(() => {
		shouldStickToBottomRef.current = isNearBottom();
	}, [isNearBottom]);

	const scrollToBottom = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, []);

	useLayoutEffect(() => {
		shouldStickToBottomRef.current = true;
	}, [currentSessionId]);

	useLayoutEffect(() => {
		if (!shouldStickToBottomRef.current) return;
		scrollToBottom();
		if (scrollFrameRef.current !== null) {
			window.cancelAnimationFrame(scrollFrameRef.current);
		}
		scrollFrameRef.current = window.requestAnimationFrame(() => {
			scrollToBottom();
			scrollFrameRef.current = null;
		});
	}, [
		currentSessionId,
		messages.length,
		stream?.text,
		stream?.timeline?.length,
		scrollToBottom,
	]);

	useEffect(() => {
		return () => {
			if (scrollFrameRef.current !== null) {
				window.cancelAnimationFrame(scrollFrameRef.current);
			}
		};
	}, []);

	/**
	 * **流式气泡一直留到重取落地为止**,判据是 `stream` 在不在,而不是 `stream.done`。
	 *
	 * 那一帧 done 为真、而正式消息还没到:sidecar 发完最后一帧就关流,store 的 onDone 要
	 * 先 `await` 三个接口(会话/消息/队列)才把 `stream` 置空并换上正式气泡。以 `!stream.done`
	 * 为判据的话,这段网络往返里**两边都没有东西可渲染** —— 刚写完的那段回答整段消失,
	 * 等重取回来再冒出来。用户看到的就是"答完闪一下"。
	 *
	 * store 那边本来就是**同一个 `set()`** 里换的(stream 置空与 messages 落地同帧),
	 * 所以只要这里别提前把它藏起来,切换就是无缝的。
	 */
	const hasContent = messages.length > 0 || Boolean(stream);

	return (
		<div className='flex h-[calc(100dvh-var(--private-top-header-height,3.5rem))] max-h-[calc(100dvh-var(--private-top-header-height,3.5rem))] min-h-0 flex-col overflow-hidden'>
			<div className='sticky top-0 z-30 shrink-0 border-b border-border/60 px-3 py-2.5 backdrop-blur sm:px-5 sm:py-3'>
				<div className='flex items-center justify-between gap-3'>
					<div className='flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3'>
						<div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:size-9 sm:rounded-xl'>
							<BotIcon className='size-4 sm:size-4.5' />
						</div>
						<div className='min-w-0'>
							<div className='truncate text-sm font-semibold tracking-tight sm:text-base'>
								{currentSession?.title ?? t('revornix_ai_new_session')}
							</div>
							<div className='mt-0.5 text-xs text-muted-foreground'>
								{currentSession?.status === 'running'
									? t('agent_session_running')
									: t('revornix_ai_title')}
							</div>
						</div>
					</div>
					{/* 上下文水位与「立即整理」搬进了输入框那一行的设置弹层 —— 它们是同一件事的
					    两半(看还剩多少、据此决定要不要整理),钉在页头时离那颗按钮隔着半个屏幕。 */}
					<div className='flex shrink-0 items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							className='gap-1.5'
							onClick={() => void newSession()}>
							<PlusIcon className='size-4' />
							<span className='hidden sm:inline'>
								{t('revornix_ai_new_session')}
							</span>
						</Button>
						<AgentSessionList />
					</div>
				</div>
			</div>
			<div
				ref={containerRef}
				onScroll={handleScroll}
				className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5'>
				{hasContent ? (
					<div className='mx-auto flex w-full max-w-3xl flex-col gap-3'>
						{messages.map((message) => (
							<AgentMessageCard key={message.id} message={message} />
						))}
						{stream && (
							<AgentMessageCard
								streamTimeline={stream.timeline}
								streamText={stream.text}
							/>
						)}
					</div>
				) : (
					<div className='flex h-full min-h-full items-center justify-center'>
						<div className='w-full max-w-lg'>
							<div className='max-w-lg px-8 py-10 text-center'>
								<div className='mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground'>
									<BotIcon className='size-6' />
								</div>
								<h2 className='text-lg font-semibold tracking-tight'>
									{t('revornix_ai_empty_session_title')}
								</h2>
								<p className='mt-2 text-sm leading-7 text-muted-foreground'>
									{t('revornix_ai_empty_session_description')}
								</p>
								{messagesLoading && (
									<p className='mt-2 text-xs text-muted-foreground'>…</p>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
			<AgentConfirmations />
			<div className='sticky bottom-0 z-10 shrink-0 bg-transparent'>
				<div className='mx-auto w-full max-w-3xl px-3 pb-[env(safe-area-inset-bottom)] sm:px-0 sm:pb-2'>
					<AgentSendForm />
				</div>
			</div>
		</div>
	);
};

export default RevornixAI;
