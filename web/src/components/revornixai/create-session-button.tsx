import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { useAiChatStore } from '@/store/ai-chat';
import { createEmptySession } from '@/lib/ai-session';
import { PlusIcon } from 'lucide-react';

const CreateSessionButton = () => {
	const t = useTranslations();
	const addSession = useAiChatStore((s) => s.addSession);
	const setCurrentSessionId = useAiChatStore((s) => s.setCurrentSessionId);
	const handleCreateNewSession = () => {
		const newSession = createEmptySession();
		addSession(newSession);
		setCurrentSessionId(newSession.id);
	};
	return (
		<Button
			onClick={handleCreateNewSession}
			className='rounded-2xl border border-foreground/10 bg-foreground px-4 text-background shadow-[0_18px_36px_-26px_rgba(15,23,42,0.7)] hover:bg-foreground/90'>
			{t('revornix_ai_add_session')}
			<PlusIcon />
		</Button>
	);
};

export default CreateSessionButton;
