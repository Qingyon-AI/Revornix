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
import TipTapMarkdownViewer from '../markdown/tiptap-markdown-viewer';
import EngineSelect from '@/components/ai/engine-select';
import { EngineCategory } from '@/enums/engine';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';

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
	const [selectedEngineId, setSelectedEngineId] = useState<number | null>(
		mainUserInfo?.default_audio_transcribe_engine_id ?? null,
	);
	const [isTranscribeDialogOpen, setIsTranscribeDialogOpen] = useState(false);
	const queryClient = getQueryClient();
	const contentFallbackMinHeightClassName =
		'min-h-[calc(100dvh-14rem)] sm:min-h-[calc(100dvh-14.25rem)]';
	const statusContainerClassName = cn(
		'mx-auto flex w-full max-w-[880px] flex-col items-center justify-center gap-2 rounded-[28px] border border-border/60 bg-background/30 px-6 py-8 text-xs text-muted-foreground',
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
		setSelectedEngineId(
			mainUserInfo?.default_audio_transcribe_engine_id ?? null,
		);
	}, [mainUserInfo?.default_audio_transcribe_engine_id]);

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
				engine_id: selectedEngineId ?? undefined,
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
		setIsTranscribeDialogOpen(false);
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
		<div className={cn('h-full w-full relative', className)}>
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
								setIsTranscribeDialogOpen(true);
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
								setIsTranscribeDialogOpen(true);
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
								setIsTranscribeDialogOpen(true);
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
					<Skeleton className='mx-auto min-h-0 w-full max-w-[880px] rounded-[28px]' />
				)}
			{markdown && !isError && (
				<>
					<TipTapMarkdownViewer content={markdown} />
					<div className='my-4 w-full rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-center text-sm text-muted-foreground sm:mt-6'>
						{t('document_ai_tips')}
					</div>
					<div
						ref={bottomRef}
						className='pointer-events-none absolute inset-x-0 bottom-0 h-px'
					/>
				</>
			)}
			<ResourceConfirmDialog
				open={isTranscribeDialogOpen}
				onOpenChange={setIsTranscribeDialogOpen}
				title={t('retry')}
				description={t('resource_dialog_transcribe_description')}
				confirmLabel={t('retry')}
				confirmDisabled={!selectedEngineId}
				confirmLoading={markdownTransforming}
				onConfirm={() => {
					void handleReTranscribeDocument();
				}}>
				<div className='space-y-2'>
					<p className='text-sm font-medium text-foreground'>
						{t('use_engine')}
					</p>
					<EngineSelect
						category={EngineCategory.STT}
						value={selectedEngineId}
						onChange={setSelectedEngineId}
						className='w-full'
						placeholder={t('setting_default_engine_choose')}
					/>
				</div>
			</ResourceConfirmDialog>
		</div>
	);
};

export default AudioDocumentDetail;
