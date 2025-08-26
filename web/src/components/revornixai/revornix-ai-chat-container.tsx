'use client';

import { useEffect, useRef } from 'react';
import ChatHistory from './chat-history';
import { useAIChatContext } from '@/provider/ai-chat-provider';
import MessageCard from './message-card';
import MessageSendForm from './message-send-form';
import CreateSessionButton from './create-session-button';
import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { Loader2 } from 'lucide-react';

const RevornixAI = () => {
	const t = useTranslations();
	const {
		aiStatus,
		tempMessages,
		currentSessionId,
		_hasHydrated,
		updateSessionMessages,
	} = useAIChatContext();

	const messageEndRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [tempMessages()]);

	useEffect(() => {
		currentSessionId &&
			_hasHydrated &&
			tempMessages().length !== 0 &&
			updateSessionMessages(currentSessionId, tempMessages());
	}, [tempMessages(), currentSessionId]);

	return (
		<>
			<div className='px-5 pb-5 flex flex-col h-full gap-5'>
				<div className='flex flex-row justify-between items-center'>
					<div className='flex flex-col gap-1'>
						<div className='flex flex-row gap-2 items-center'>
							<span className='font-bold text-xl'>
								{t('revornix_ai_title')}
							</span>
							{aiStatus && aiStatus !== 'done' && (
								<>
									<Badge variant={'secondary'}>{aiStatus}</Badge>
									<Loader2
										className='animate-spin text-muted-foreground'
										size={14}
									/>
								</>
							)}
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
				<div className='flex-1 grid grid-cols-12 gap-5 overflow-auto'>
					<div className={`overflow-auto flex-1 col-span-12`}>
						<div className='flex flex-col gap-2'>
							{tempMessages() &&
								tempMessages().map((message, index) => {
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
