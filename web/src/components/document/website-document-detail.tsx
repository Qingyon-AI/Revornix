import { cn, replaceImagePaths } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail, transformToMarkdown } from '@/service/document';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';
import { Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInView } from 'react-intersection-observer';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import {
	DocumentProcessStatus,
	DocumentMdConvertStatus,
} from '@/enums/document';
import CustomMarkdown from '../ui/custom-markdown';

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
	const { mainUserInfo } = useUserContext();
	const queryClient = getQueryClient();
	const [markdownRendered, setMarkdownRendered] = useState(false);
	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const {
		data: document,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const { data: userFileSystemDetail } = useQuery({
		queryKey: [
			'getUserFileSystemDetail',
			mainUserInfo?.id,
			mainUserInfo?.default_user_file_system,
		],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	const [delay, setDelay] = useState<number | undefined>();
	useInterval(() => {
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	}, delay);

	useEffect(() => {
		if (
			document &&
			document.process_task &&
			document.process_task?.status < DocumentProcessStatus.SUCCESS
		) {
			setDelay(1000);
		} else {
			setDelay(undefined);
		}
	}, [document?.process_task?.status]);

	const [markdown, setMarkdown] = useState<string>();
	const onGetMarkdown = async () => {
		if (
			!document ||
			document.convert_task?.status !== DocumentMdConvertStatus.SUCCESS ||
			!mainUserInfo
		)
			return;
		if (!mainUserInfo.default_user_file_system) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		try {
			if (!document.convert_task?.md_file_name) {
				throw new Error(t('document_markdown_file_missing'));
			}
			let [res, err] = await utils.to(
				fileService.getFileContent(document.convert_task?.md_file_name),
			);
			if (!res || err) {
				throw new Error(err.message);
			}
			if (typeof res === 'string') {
				res = replaceImagePaths(res, document.creator.id);
				setMarkdown(res);
				setMarkdownRendered(true);
			}
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	const handleTransformToMarkdown = async () => {
		setMarkdowningTransform(true);
		const [res, err] = await utils.to(
			transformToMarkdown({
				document_id: id,
			}),
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

	useEffect(() => {
		if (
			!document ||
			document.convert_task?.status !== DocumentMdConvertStatus.SUCCESS ||
			!mainUserInfo ||
			!userFileSystemDetail
		)
			return;
		onGetMarkdown();
	}, [document, mainUserInfo, userFileSystemDetail]);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView, markdownRendered, onFinishRead]);

	return (
		<div className={cn('h-full w-full relative', className)}>
			{((isError && error) || markdownGetError) && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? <p>{markdownGetError}</p>}
				</div>
			)}
			{document &&
				(document.convert_task?.status === DocumentMdConvertStatus.WAIT_TO ||
					!document.convert_task) && (
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
			{document &&
				document.convert_task?.status ===
					DocumentMdConvertStatus.CONVERTING && (
					<div className='h-full w-full flex flex-col justify-center items-center text-xs text-muted-foreground gap-2'>
						<p className='flex flex-row items-center'>
							{t('document_transform_to_markdown_doing')}
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
			{document &&
				document.convert_task?.status === DocumentMdConvertStatus.FAILED && (
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
				document.convert_task?.status === DocumentMdConvertStatus.SUCCESS && (
					<Skeleton className='h-full w-full rounded' />
				)}
			{markdown && !isError && !markdownGetError && (
				<div className='w-full h-full flex flex-col'>
					<div className='flex-1 overflow-auto relative'>
						<div className='prose prose-zinc mx-auto max-w-[880px] dark:prose-invert prose-headings:scroll-mt-24 prose-headings:break-words prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-a:text-primary prose-strong:text-foreground prose-img:rounded-2xl xl:pb-14 [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words'>
							<CustomMarkdown content={markdown} />
							<div className='not-prose mt-4 rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-center text-sm text-muted-foreground sm:mt-6'>
								{t('document_ai_tips')}
							</div>
						</div>
						<div
							ref={bottomRef}
							className='pointer-events-none absolute inset-x-0 bottom-0 h-px'
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default WebsiteDocumentDetail;
