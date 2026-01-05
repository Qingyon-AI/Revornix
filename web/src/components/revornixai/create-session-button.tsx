import { Button } from '../ui/button';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useAiChatStore } from '@/store/ai-chat';

const CreateSessionButton = () => {
	const t = useTranslations();
	const addSession = useAiChatStore((s) => s.addSession);
	const setCurrentSessionId = useAiChatStore((s) => s.setCurrentSessionId);
	const handleCreateNewSession = () => {
		const newSession = {
			id: uuidv4(),
			title: format(new Date(), 'MM-dd HH:mm:ss'),
			messages: [],
		};
		addSession(newSession);
		setCurrentSessionId(newSession.id);
	};
	return (
		<Button onClick={handleCreateNewSession}>
			{t('revornix_ai_add_session')}
		</Button>
	);
};

export default CreateSessionButton;
