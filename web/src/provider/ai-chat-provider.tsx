'use client';

import {
	AIChacAction,
	AIChatState,
	Message,
	SessionItem,
	useAiChatStore,
} from '@/store/ai-chat';
import { createContext, useContext, useMemo, useState } from 'react';
import { useGetSet } from 'react-use';

interface AIChatContextProps {
	aiStatus: string;
	currentSession?: SessionItem;
	setAiStatus: (status: string) => void;
	tempMessages: () => Message[];
	setTempMessages: (messages: Message[]) => void;
}

const AIChatContext = createContext<
	(AIChatContextProps & AIChatState & AIChacAction) | null
>(null);

export const AIChatProvider = ({ children }: { children: React.ReactNode }) => {
	const _hasHydrated = useAiChatStore((state) => state._hasHydrated);
	const setCurrentSessionId = useAiChatStore(
		(state) => state.setCurrentSessionId
	);
	const setHasHydrated = useAiChatStore((state) => state.setHasHydrated);
	const deleteSession = useAiChatStore((state) => state.deleteSession);
	const currentSessionId = useAiChatStore((state) => state.currentSessionId);
	const sessions = useAiChatStore((state) => state.sessions);
	const addSession = useAiChatStore((state) => state.addSession);
	const updateSessionMessages = useAiChatStore(
		(state) => state.updateSessionMessages
	);
	
	const currentSession = useMemo(() => {
		return sessions.find((session) => session.id === currentSessionId);
	}, [currentSessionId, sessions]);

	const [aiStatus, setAiStatus] = useState('');

	const [tempMessages, setTempMessages] = useGetSet<Message[]>(
		currentSession?.messages || []
	);
	return (
		<AIChatContext.Provider
			value={{
				setHasHydrated,
				deleteSession,
				setCurrentSessionId,
				addSession,
				updateSessionMessages,
				currentSessionId,
				currentSession,
				sessions,
				_hasHydrated,
				aiStatus,
				setAiStatus,
				tempMessages,
				setTempMessages,
			}}>
			{children}
		</AIChatContext.Provider>
	);
};

export const useAIChatContext = () => {
	const context = useContext(AIChatContext);
	if (!context) {
		throw new Error('useAiChatContext must be used within a AIChatProvider');
	}
	return context;
};
