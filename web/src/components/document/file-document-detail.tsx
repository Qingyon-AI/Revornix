import { cn, replaceImagePaths } from '@/lib/utils';
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
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';
import { Separator } from '../ui/separator';
import DocumentOperate from './document-operate';
import { useInView } from 'react-intersection-observer';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import {
	getUserFileSystemDetail,
	getUserFileUrlPrefix,
} from '@/service/file-system';

const FileDocumentDetail = ({
	id,
	className,
	onFinishRead,
}: {
	id: number;
	className?: string;
	onFinishRead?: () => void;
}) => {
	const t = useTranslations();
	const { userInfo } = useUserContext();
	const queryClient = getQueryClient();
	const [markdownRendered, setMarkdownRendered] = useState(false);
	const {
		data: document,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const { data: userFileSystemDetail } = useQuery({
		queryKey: ['getUserFileSystemDetail', userInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: userInfo!.default_user_file_system!,
			}),
		enabled:
			userInfo?.id !== undefined &&
			userInfo?.default_user_file_system !== undefined,
	});

	const { data: userRemoteFileUrlPrefix } = useQuery({
		queryKey: ['getUserRemoteFileUrlPrefix', document?.creator?.id],
		queryFn: () => {
			return getUserFileUrlPrefix({ user_id: document!.creator!.id });
		},
		enabled: !!document?.creator?.id,
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
				document_id: id,
			})
		);
		if (err) {
			toast.error(err.message);
			setMarkdowningTransform(false);
			return;
		}
		setMarkdowningTransform(false);
		toast.success(t('document_transform_again'));
		setDelay(1000);
	};

	const onGetMarkdown = async () => {
		if (!document || !document.file_info?.md_file_name || !userInfo) return;
		if (!userInfo?.default_user_file_system) {
			toast.error('No user default file system found');
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		try {
			let [res, err] = await utils.to(
				fileService.getFileContent(document.file_info?.md_file_name)
			);
			if (!res || err) {
				throw new Error(err.message);
			}
			if (typeof res === 'string') {
				if (userRemoteFileUrlPrefix?.url_prefix) {
					res = replaceImagePaths(res, userRemoteFileUrlPrefix.url_prefix);
				}
				setMarkdown(res);
				setMarkdownRendered(true);
			}
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	useEffect(() => {
		if (
			!document ||
			!document.file_info?.md_file_name ||
			document.transform_task?.status !== 2 ||
			!userInfo ||
			!userFileSystemDetail ||
			!userRemoteFileUrlPrefix
		)
			return;
		onGetMarkdown();
	}, [document, userInfo, userRemoteFileUrlPrefix, userFileSystemDetail]);

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
							<Separator />
							<DocumentOperate id={id} />
						</div>
					)}
				</div>
			)}
			{document && document.transform_task?.status === 1 && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
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
					<Separator />
					<DocumentOperate id={id} />
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
					<Separator />
					<DocumentOperate id={id} />
				</div>
			)}
			{document &&
				!markdown &&
				!isError &&
				!markdownGetError &&
				document.transform_task?.status === 2 && (
					<Skeleton className='h-full w-full' />
				)}
			{markdown && !isError && !markdownGetError && (
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
							{markdown}
						</Markdown>
						<p className='text-xs text-center text-muted-foreground bg-muted rounded py-2'>
							{t('document_ai_tips')}
						</p>
						<div ref={bottomRef}></div>
					</div>
					<Separator className='mb-5' />
					<DocumentOperate id={id} />
				</div>
			)}
		</div>
	);
};

export default FileDocumentDetail;
