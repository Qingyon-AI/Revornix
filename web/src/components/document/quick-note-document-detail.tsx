import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail, transformToMarkdown } from '@/service/document';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { Skeleton } from '../ui/skeleton';

const QuickDocumentDetail = ({
	id,
	className,
}: {
	id: string;
	className?: string;
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

	return (
		<div className={cn('h-full w-full relative', className)}>
			{isError && error && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? (
						<div className='flex flex-col text-center gap-2'>
							<p>获取文档数据出错</p>
							<p>{error.message}</p>
						</div>
					)}
				</div>
			)}
			{isFetching && !isRefetching && <Skeleton className='w-full h-full' />}
			{!isError && (
				<div className='prose dark:prose-invert mx-auto'>
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
						{document?.quick_note_info?.content}
					</Markdown>
				</div>
			)}
		</div>
	);
};

export default QuickDocumentDetail;
