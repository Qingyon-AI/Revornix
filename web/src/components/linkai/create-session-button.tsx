import { useAIChatContext } from '@/provider/ai-chat-provider';
import { Button } from '../ui/button';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const CreateSessionButton = () => {
	const { setTempMessages, addSession, setCurrentSessionId } =
		useAIChatContext();
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
	return <Button onClick={handleCreateNewSession}>新建会话</Button>;
};

export default CreateSessionButton;
