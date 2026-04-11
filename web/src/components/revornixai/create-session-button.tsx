import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { useAiChatStore } from '@/store/ai-chat';
import { createEmptySession } from '@/lib/ai-session';
import { PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const CreateSessionButton = ({
	label,
	className,
}: {
	label?: string;
	className?: string;
}) => {
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
			className={cn('rounded-2xl px-4', className)}>
			{label ?? t('revornix_ai_add_session')}
			<PlusIcon />
		</Button>
	);
};

export default CreateSessionButton;
