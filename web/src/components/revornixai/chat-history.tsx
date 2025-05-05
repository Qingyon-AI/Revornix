import { Clock5, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useState } from 'react';
import { SessionItem, useAiChatStore } from '@/store/ai-chat';
import { cloneDeep } from 'lodash-es';
import { format } from 'date-fns';
import { useAIChatContext } from '@/provider/ai-chat-provider';
import { useTranslations } from 'next-intl';

const ChatHistory = () => {
	const t = useTranslations();
	const { setTempMessages } = useAIChatContext();
	const sessions = useAiChatStore((state) => state.sessions);
	const deleteSession = useAiChatStore((state) => state.deleteSession);
	const setCurrentSessionId = useAiChatStore(
		(state) => state.setCurrentSessionId
	);
	const addSession = useAiChatStore((state) => state.addSession);
	const currentSessionId = useAiChatStore((state) => state.currentSessionId);
	const [showHistory, setShowHistory] = useState(false);

	const handleCreateNewSession = () => {
		const newSession = {
			id: uuidv4(),
			title: format(new Date(), 'MM-dd HH:mm:ss'),
			messages: [],
		};
		addSession(newSession);
		setCurrentSessionId(newSession.id);
		setTempMessages([]);
	};

	const handleSwitchSesison = (session: SessionItem) => {
		setCurrentSessionId(session.id);
		setTempMessages(session.messages);
		setShowHistory(false);
	};

	const handleDeleteSession = (session: SessionItem) => {
		const originSessions = cloneDeep(sessions);
		deleteSession(session.id);
		if (session.id === currentSessionId) {
			if (originSessions.length > 1) {
				const nextSession = originSessions.find(
					(item) => item.id !== session.id
				);
				if (nextSession) {
					handleSwitchSesison(nextSession);
				} else {
					handleCreateNewSession();
				}
			} else {
				handleCreateNewSession();
			}
		}
	};
	return (
		<Sheet open={showHistory} onOpenChange={setShowHistory}>
			<SheetTrigger asChild>
				<Button variant='outline'>
					{t('revornix_ai_history_sessions')}
					<Clock5 />
				</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{t('revornix_ai_history_sessions')}</SheetTitle>
					<SheetDescription>
						{t('revornix_ai_history_sessions_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='px-3 flex flex-col gap-2 overflow-auto'>
					{sessions.map((session, index) => {
						return (
							<Card
								key={index}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleSwitchSesison(session);
								}}>
								<CardHeader>
									<CardTitle className='flex flex-row gap-2 justify-between items-center'>
										<div className='flex flex-row gap-2 items-center'>
											<p className='line-clamp-1'>{session.title}</p>
											{session.id === currentSessionId && (
												<Badge>{t('revornix_ai_current_session')}</Badge>
											)}
										</div>
										<Button
											size={'icon'}
											variant={'outline'}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleDeleteSession(session);
											}}>
											<XCircle />
										</Button>
									</CardTitle>
								</CardHeader>
							</Card>
						);
					})}
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default ChatHistory;
