'use client';

import { useAiChatStore } from '@/store/ai-chat';

const AIChatHydratedClient = ({ children }: { children: React.ReactNode }) => {
	const _hasHydrated = useAiChatStore((state) => state._hasHydrated);

	if (!_hasHydrated) return null;

	return children;
};

export default AIChatHydratedClient;
