'use client';

import { useEffect, useRef } from 'react';
import { Separator } from '@/components/ui/separator';
import ChatHistory from './chat-history';
import { useAIChatContext } from '@/provider/ai-chat-provider';
import MessageCard from './message-card';
import MessageSendForm from './message-send-form';
import CreateSessionButton from './create-session-button';

const RevornixAI = () => {
	const {
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
							<span className='font-bold text-xl'>Link AI</span>
						</div>
						<div className='text-xs text-muted-foreground'>
							基于你的知识库来回答。
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
