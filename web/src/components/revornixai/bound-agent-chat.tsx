'use client';

/**
 * 绑定到一篇文档 / 一个专栏的问答面板。
 *
 * 与 /revornix-ai 共用同一套会话体系(agent-chat store):文档页打开它,
 * 就是选中(或创建)那个绑定了 document_id/section_id 的会话 —— 对话在服务
 * 端持久化,从主对话页也能接着聊。
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { useAgentChatStore } from '@/store/agent-chat';
import AgentMessageCard from '@/components/revornixai/agent-message-card';
import AgentSendForm from '@/components/revornixai/agent-send-form';
import AgentConfirmations from '@/components/revornixai/agent-confirmations';

const BoundAgentChat = ({
	binding,
	emptyHint,
}: {
	binding: { document_id: number } | { section_id: number };
	emptyHint: string;
}) => {
	const messages = useAgentChatStore((s) => s.messages);
	const stream = useAgentChatStore((s) => s.stream);
	const currentSessionId = useAgentChatStore((s) => s.currentSessionId);
	const ensureBoundSession = useAgentChatStore((s) => s.ensureBoundSession);
	const [ready, setReady] = useState(false);
	const messageEndRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		setReady(false);
		void ensureBoundSession(binding).finally(() => setReady(true));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(binding)]);

	useEffect(() => {
		messageEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
	}, [messages.length, stream?.text, stream?.timeline?.length]);

	if (!ready || currentSessionId === null) {
		return (
			<div className='flex flex-1 items-center justify-center py-10'>
				<Loader2Icon className='size-4 animate-spin text-muted-foreground' />
			</div>
		);
	}

	return (
		<>
			<div className='flex-1 overflow-auto px-5 py-4'>
				{messages.length === 0 && !(stream && !stream.done) ? (
					<div className='rounded-xl border border-border/60 bg-card/65 px-4 py-3'>
						<div className='text-xs leading-5 text-muted-foreground'>{emptyHint}</div>
					</div>
				) : (
					<div className='flex flex-col gap-4'>
						{messages.map((message) => (
							<div
								key={message.id}
								className={message.role === 'user' ? 'pl-8' : ''}>
								<AgentMessageCard message={message} />
							</div>
						))}
						{stream && !stream.done && (
							<AgentMessageCard
								streamTimeline={stream.timeline}
								streamText={stream.text}
							/>
						)}
						<div ref={messageEndRef} />
					</div>
				)}
			</div>
			<AgentConfirmations />
			<div className='px-2 pb-2'>
				<AgentSendForm />
			</div>
		</>
	);
};

export default BoundAgentChat;
