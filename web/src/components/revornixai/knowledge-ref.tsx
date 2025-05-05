import { useRouter } from 'nextjs-toploader/app';
import { Card } from '../ui/card';
import { DocumentItem } from '@/store/ai-chat';

const KnowledgeRef = ({ knowledges }: { knowledges: DocumentItem[] }) => {
	const router = useRouter();
	return (
		<div>
			<p className='font-bold'>引用知识库文章</p>
			<div className='w-full grid grid-flow-col gap-3 overflow-auto h-fit'>
				{knowledges?.map((item, index) => {
					return (
						<Card
							key={index}
							className='w-80 shrink-0 gap-2 dark:bg-black/50 bg-white/50 p-3'
							onClick={() => router.push(`/document/detail/${item.id}`)}>
							<p className='line-clamp-2 text-sm !m-0'>{item.title}</p>
							<div className='flex-1 !m-0'></div>
							<p className='line-clamp-2 text-sm text-muted-foreground !m-0'>
								{item.description}
							</p>
						</Card>
					);
				})}
			</div>
		</div>
	);
};

export default KnowledgeRef;
