import { cn } from '@/lib/utils';
import { Message } from '@/store/ai-chat';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import CustomImage from '../ui/custom-image';
import { useAIChatContext } from '@/provider/ai-chat-provider';
import { Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';

const MessageCard = ({ message }: { message: Message }) => {
	const { aiStatus, tempMessages } = useAIChatContext();
	return (
		<div
			className={cn('flex flex-row gap-5', {
				'justify-end': message.role === 'user',
			})}>
			<div className='flex flex-col gap-2'>
				<div className='rounded-lg p-3 w-fit bg-muted prose dark:prose-invert'>
					{aiStatus &&
						aiStatus !== 'done' &&
						tempMessages().at(-1) &&
						message.chat_id === tempMessages().at(-1)!.chat_id &&
						message.role !== 'user' && (
							<>
								<div className='flex flex-row gap-2 items-center text-sm text-muted-foreground mb-2'>
									<div>{aiStatus !== 'done' && aiStatus}</div>
									<Loader2
										className='animate-spin text-muted-foreground'
										size={14}
									/>
								</div>
								<Separator />
							</>
						)}
					<Markdown
						components={{
							img: (props) => {
								return <CustomImage {...props} />;
							},
						}}
						remarkPlugins={[remarkMath, remarkGfm]}
						rehypePlugins={[rehypeKatex, rehypeRaw]}>
						{message.content}
					</Markdown>
				</div>
			</div>
		</div>
	);
};
export default MessageCard;
