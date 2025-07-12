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
		queryFn: () => getDocumentDetail({ document_id: Number(id) }),
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
									let src = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/images/cover.jpg`;
									if (typeof props.src === 'string') {
										if (props.src.startsWith('images/')) {
											src = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${props.src}`;
										} else if (props.src) {
											src = props.src;
										}
									}
									return <img {...props} src={src} className='w-full' />;
								},
							}}
							remarkPlugins={[remarkMath, remarkGfm]}
							rehypePlugins={[rehypeKatex, rehypeRaw]}>
							{document?.quick_note_info?.content}
						</Markdown>
						<div ref={bottomRef}></div>
					</div>
					<Separator className='my-5' />
					<DocumentOperate id={Number(id)} />
				</div>
			)}
		</div>
	);
};

export default QuickDocumentDetail;
