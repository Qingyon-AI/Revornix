import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail, transcribeDocument } from '@/service/document';
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
import { useUserContext } from '@/provider/user-provider';
import {
	DocumentProcessStatus,
	DocumentTranscribeStatus,
} from '@/enums/document';
import CustomMarkdown from '../ui/custom-markdown';

const AudioDocumentDetail = ({
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
	const {
		data: document,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const [delay, setDelay] = useState<number>();
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

	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [markdown, setMarkdown] = useState<string>();

	const handleReTranscribeDocument = async () => {
		setMarkdowningTransform(true);
		const [res, err] = await utils.to(
			transcribeDocument({
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

	const onGetMarkdown = async () => {
		if (
			!document ||
			document.transcribe_task?.status !== DocumentTranscribeStatus.SUCCESS ||
			!document.transcribe_task.transcribed_text ||
			!mainUserInfo
		)
			return;

		setMarkdown(document.transcribe_task.transcribed_text);
		setMarkdownRendered(true);
	};

	useEffect(() => {
		if (
			!document ||
			document.transcribe_task?.status !== DocumentTranscribeStatus.SUCCESS ||
			!mainUserInfo
		)
			return;
		onGetMarkdown();
	}, [document, mainUserInfo]);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView]);

	return (
		<div className={cn('h-full w-full relative', className)}>
			{document &&
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.TRANSCRIBING && (
					<div className='h-full w-full flex flex-col justify-center items-center text-xs text-muted-foreground gap-2'>
						<p className='flex flex-row items-center'>
							{t('document_transcribe_doing')}
						</p>
						<Button
							variant={'link'}
							className='h-fit p-0 text-xs'
							disabled={markdownTransforming}
							onClick={() => {
								handleReTranscribeDocument();
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
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.WAIT_TO && (
					<div className='h-full w-full flex flex-col justify-center items-center text-xs text-muted-foreground gap-2'>
						<p className='flex flex-row items-center'>
							<span className='mr-1'>
								{t('document_transcribe_todo')}
							</span>
							<Tooltip>
								<TooltipTrigger>
									<Info size={15} />
								</TooltipTrigger>
								<TooltipContent>
									{t('document_transcribe_todo_tips')}
								</TooltipContent>
							</Tooltip>
						</p>
						<Button
							variant={'link'}
							className='h-fit p-0 text-xs'
							disabled={markdownTransforming}
							onClick={() => {
								handleReTranscribeDocument();
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
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.FAILED && (
					<div className='h-full w-full flex flex-col justify-center items-center text-muted-foreground text-xs gap-2'>
						<p>{t('document_transcribe_failed')}</p>
						<Button
							variant={'link'}
							className='h-fit p-0 text-xs'
							disabled={markdownTransforming}
							onClick={() => {
								handleReTranscribeDocument();
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
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.SUCCESS && (
					<Skeleton className='h-full w-full' />
				)}
			{markdown && !isError && (
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

export default AudioDocumentDetail;
