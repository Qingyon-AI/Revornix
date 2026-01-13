'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	getDocumentDetail,
	summaryDocumentContentByAi,
} from '@/service/document';
import { useRouter } from 'nextjs-toploader/app';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Separator } from '../ui/separator';
import CustomImage from '../ui/custom-image';
import {
	DocumentCategory,
	DocumentEmbeddingConvertStatus,
	DocumentGraphStatus,
	DocumentMdConvertStatus,
	DocumentPodcastStatus,
	DocumentProcessStatus,
	DocumentSummarizeStatus,
} from '@/enums/document';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

const DocumentInfo = ({ id }: { id: number }) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();

	const { data, isPending, isError, error } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const mutateSummaryDocument = useMutation({
		mutationFn: () =>
			summaryDocumentContentByAi({
				document_id: id,
			}),
		onSuccess(data, variables, onMutateResult, context) {
			toast.success(t('ai_summary_submit'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', id],
			});
		},
		onError(error, variables, onMutateResult, context) {
			toast.error(error.message);
			console.error(error);
		},
	});

	return (
		<>
			{isError && error && (
				<div className='w-full h-full flex justify-center items-center text-sm text-muted-foreground'>
					{error.message}
				</div>
			)}
			{isPending && <Skeleton className='w-full h-full' />}
			{data && (
				<div className='relative h-full'>
					<div className='h-full overflow-auto pb-5'>
						<div className='mb-5'>
							<img
								className='w-full h-40 relative object-cover'
								alt='cover'
								src={data.cover ? data.cover : '/images/cover.jpg'}
							/>
						</div>
						<div className='flex flex-row justify-between items-center px-5 mb-3'>
							<div className='font-bold text-lg'>
								{data.title ? data.title : t('document_no_title')}
							</div>
						</div>
						<div className='text-muted-foreground mb-3 px-5 text-sm/6'>
							{data.description
								? data.description
								: t('document_no_description')}
						</div>
						{data.creator && (
							<div
								className='flex flex-row items-center px-5 mb-3'
								onClick={() => router.push(`/user/detail/${data.creator!.id}`)}>
								<CustomImage
									src={data.creator!.avatar!}
									className='w-5 h-5 rounded-full mr-2 object-cover'
								/>
								<p className='text-xs text-muted-foreground'>
									{data.creator!.nickname}
								</p>
							</div>
						)}
						<div className='text-muted-foreground mb-3 px-5 flex flex-row gap-3 items-center text-xs'>
							<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
								{t('document_from_plat') + ': '}
								{data.from_plat}
							</div>
							<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
								{t('document_category') + ': '}
								{data.category === DocumentCategory.WEBSITE
									? t('document_category_link')
									: data.category === DocumentCategory.FILE
									? t('document_category_file')
									: data.category === DocumentCategory.QUICK_NOTE
									? t('document_category_quick_note')
									: t('document_category_others')}
							</div>
						</div>
						<div className='text-muted-foreground mb-3 px-5 flex flex-row gap-3 items-center text-xs'>
							{data.sections?.map((section) => {
								return (
									<Link
										key={section.id}
										className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'
										href={`/section/detail/${section.id}`}>
										{`${t('document_related_sections')}: ${section.title}`}
									</Link>
								);
							})}
						</div>
						{data.labels && data.labels?.length > 0 && (
							<div className='flex flex-row items-center w-full overflow-auto px-5 gap-1 mb-3'>
								{data.labels?.map((label) => {
									return (
										<div
											key={label.id}
											className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-xs text-muted-foreground'>
											{`# ${label.name}`}
										</div>
									);
								})}
							</div>
						)}
						<div className='px-5 mb-3'>
							<Separator />
						</div>
						<div className='flex flex-row flex-wrap gap-3 px-5 mb-3'>
							{data.embedding_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_embedding_status') + ': '}
										{data.embedding_task?.status ===
										DocumentEmbeddingConvertStatus.WAIT_TO
											? t('document_md_status_todo')
											: data.embedding_task?.status ===
											  DocumentEmbeddingConvertStatus.Embedding
											? t('document_md_status_doing')
											: data.embedding_task?.status ===
											  DocumentEmbeddingConvertStatus.SUCCESS
											? t('document_md_status_success')
											: t('document_md_status_failed')}
									</div>
								</div>
							)}
							{data.graph_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_graph_status') + ': '}
										{data.graph_task?.status === DocumentGraphStatus.WAIT_TO
											? t('document_graph_status_todo')
											: data.graph_task?.status === DocumentGraphStatus.BUILDING
											? t('document_graph_status_doing')
											: data.graph_task?.status === DocumentGraphStatus.SUCCESS
											? t('document_graph_status_success')
											: t('document_graph_status_failed')}
									</div>
								</div>
							)}
							{data.summarize_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_summarize_status') + ': '}
										{data.summarize_task?.status === DocumentSummarizeStatus.WAIT_TO
											? t('document_summarize_status_todo')
											: data.summarize_task?.status === DocumentSummarizeStatus.SUMMARIZING
											? t('document_summarize_status_doing')
											: data.summarize_task?.status === DocumentSummarizeStatus.SUCCESS
											? t('document_summarize_status_success')
											: t('document_summarize_status_failed')}
									</div>
								</div>
							)}
							{data.convert_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_md_status') + ': '}
										{data.convert_task?.status ===
										DocumentMdConvertStatus.WAIT_TO
											? t('document_md_status_todo')
											: data.convert_task?.status ===
											  DocumentMdConvertStatus.CONVERTING
											? t('document_md_status_doing')
											: data.convert_task?.status ===
											  DocumentMdConvertStatus.SUCCESS
											? t('document_md_status_success')
											: t('document_md_status_failed')}
									</div>
								</div>
							)}
							{data.podcast_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_podcast_status') + ': '}
										{data.podcast_task?.status === DocumentPodcastStatus.WAIT_TO
											? t('document_podcast_status_todo')
											: data.podcast_task?.status ===
											  DocumentPodcastStatus.GENERATING
											? t('document_podcast_status_doing')
											: data.podcast_task?.status ===
											  DocumentPodcastStatus.SUCCESS
											? t('document_podcast_status_success')
											: t('document_podcast_status_failed')}
									</div>
								</div>
							)}
							{data.process_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_process_status') + ': '}
										{data.process_task?.status === DocumentProcessStatus.WAIT_TO
											? t('document_process_status_todo')
											: data.process_task?.status ===
											  DocumentProcessStatus.PROCESSING
											? t('document_process_status_doing')
											: data.process_task?.status ===
											  DocumentProcessStatus.SUCCESS
											? t('document_process_status_success')
											: t('document_process_status_failed')}
									</div>
								</div>
							)}
						</div>
						<div className='px-5 mb-3'>
							<Separator />
						</div>
						<div className='text-sm rounded mx-5 mb-3'>
							<h1 className='text-lg font-bold mb-3'>{t('ai_summary')}</h1>
							{data.summarize_task && (
								<>
									{data.summarize_task.status ===
										DocumentSummarizeStatus.SUCCESS && (
										<p className='text-muted-foreground text-sm/6'>
											{data.summarize_task.summary}
										</p>
									)}
									{data.summarize_task.status ===
										DocumentSummarizeStatus.SUMMARIZING && (
										<p className='text-muted-foreground text-sm/6'>
											{t('ai_summarizing')}
										</p>
									)}
									{data.summarize_task.status ===
										DocumentSummarizeStatus.FAILED && (
										<Alert className='bg-destructive/10 dark:bg-destructive/20'>
											<AlertDescription>
												<span className='inline-flex'>
													{t('ai_summary_failed')}
												</span>
												<Button
													variant={'link'}
													size='sm'
													className='text-muted-foreground underline underline-offset-3 p-0 m-0 ml-auto'
													disabled={mutateSummaryDocument.isPending}
													title={t('ai_resummary')}
													onClick={() => {
														mutateSummaryDocument.mutate();
													}}>
													{t('ai_resummary')}
													{mutateSummaryDocument.isPending && (
														<Loader2 className='size-4 animate-spin' />
													)}
												</Button>
											</AlertDescription>
										</Alert>
									)}
								</>
							)}
							{!data.summarize_task && (
								<Alert className='bg-destructive/10 dark:bg-destructive/20'>
									<AlertDescription>
										<span className='inline-flex'>{t('ai_summary_empty')}</span>
										<Button
											variant={'link'}
											size='sm'
											className='text-muted-foreground underline underline-offset-3 p-0 m-0 ml-auto'
											disabled={mutateSummaryDocument.isPending}
											title={t('ai_summary')}
											onClick={() => {
												mutateSummaryDocument.mutate();
											}}>
											{t('ai_summary')}
											{mutateSummaryDocument.isPending && (
												<Loader2 className='size-4 animate-spin' />
											)}
										</Button>
									</AlertDescription>
								</Alert>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default DocumentInfo;
