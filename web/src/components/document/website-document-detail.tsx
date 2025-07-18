import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail, transformToMarkdown } from '@/service/document';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { getFile } from '@/service/file';
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';
import { Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DocumentOperate from './document-operate';
import { Separator } from '../ui/separator';
import { useInView } from 'react-intersection-observer';

const WebsiteDocumentDetail = ({
	id,
	className,
	onFinishRead,
}: {
	id: number;
	className?: string;
	onFinishRead?: () => void;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [markdownRendered, setMarkdownRendered] = useState(false);
	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const {
		data: document,
		isError,
		error,
		isRefetching,
		refetch,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});
	const [delay, setDelay] = useState<number | undefined>(1000);
	useInterval(() => {
		if (
			document &&
			document?.transform_task &&
			document?.transform_task?.status >= 2
		) {
			setDelay(undefined);
		}
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	}, delay);
	const [markdown, setMarkdown] = useState<string>();
	const onGetMarkdown = async () => {
		if (!document || !document?.website_info?.md_file_name) return;
		try {
			const [res, err] = await utils.to(
				getFile(document?.website_info?.md_file_name)
			);
			if (!res || err) {
				throw new Error(err.message);
			}
			setMarkdown(res);
			setMarkdownRendered(true);
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	const handleTransformToMarkdown = async () => {
		setMarkdowningTransform(true);
		const [res, err] = await utils.to(
			transformToMarkdown({
				document_id: id,
			})
		);
		if (err) {
			toast.error(err.message);
			setMarkdowningTransform(false);
			return;
		}
		setMarkdowningTransform(false);
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	};

	useEffect(() => {
		if (!document || !document.website_info?.md_file_name) return;
		onGetMarkdown();
	}, [document]);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView]);

	return (
		<div className={cn('h-full w-full relative', className)}>
			{((isError && error) || markdownGetError) && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? (
						<div className='flex flex-col text-center gap-2'>
							<p>{markdownGetError}</p>
						</div>
					)}
				</div>
			)}
			{document && document.transform_task?.status === 0 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-xs text-muted-foreground gap-2'>
					<p className='flex flex-row items-center'>
						<span className='mr-1'>
							{t('document_transform_to_markdown_todo')}
						</span>
						<Tooltip>
							<TooltipTrigger>
								<Info size={15} />
							</TooltipTrigger>
							<TooltipContent>
								{t('document_transform_to_markdown_todo_tips')}
							</TooltipContent>
						</Tooltip>
					</p>
					<Button
						variant={'link'}
						className='h-fit p-0 text-xs'
						disabled={markdownTransforming}
						onClick={() => {
							handleTransformToMarkdown();
						}}>
						{t('retry')}
						{markdownTransforming && (
							<Loader2 className='size-4 animate-spin' />
						)}
					</Button>
				</div>
			)}
			{document && document.transform_task?.status === 1 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-muted-foreground text-xs gap-2'>
					<p>{t('document_transform_to_markdown_doing')}</p>
					<Button
						variant={'link'}
						className='h-fit p-0 text-xs'
						disabled={markdownTransforming}
						onClick={() => {
							handleTransformToMarkdown();
						}}>
						{t('retry')}
						{markdownTransforming && (
							<Loader2 className='size-4 animate-spin' />
						)}
					</Button>
				</div>
			)}
			{document && document.transform_task?.status === 3 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-muted-foreground text-xs gap-2'>
					<p>{t('document_transform_to_markdown_failed')}</p>
					<Button
						variant={'link'}
						className='h-fit p-0 text-xs'
						disabled={markdownTransforming}
						onClick={() => {
							handleTransformToMarkdown();
						}}>
						{t('retry')}
						{markdownTransforming && (
							<Loader2 className='size-4 animate-spin' />
						)}
					</Button>
				</div>
			)}
			{document &&
				!markdown &&
				!isError &&
				!markdownGetError &&
				document.transform_task?.status === 2 && (
					<Skeleton className='h-full w-full rounded' />
				)}
			{markdown && !isError && !markdownGetError && (
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
							{markdown}
						</Markdown>
						<p className='text-xs text-center text-muted-foreground bg-muted rounded py-2'>
							{t('document_ai_tips')}
						</p>
						<div ref={bottomRef}></div>
					</div>
					<Separator className='my-5' />
					<DocumentOperate id={id} />
				</div>
			)}
		</div>
	);
};

export default WebsiteDocumentDetail;
