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
import { Button } from '../ui/button';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { Info, Loader2 } from 'lucide-react';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { getFile } from '@/service/file';
import { useInterval } from 'ahooks';

const WebsiteDocumentDetail = ({
	id,
	className,
}: {
	id: string;
	className?: string;
}) => {
	const queryClient = getQueryClient();
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
		queryFn: () => getDocumentDetail({ document_id: Number(id) }),
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
				throw new Error('获取markdown文件出错');
			}
			setMarkdown(res);
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	const handleTransformToMarkdown = async () => {
		setMarkdowningTransform(true);
		const [res, err] = await utils.to(
			transformToMarkdown({
				document_id: Number(id),
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

	return (
		<div className={cn('h-full w-full relative', className)}>
			{((isError && error) || markdownGetError) && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? (
						<div className='flex flex-col text-center gap-2'>
							<p>获取markdown文件出错</p>
							<p>{markdownGetError}</p>
						</div>
					)}
				</div>
			)}
			{document && document.transform_task?.status === 1 && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs gap-5'>
					网站markdown正在转化中，若要浏览markdown，请稍等，您可先浏览源站
				</div>
			)}
			{document && document.transform_task?.status === 0 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-xs text-muted-foreground gap-2'>
					<p className='flex flex-row items-center'>
						<span className='mr-1'>文档待转化</span>
						<Tooltip>
							<TooltipTrigger>
								<Info size={15} />
							</TooltipTrigger>
							<TooltipContent>
								注意极个别情况下会出现转化服务中断的情况，如果你的文档很久都保持在待转化状态，此时请点击下方按钮进行重试
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
						重试
						{markdownTransforming && (
							<Loader2 className='size-4 animate-spin' />
						)}
					</Button>
				</div>
			)}
			{document && document.transform_task?.status === 1 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-muted-foreground text-xs gap-2'>
					<p>文档转化中，请稍后再试</p>
					<div className='flex flex-row items-center gap-2'>
						<Button
							variant={'link'}
							className='h-fit p-0 text-xs'
							disabled={isRefetching}
							onClick={() => {
								refetch();
							}}>
							刷新
							{isRefetching && <Loader2 className='size-4 animate-spin' />}
						</Button>
						<span>或</span>
						<Button
							variant={'link'}
							className='h-fit p-0 text-xs'
							disabled={markdownTransforming}
							onClick={() => {
								handleTransformToMarkdown();
							}}>
							重试
							{markdownTransforming && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</Button>
					</div>
				</div>
			)}
			{document && document.transform_task?.status === 3 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-muted-foreground text-xs gap-2'>
					<p>文档markdown转化出错</p>
					<Button
						variant={'link'}
						className='h-fit p-0 text-xs'
						disabled={markdownTransforming}
						onClick={() => {
							handleTransformToMarkdown();
						}}>
						重试
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
				document.transform_task?.status !== 0 &&
				document.transform_task?.status !== 3 && (
					<Skeleton className='h-full w-full' />
				)}
			{markdown && !isError && !markdownGetError && (
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
										`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/cover.jpg`;
								}
								return <img {...props} src={src} />;
							},
						}}
						remarkPlugins={[remarkMath, remarkGfm]}
						rehypePlugins={[rehypeKatex, rehypeRaw]}>
						{markdown}
					</Markdown>
					<p className='text-xs text-center text-muted-foreground bg-muted rounded py-2'>
						本文由AI识别网站而来，请酌情识别信息。
					</p>
				</div>
			)}
		</div>
	);
};

export default WebsiteDocumentDetail;
