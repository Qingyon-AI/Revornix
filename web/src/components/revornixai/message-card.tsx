import { cn } from '@/lib/utils';
import { Message } from '@/types/ai';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import CustomImage from '../ui/custom-image';
import { Alert, AlertTitle } from '@/components/ui/alert';
import {
	CheckCircle2Icon,
	PenLineIcon,
	SparkleIcon,
	WrenchIcon,
	XCircleIcon,
} from 'lucide-react';

const MessageCard = ({ message }: { message: Message }) => {
	const ai_state = message.ai_state;
	return (
		<div
			className={cn('flex flex-row gap-5', {
				'justify-end': message.role === 'user',
			})}>
			<div className='flex flex-col gap-2'>
				<div className='rounded-lg p-3 w-fit bg-muted prose dark:prose-invert max-w-none'>
					{ai_state && (
						<div className='mb-5'>
							<Alert>
								{ai_state.phase === 'thinking' && <SparkleIcon />}
								{ai_state.phase === 'writing' && <PenLineIcon />}
								{ai_state.phase === 'tool' && <WrenchIcon />}
								{ai_state.phase === 'done' && <CheckCircle2Icon />}
								{ai_state.phase === 'error' && <XCircleIcon />}
								<AlertTitle>{ai_state?.label && ai_state.label}</AlertTitle>
							</Alert>
						</div>
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
