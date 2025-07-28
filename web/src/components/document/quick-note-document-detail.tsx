import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import DocumentOperate from './document-operate';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

const QuickDocumentDetail = ({
	id,
	className,
	onFinishRead,
}: {
	id: number;
	className?: string;
	onFinishRead?: () => void;
}) => {
	const {
		isFetching,
		data: document,
		isError,
		isRefetching,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const [markdownRendered, setMarkdownRendered] = useState(false);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (!document || !document.quick_note_info) return;
		setMarkdownRendered(true);
	}, [document]);

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView]);

	return (
		<div className={cn('h-full w-full relative', className)}>
			{isError && error && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? (
						<div className='flex flex-col text-center gap-2'>
							<p>{error.message}</p>
						</div>
					)}
				</div>
			)}
			{isFetching && !isRefetching && <Skeleton className='w-full h-full' />}
			{!isError && (
				<div className='flex w-full h-full flex-col'>
					<div className='prose dark:prose-invert mx-auto w-full h-full flex-1 overflow-auto relative'>
						<Markdown
							components={{
								img: (props) => {
									return <img {...props} className='mx-auto' />;
								},
							}}
							remarkPlugins={[remarkMath, remarkGfm]}
							rehypePlugins={[rehypeKatex, rehypeRaw]}>
							{document?.quick_note_info?.content}
						</Markdown>
						<div ref={bottomRef}></div>
					</div>
					<Separator className='my-5' />
					<DocumentOperate id={id} />
				</div>
			)}
		</div>
	);
};

export default QuickDocumentDetail;
