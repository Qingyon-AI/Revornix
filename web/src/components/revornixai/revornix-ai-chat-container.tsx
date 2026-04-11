'use client';

import { useRef } from 'react';
import ChatHistory from './chat-history';
import MessageCard from './message-card';
import MessageSendForm from './message-send-form';
import CreateSessionButton from './create-session-button';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
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
	const messageEndRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!mainUserInfo?.id) return;
		bindUserScope(mainUserInfo.id);
	}, [mainUserInfo?.id, bindUserScope]);

	const isAtBottom = () => {
		const el = containerRef.current;
		if (!el) return true;

		return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
	};

	useEffect(() => {
		if (!isAtBottom()) return;

		messageEndRef.current?.scrollIntoView({
			behavior: 'auto',
		});
	}, [currentSession?.messages?.at(-1)?.content]);

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
		<div className='flex h-full min-h-0 flex-col'>
			<div className='shrink-0 border-b border-border/60 px-4 py-3 sm:px-5 sticky top-0 z-30 backdrop-blur'>
				<div className='flex flex-col gap-3 lg:flex-row items-center lg:justify-between'>
					<div className='min-w-0 flex-1'>
						<div className='flex min-w-0 items-center gap-3'>
							<div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
								<BotIcon className='size-4.5' />
							</div>
							<div className='min-w-0'>
								<div className='flex flex-wrap items-center gap-2'>
									<div className='truncate text-base font-semibold tracking-tight'>
										{currentSessionTitle}
									</div>
									{currentSession?.model_name ? (
										<div className='rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground'>
											{currentSession.model_name}
										</div>
									) : null}
								</div>
								<div className='mt-1 line-clamp-2 text-sm text-muted-foreground'>
									{currentSessionPreview}
								</div>
							</div>
						</div>
					</div>
					<div className='flex flex-row gap-2'>
						{isMobile ? (
							<ChatHistory compactTrigger showCreateAction />
						) : (
							<>
								<CreateSessionButton
									label={t('revornix_ai_new_session')}
									className='min-w-[9.5rem]'
								/>
								<ChatHistory />
							</>
						)}
					</div>
				</div>
			</div>
			<div
				ref={containerRef}
				className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5'>
				{currentSession?.messages && currentSession.messages.length > 0 ? (
					<div className='flex w-full flex-col gap-3'>
						{currentSession.messages.map((message, index) => {
							const isLastMessage =
								index === currentSession.messages.length - 1;

							return (
								<div
									key={index}
									ref={isLastMessage ? messageEndRef : undefined}>
									<MessageCard message={message} />
								</div>
							);
						})}
					</div>
				) : (
					<div className='flex h-full min-h-full items-center justify-center'>
						<div className='w-full max-w-lg'>
							<div className='max-w-lg rounded-[28px] border border-dashed border-border/70 bg-background px-8 py-10 text-center shadow-sm'>
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
			<div className='sticky bottom-0 z-10 shrink-0 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/88'>
				<MessageSendForm />
			</div>
		</div>
	);
};

export default RevornixAI;
