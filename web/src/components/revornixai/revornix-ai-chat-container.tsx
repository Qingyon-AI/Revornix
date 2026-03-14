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
import {
	BotIcon,
	Sparkles,
} from 'lucide-react';

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
		<div className='mx-auto flex h-full min-h-0 w-full max-w-none flex-col gap-4 px-3 pb-4 sm:px-4 lg:px-5'>
			<div className='rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm sm:p-4'>
				<div className='flex items-center justify-between gap-3'>
					<div className='flex min-w-0 flex-1 items-center gap-3'>
						<div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
							<BotIcon className='size-4.5' />
						</div>
						<div className='min-w-0 space-y-1'>
							<div className='flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground'>
								<Sparkles className='size-3' />
								<span>{t('website_title')}</span>
							</div>
							<h1 className='text-lg font-semibold tracking-tight md:text-xl'>
								{t('revornix_ai_title')}
							</h1>
							<p className='max-w-2xl truncate pr-2 text-sm text-muted-foreground'>
								{t('revornix_ai_base_knowledge')}
							</p>
						</div>
					</div>
					<div className='flex shrink-0 items-center gap-2.5'>
						{isMobile ? (
							<ChatHistory compactTrigger showCreateAction />
						) : (
							<>
								<CreateSessionButton />
								<ChatHistory />
							</>
						)}
					</div>
				</div>
			</div>
			<div className='min-h-0 flex-1'>
				<div className='flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-border/60 bg-card shadow-sm'>
					<div className='flex h-full min-h-0 flex-col'>
						<div className='shrink-0 border-b border-border/60 px-4 py-3 sm:px-5'>
							<div className='flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between'>
								<div className='min-w-0'>
									<div className='truncate text-base font-semibold tracking-tight'>
										{currentSessionTitle}
									</div>
									<div className='mt-1 line-clamp-1 text-sm text-muted-foreground'>
										{currentSessionPreview}
									</div>
								</div>
								<div className='flex flex-wrap gap-2'>
									{currentSession?.model_name ? (
										<div className='rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground'>
											{currentSession.model_name}
										</div>
									) : null}
								</div>
							</div>
						</div>
						<div
							ref={containerRef}
							className='relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5'>
							{currentSession?.messages && currentSession.messages.length > 0 ? (
								<div className='flex w-full flex-col gap-3'>
									{currentSession.messages.map((message, index) => {
										return <MessageCard key={index} message={message} />;
									})}
									<div ref={messageEndRef} />
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
						<div className='shrink-0 border-t border-border/60 px-3 py-2 sm:px-4'>
							<MessageSendForm />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RevornixAI;
