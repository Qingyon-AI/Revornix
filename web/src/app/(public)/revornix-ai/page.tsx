import AIChatHydratedClient from '@/components/linkai/ai-chat-hydrated-client';
import RevornixAI from '@/components/linkai/revornix-ai-chat-container';
import { AIChatProvider } from '@/provider/ai-chat-provider';

const AIChatPage = () => {
	return (
		// add this layer to ensure that the internal component rendering can get the hydrated data
		<AIChatHydratedClient>
			<AIChatProvider>
				<RevornixAI />
			</AIChatProvider>
		</AIChatHydratedClient>
	);
};

export default AIChatPage;
