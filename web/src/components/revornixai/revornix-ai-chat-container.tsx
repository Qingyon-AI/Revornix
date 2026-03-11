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
import { BotIcon, Sparkles } from 'lucide-react';

const RevornixAI = () => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
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

	return (
		<>
			<div className='flex h-full w-full flex-col gap-4 px-5 pb-5'>
				<div className='relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-sky-500/5 p-4 shadow-[0_22px_56px_-34px_rgba(15,23,42,0.28)]'>
					<div className='pointer-events-none absolute inset-0'>
						<div className='absolute left-0 top-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl' />
						<div className='absolute right-0 top-4 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl' />
					</div>
					<div className='relative flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between'>
						<div className='flex items-start gap-3'>
							<div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm'>
								<BotIcon className='size-4.5' />
							</div>
							<div className='space-y-1'>
								<div className='flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground'>
									<Sparkles className='size-3' />
									<span>{t('website_title')}</span>
								</div>
								<h1 className='text-lg font-semibold tracking-tight md:text-xl'>
									{t('revornix_ai_title')}
								</h1>
								<div className='text-sm text-muted-foreground'>
									{t('revornix_ai_base_knowledge')}
								</div>
							</div>
						</div>
						<div className='flex items-center gap-2.5'>
							<CreateSessionButton />
							<ChatHistory />
						</div>
					</div>
				</div>
				<div className='relative flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm'>
					<div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-500/5 to-transparent' />
					<div
						ref={containerRef}
						className='relative h-full overflow-auto'>
						<div className='flex flex-col gap-3'>
							{currentSession?.messages &&
								currentSession?.messages.map((message, index) => {
									return <MessageCard key={index} message={message} />;
								})}
							<div ref={messageEndRef} />
						</div>
					</div>
				</div>
				<MessageSendForm />
			</div>
		</>
	);
};

export default RevornixAI;
