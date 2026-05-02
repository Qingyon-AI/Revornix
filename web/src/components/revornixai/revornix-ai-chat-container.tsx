'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import ChatHistory from './chat-history';
import MessageCard from './message-card';
import MessageSendForm from './message-send-form';
import CreateSessionButton from './create-session-button';
import { useTranslations } from 'next-intl';
import { useAiChatStore } from '@/store/ai-chat';
import { useUserContext } from '@/provider/user-provider';
import { useIsMobile } from '@/hooks/use-mobile';
import { BotIcon } from 'lucide-react';

const RevornixAI = () => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const isMobile = useIsMobile();
	const ownerUserId = useAiChatStore((s) => s.ownerUserId);
	const bindUserScope = useAiChatStore((s) => s.bindUserScope);
	const currentSession = useAiChatStore((s) => s.currentSession());

	const containerRef = useRef<HTMLDivElement | null>(null);
	const shouldStickToBottomRef = useRef(true);
	const scrollFrameRef = useRef<number | null>(null);

	useEffect(() => {
		if (!mainUserInfo?.id) return;
		bindUserScope(mainUserInfo.id);
	}, [mainUserInfo?.id, bindUserScope]);

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
	}, [currentSession?.id]);

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
		currentSession?.id,
		currentSession?.messages?.length,
		currentSession?.messages?.at(-1)?.content,
		currentSession?.messages?.at(-1)?.ai_state?.phase,
		currentSession?.messages?.at(-1)?.ai_workflow?.length,
		scrollToBottom,
	]);

	useEffect(() => {
		return () => {
			if (scrollFrameRef.current !== null) {
				window.cancelAnimationFrame(scrollFrameRef.current);
			}
		};
	}, []);

	if (mainUserInfo?.id && ownerUserId !== mainUserInfo.id) {
		return null;
	}

	const currentSessionTitle =
		currentSession && currentSession.message_count > 0
			? currentSession.title
			: t('revornix_ai_new_session');
	const currentSessionPreview =
		currentSession && currentSession.message_count > 0
			? currentSession.preview || t('revornix_ai_empty_session_description')
			: t('revornix_ai_empty_session_description');

	return (
		<div className='flex h-[calc(100dvh-var(--private-top-header-height,3.5rem))] max-h-[calc(100dvh-var(--private-top-header-height,3.5rem))] min-h-0 flex-col overflow-hidden'>
			<div className='sticky top-0 z-30 shrink-0 border-b border-border/60 px-3 py-2.5 backdrop-blur sm:px-5 sm:py-3'>
				<div className='flex items-start justify-between gap-3'>
					<div className='min-w-0 flex-1'>
						<div className='flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3'>
							<div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:size-9 sm:rounded-xl'>
								<BotIcon className='size-4 sm:size-4.5' />
							</div>
							<div className='min-w-0'>
								<div className='flex min-w-0 items-center gap-2'>
									<div className='truncate text-sm font-semibold tracking-tight sm:text-base'>
										{currentSessionTitle}
									</div>
									{currentSession?.model_name ? (
										<div className='shrink-0 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px] text-muted-foreground sm:px-2.5 sm:py-1 sm:text-xs'>
											{currentSession.model_name}
										</div>
									) : null}
								</div>
								<div className='mt-0.5 line-clamp-1 text-xs leading-5 text-muted-foreground sm:mt-1 sm:line-clamp-2 sm:text-sm'>
									{currentSessionPreview}
								</div>
							</div>
						</div>
					</div>
					<div className='flex shrink-0 flex-row gap-2'>
						{isMobile ? (
							<ChatHistory compactTrigger showCreateAction />
						) : (
							<>
								<CreateSessionButton label={t('revornix_ai_new_session')} />
								<ChatHistory />
							</>
						)}
					</div>
				</div>
			</div>
			<div
				ref={containerRef}
				onScroll={handleScroll}
				className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5'>
				{currentSession?.messages && currentSession.messages.length > 0 ? (
					<div className='mx-auto flex w-full max-w-3xl flex-col gap-3'>
						{currentSession.messages.map((message, index) => {
							return (
								<div key={index}>
									<MessageCard message={message} />
								</div>
							);
						})}
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
							</div>
						</div>
					</div>
				)}
			</div>
			<div className='sticky bottom-0 z-10 shrink-0 bg-transparent'>
				<div className='mx-auto w-full max-w-3xl pb-[env(safe-area-inset-bottom)] px-3 sm:px-0 sm:pb-0'>
					<MessageSendForm />
				</div>
			</div>
		</div>
	);
};

export default RevornixAI;
