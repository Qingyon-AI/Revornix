import AIChatHydratedClient from '@/components/linkai/ai-chat-hydrated-client';
import RevornixAI from '@/components/linkai/revornix-ai-chat-container';
import { AIChatProvider } from '@/provider/ai-chat-provider';

const AIChatPage = () => {
	return (
		// 补充这一层 确保内部组件渲染能获取到水合后的数据
		<AIChatHydratedClient>
			<AIChatProvider>
				<RevornixAI />
			</AIChatProvider>
		</AIChatHydratedClient>
	);
};

export default AIChatPage;
