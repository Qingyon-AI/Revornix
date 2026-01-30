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
import DocumentOperate from './document-operate';
import { Separator } from '../ui/separator';
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
		queryKey: ['getUserFileSystemDetail', mainUserInfo?.id],
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
			toast.error('No user default file system found');
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		try {
			if (!document.convert_task?.md_file_name) {
				throw new Error('No md file name found');
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
	}, [inView]);

	return (
		<div className={cn('h-full w-full relative', className)}>
			{((isError && error) || markdownGetError) && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? (
						<div className='flex flex-col text-center gap-2 w-full'>
							<p>{markdownGetError}</p>
							<Separator />
							<DocumentOperate id={id} />
						</div>
					)}
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
						<Separator />
						<DocumentOperate id={id} />
					</div>
				)}
			{document &&
				document.convert_task?.status === DocumentMdConvertStatus.WAIT_TO && (
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
						<DocumentOperate id={id} className='mb-5 md:mb-0 overflow-auto' />
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
						<Separator />
						<DocumentOperate id={id} className='mb-5 md:mb-0 overflow-auto' />
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
						<div className='prose dark:prose-invert mx-auto pb-5'>
							<CustomMarkdown content={markdown} />
							<p className='text-xs text-center text-muted-foreground bg-muted rounded py-2'>
								{t('document_ai_tips')}
							</p>
						</div>
						<div ref={bottomRef}></div>
					</div>
					<Separator className='mb-5' />
					<DocumentOperate id={id} className='mb-5 md:mb-0 overflow-auto' />
				</div>
			)}
		</div>
	);
};

export default WebsiteDocumentDetail;
