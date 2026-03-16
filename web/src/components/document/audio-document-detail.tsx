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
import { useInView } from 'react-intersection-observer';
import { useUserContext } from '@/provider/user-provider';
import { DocumentTranscribeStatus } from '@/enums/document';
import { shouldPollDocumentDetail } from '@/lib/document-task';
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
	const contentFallbackMinHeightClassName =
		'min-h-[calc(100dvh-8rem)] sm:min-h-[calc(100dvh-8.25rem)]';
	const statusContainerClassName = cn(
		'flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-xs text-muted-foreground',
		contentFallbackMinHeightClassName,
	);
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
		if (shouldPollDocumentDetail(document)) {
			setDelay(1000);
		} else {
			setDelay(undefined);
		}
	}, [document]);

	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [markdown, setMarkdown] = useState<string>();
	const transcribedText = document?.transcribe_task?.transcribed_text;

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
		setMarkdown(undefined);
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
	}, [document?.transcribe_task?.status, transcribedText, mainUserInfo?.id]);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView, markdownRendered, onFinishRead]);

	return (
		<div
			className={cn(
				'relative flex w-full flex-col',
				contentFallbackMinHeightClassName,
				className,
			)}>
			{document &&
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.TRANSCRIBING && (
					<div className={statusContainerClassName}>
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
					</div>
				)}
			{document &&
				(document.transcribe_task?.status ===
					DocumentTranscribeStatus.WAIT_TO ||
					!document.transcribe_task) && (
					<div className={statusContainerClassName}>
						<p className='flex flex-row items-center'>
							<span className='mr-1'>{t('document_transcribe_todo')}</span>
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
					</div>
				)}
			{document &&
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.FAILED && (
					<div className={statusContainerClassName}>
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
					</div>
				)}
			{document &&
				!markdown &&
				!isError &&
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.SUCCESS && (
					<Skeleton className='min-h-0 w-full flex-1' />
				)}
			{markdown && !isError && (
				<div className='flex min-h-0 w-full flex-1 flex-col'>
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

export default AudioDocumentDetail;
