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
			<div className='px-5 pb-5 flex flex-col h-full gap-5'>
				{/* header */}
				<div className='flex flex-row justify-between items-center'>
					<div className='flex flex-col gap-1'>
						<div className='flex flex-row gap-2 items-center'>
							<span className='font-bold text-xl'>
								{t('revornix_ai_title')}
							</span>
						</div>
						<div className='text-xs text-muted-foreground'>
							{t('revornix_ai_base_knowledge')}
						</div>
					</div>
					<div className='flex items-center gap-5'>
						<CreateSessionButton />
						<ChatHistory />
					</div>
				</div>
				{/* messages */}
				<div className='flex-1 grid grid-cols-12 gap-5 overflow-auto'>
					<div
						ref={containerRef}
						className={`overflow-auto flex-1 col-span-12`}>
						<div className='flex flex-col gap-2'>
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
