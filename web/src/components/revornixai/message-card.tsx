import { cn } from '@/lib/utils';
import { Message } from '@/store/ai-chat';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import KnowledgeRef from './knowledge-ref';
import SearchResultsRef from './search-results-ref';

const MessageCard = ({ message }: { message: Message }) => {
	return (
		<div
			className={cn('flex flex-row gap-5', {
				'justify-end': message.role === 'user',
			})}>
			<div className='flex flex-col gap-2'>
				<div className='rounded-lg p-3 w-fit bg-muted prose dark:prose-invert'>
					{message.reasoning_content && (
						<div className='text-muted-foreground text-sm pl-3 border-l-2 border-muted-foreground/50'>
							<p className='text-sm/6 mt-0'>{message.reasoning_content}</p>
						</div>
					)}
					<Markdown
						components={{
							img: (props) => {
								let src = '';
								if (props.src?.startsWith('images/')) {
									src = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${props.src}`;
								} else {
									src =
										props.src ??
										`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/images/cover.jpg`;
								}
								return <img {...props} src={src} />;
							},
						}}
						remarkPlugins={[remarkMath, remarkGfm]}
						rehypePlugins={[rehypeKatex, rehypeRaw]}>
						{message.content}
					</Markdown>
					{message.references &&
						message.references.length > 0 &&
						message.finish_reason === 'stop' && (
							<SearchResultsRef references={message.references} />
						)}
					{message.quote && message.quote.length > 0 && (
						<KnowledgeRef knowledges={message.quote} />
					)}
				</div>
			</div>
		</div>
	);
};
export default MessageCard;
