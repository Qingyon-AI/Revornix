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
import 'katex/dist/katex.min.css';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { Info, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { getFile } from '@/service/file';
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';

const FileDocumentDetail = ({
	id,
	className,
}: {
	id: string;
	className?: string;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const {
		data: document,
		isError,
		error,
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

	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const [markdown, setMarkdown] = useState<string>();

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
		queryClient.invalidateQueries({ queryKey: ['getDocumentDetail', id] });
		toast.success(t('document_transform_to_markdown_retry_submit_success'));
		setDelay(1000);
	};

	const onGetMarkdown = async () => {
		if (!document || !document.file_info?.md_file_name) return;
		try {
			const [res, err] = await utils.to(
				getFile(document.file_info?.md_file_name)
			);
			if (!res || err) {
				throw new Error(err.message);
			}
			setMarkdown(res);
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	useEffect(() => {
		if (!document || !document.file_info?.md_file_name) return;
		onGetMarkdown();
	}, [document]);

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
			{document && document.transform_task?.status === 1 && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs gap-5'>
					{t('document_transform_to_markdown_doing')}
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
				document.transform_task?.status !== 0 &&
				document.transform_task?.status !== 1 &&
				document.transform_task?.status !== 3 && (
					<Skeleton className='h-full w-full' />
				)}
			{markdown && !isError && !markdownGetError && (
				<div className='prose dark:prose-invert mx-auto'>
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
								return <img {...props} src={src} />;
							},
						}}
						remarkPlugins={[remarkMath, remarkGfm]}
						rehypePlugins={[rehypeKatex, rehypeRaw]}>
						{markdown}
					</Markdown>
					<p className='text-xs text-center text-muted-foreground bg-muted rounded py-2'>
						{t('document_ai_tips')}
					</p>
				</div>
			)}
		</div>
	);
};

export default FileDocumentDetail;
