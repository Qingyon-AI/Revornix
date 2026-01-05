import { cn } from '@/lib/utils';
import { Message } from '@/types/ai';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import CustomImage from '../ui/custom-image';

const MessageCard = ({ message }: { message: Message }) => {
	return (
		<div
			className={cn('flex flex-row gap-5', {
				'justify-end': message.role === 'user',
			})}>
			<div className='flex flex-col gap-2'>
				<div className='rounded-lg p-3 w-fit bg-muted prose dark:prose-invert max-w-none'>
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
