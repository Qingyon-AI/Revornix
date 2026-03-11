'use client';

import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	embeddingDocument,
	getDocumentDetail,
	summaryDocumentContentByAi,
} from '@/service/document';
import { useRouter } from 'nextjs-toploader/app';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
	DocumentCategory,
	DocumentEmbeddingStatus,
	DocumentGraphStatus,
	DocumentMdConvertStatus,
	DocumentPodcastStatus,
	DocumentProcessStatus,
	DocumentSummarizeStatus,
	DocumentTranscribeStatus,
} from '@/enums/document';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { replacePath } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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
		onSuccess() {
			toast.success(t('ai_summary_submit'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', id],
			});
		},
		onError(error) {
			toast.error(error.message);
			console.error(error);
		},
	});

	const mutateEmbeddingDocument = useMutation({
		mutationFn: () =>
			embeddingDocument({
				document_id: id,
			}),
		onSuccess() {
			toast.success(t('ai_embedding_submit'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', id],
			});
		},
		onError(error) {
			toast.error(error.message);
			console.error(error);
		},
	});

	const chipClassName =
		'w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground';
	const linkButtonClassName =
		'm-0 h-fit p-0 text-xs font-normal text-muted-foreground underline underline-offset-3';
	const summaryButtonClassName =
		'm-0 ml-auto p-0 text-muted-foreground underline underline-offset-3';
	const panelClassName = 'rounded-xl border border-border/50 bg-card/70 p-4';
	const compactPanelClassName =
		'rounded-xl border border-border/50 bg-card/70 p-3';

	const renderStatusBadge = (
		label: string,
		value: string,
		action?: ReactNode,
	) => {
		return (
			<div className='flex flex-row items-center gap-1 text-xs text-muted-foreground'>
				<div className={chipClassName}>
					{label}: {value}
					{action}
				</div>
			</div>
		);
	};

	return (
		<>
			{isError && error && (
				<div className='flex h-full w-full items-center justify-center text-sm text-muted-foreground'>
					{error.message}
				</div>
			)}
			{isPending && <Skeleton className='h-full w-full' />}
			{data && (
				<div className='h-full overflow-auto'>
					<div className='space-y-4 px-4 pb-4'>
						<div className={panelClassName}>
							<div className='space-y-4'>
								<div className='font-bold text-lg'>
									{data.title ? data.title : t('document_no_title')}
								</div>
								<div className='text-sm/6 text-muted-foreground'>
									{data.description
										? data.description
										: t('document_no_description')}
								</div>
								{data.creator && (
									<div
										className='flex flex-row items-center gap-2'
										onClick={() =>
											router.push(`/user/detail/${data.creator.id}`)
										}>
										<Avatar
											className='size-6'
											title={data.creator.nickname ?? ''}
											onClick={(e) => {
												router.push(`/user/detail/${data.creator.id}`);
												e.preventDefault();
												e.stopPropagation();
											}}>
											<AvatarImage
												src={replacePath(data.creator.avatar, data.creator.id)}
												alt='avatar'
												className='size-6 object-cover'
											/>
											<AvatarFallback className='size-6'>
												{data.creator.nickname}
											</AvatarFallback>
										</Avatar>
										<p className='text-xs text-muted-foreground'>
											{data.creator.nickname}
										</p>
									</div>
								)}
								<div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
									<div className={chipClassName}>
										{t('document_from_plat')}: {data.from_plat}
									</div>
									<div className={chipClassName}>
										{t('document_category')}:{' '}
										{data.category === DocumentCategory.WEBSITE
											? t('document_category_link')
											: data.category === DocumentCategory.FILE
												? t('document_category_file')
												: data.category === DocumentCategory.QUICK_NOTE
													? t('document_category_quick_note')
													: data.category === DocumentCategory.AUDIO
														? t('document_category_audio')
														: t('document_category_others')}
									</div>
								</div>
							</div>
						</div>
						{data.sections && data.sections.length > 0 && (
							<div className={compactPanelClassName}>
								<div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
									{data.sections.map((section) => {
										return (
											<Link
												key={section.id}
												className={chipClassName}
												href={`/section/detail/${section.id}`}>
												{`${t('document_related_sections')}: ${section.title}`}
											</Link>
										);
									})}
								</div>
							</div>
						)}
						{data.labels && data.labels.length > 0 && (
							<div className={compactPanelClassName}>
								<div className='flex w-full flex-wrap gap-2 overflow-auto text-xs text-muted-foreground'>
									{data.labels.map((label) => {
										return (
											<div key={label.id} className={chipClassName}>
												{`# ${label.name}`}
											</div>
										);
									})}
								</div>
							</div>
						)}
						<div className={compactPanelClassName}>
							<div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
								{data.embedding_task &&
									renderStatusBadge(
										t('document_embedding_status'),
										data.embedding_task.status ===
											DocumentEmbeddingStatus.WAIT_TO
											? t('document_embedding_status_todo')
											: data.embedding_task.status ===
												  DocumentEmbeddingStatus.Embedding
												? t('document_embedding_status_doing')
												: data.embedding_task.status ===
													  DocumentEmbeddingStatus.SUCCESS
													? t('document_embedding_status_success')
													: t('document_embedding_status_failed'),
										data.embedding_task.status ===
											DocumentEmbeddingStatus.FAILED ? (
											<>
												<span className='mx-1.5 text-muted-foreground'>|</span>
												<Button
													variant='link'
													size='sm'
													className={linkButtonClassName}
													disabled={mutateEmbeddingDocument.isPending}
													title={t('ai_reembedding')}
													onClick={() => {
														mutateEmbeddingDocument.mutate();
													}}>
													{t('ai_reembedding')}
													{mutateEmbeddingDocument.isPending && (
														<Loader2 className='size-4 animate-spin' />
													)}
												</Button>
											</>
										) : undefined,
									)}
								{data.transcribe_task &&
									renderStatusBadge(
										t('document_transcribe_status'),
										data.transcribe_task.status ===
											DocumentTranscribeStatus.WAIT_TO
											? t('document_transcribe_status_todo')
											: data.transcribe_task.status ===
												  DocumentTranscribeStatus.TRANSCRIBING
												? t('document_transcribe_status_doing')
												: data.transcribe_task.status ===
													  DocumentTranscribeStatus.SUCCESS
													? t('document_transcribe_status_success')
													: t('document_transcribe_status_failed'),
									)}
								{data.graph_task &&
									renderStatusBadge(
										t('document_graph_status'),
										data.graph_task.status === DocumentGraphStatus.WAIT_TO
											? t('document_graph_status_todo')
											: data.graph_task.status === DocumentGraphStatus.BUILDING
												? t('document_graph_status_doing')
												: data.graph_task.status === DocumentGraphStatus.SUCCESS
													? t('document_graph_status_success')
													: t('document_graph_status_failed'),
									)}
								{data.summarize_task &&
									renderStatusBadge(
										t('document_summarize_status'),
										data.summarize_task.status ===
											DocumentSummarizeStatus.WAIT_TO
											? t('document_summarize_status_todo')
											: data.summarize_task.status ===
												  DocumentSummarizeStatus.SUMMARIZING
												? t('document_summarize_status_doing')
												: data.summarize_task.status ===
													  DocumentSummarizeStatus.SUCCESS
													? t('document_summarize_status_success')
													: t('document_summarize_status_failed'),
									)}
								{data.convert_task &&
									renderStatusBadge(
										t('document_md_status'),
										data.convert_task.status === DocumentMdConvertStatus.WAIT_TO
											? t('document_md_status_todo')
											: data.convert_task.status ===
												  DocumentMdConvertStatus.CONVERTING
												? t('document_md_status_doing')
												: data.convert_task.status ===
													  DocumentMdConvertStatus.SUCCESS
													? t('document_md_status_success')
													: t('document_md_status_failed'),
									)}
								{data.podcast_task &&
									renderStatusBadge(
										t('document_podcast_status'),
										data.podcast_task.status === DocumentPodcastStatus.WAIT_TO
											? t('document_podcast_status_todo')
											: data.podcast_task.status ===
												  DocumentPodcastStatus.GENERATING
												? t('document_podcast_status_doing')
												: data.podcast_task.status ===
													  DocumentPodcastStatus.SUCCESS
													? t('document_podcast_status_success')
													: t('document_podcast_status_failed'),
									)}
								{data.process_task &&
									renderStatusBadge(
										t('document_process_status'),
										data.process_task.status === DocumentProcessStatus.WAIT_TO
											? t('document_process_status_todo')
											: data.process_task.status ===
												  DocumentProcessStatus.PROCESSING
												? t('document_process_status_doing')
												: data.process_task.status ===
													  DocumentProcessStatus.SUCCESS
													? t('document_process_status_success')
													: t('document_process_status_failed'),
									)}
							</div>
						</div>
						<div className={panelClassName}>
							<h1 className='mb-3 text-lg font-bold'>{t('ai_summary')}</h1>
							{data.summarize_task && (
								<>
									{data.summarize_task.status ===
										DocumentSummarizeStatus.SUCCESS && (
										<p className='text-sm/6 text-muted-foreground'>
											{data.summarize_task.summary}
										</p>
									)}
									{data.summarize_task.status ===
										DocumentSummarizeStatus.SUMMARIZING && (
										<p className='text-sm/6 text-muted-foreground'>
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
													variant='link'
													size='sm'
													className={summaryButtonClassName}
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
											variant='link'
											size='sm'
											className={summaryButtonClassName}
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
