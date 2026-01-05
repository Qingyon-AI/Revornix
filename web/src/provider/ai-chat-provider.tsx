'use client';

import { AIChatAction, AIChatState, useAiChatStore } from '@/store/ai-chat';
import { SessionItem } from '@/types/ai';
import { createContext, useContext } from 'react';

interface AIChatContextProps {
	currentSession?: () => SessionItem | null;
}

const AIChatContext = createContext<
	(AIChatContextProps & AIChatState & AIChatAction) | null
>(null);

export const AIChatProvider = ({ children }: { children: React.ReactNode }) => {
	const _hasHydrated = useAiChatStore((state) => state._hasHydrated);
	const setCurrentSessionId = useAiChatStore(
		(state) => state.setCurrentSessionId
	);
	const appendChatToken = useAiChatStore((state) => state.appendChatToken);
	const setHasHydrated = useAiChatStore((state) => state.setHasHydrated);
	const deleteSession = useAiChatStore((state) => state.deleteSession);
	const currentSessionId = useAiChatStore((state) => state.currentSessionId);
	const sessions = useAiChatStore((state) => state.sessions);
	const addSession = useAiChatStore((state) => state.addSession);
	const currentSession = useAiChatStore((state) => state.currentSession);

	return (
		<AIChatContext.Provider
			value={{
				setHasHydrated,
				deleteSession,
				setCurrentSessionId,
				addSession,
				currentSessionId,
				currentSession,
				sessions,
				_hasHydrated,
				appendChatToken,
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
