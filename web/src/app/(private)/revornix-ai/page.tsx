import AIChatHydratedClient from '@/components/revornixai/ai-chat-hydrated-client';
import RevornixAI from '@/components/revornixai/revornix-ai-chat-container';

const AIChatPage = () => {
	return (
		// add this layer to ensure that the internal component rendering can get the hydrated data
		<AIChatHydratedClient>
			<RevornixAI />
		</AIChatHydratedClient>
	);
};

export default AIChatPage;
