'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	AlertTriangle,
	BookMarked,
	CalendarClock,
	CalendarDays,
	Globe2,
	Layers3,
	Loader2,
	Sparkles,
	type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { formatInUserTimeZone, toDate } from '@/lib/time';
import { getQueryClient } from '@/lib/get-query-client';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import { cn, replacePath } from '@/lib/utils';
import {
	embeddingDocument,
	getDocumentDetail,
	summaryDocumentContentByAi,
} from '@/service/document';
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

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import TaskStateCard from '../ui/task-state-card';
import AIModelSelect from '@/components/ai/model-select';
import { useUserContext } from '@/provider/user-provider';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';

const MetaBadge = ({ children }: { children: ReactNode }) => {
	return (
		<Badge
			variant='outline'
			className={cn(
				'rounded-full border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-none',
			)}>
			{children}
		</Badge>
	);
};

const InfoMetric = ({
	icon: Icon,
	label,
	value,
	hint,
}: {
	icon: LucideIcon;
	label: string;
	value: ReactNode;
	hint?: string;
}) => {
	return (
		<div className='rounded-2xl border border-border/60 bg-background/35 p-3'>
			<div className='flex items-center text-xs text-muted-foreground'>
				<div className='flex size-7 items-center justify-center rounded-xl bg-background/65'>
					<Icon className='size-3.5' />
				</div>
				<span>{label}</span>
			</div>
			<div className='break-words text-sm font-semibold'>{value}</div>
			{hint ? <p className='text-xs text-muted-foreground'>{hint}</p> : null}
		</div>
	);
};

const DocumentInfo = ({ id }: { id: number }) => {
	const t = useTranslations();
	const locale = useLocale();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const [selectedSummaryModelId, setSelectedSummaryModelId] = useState<number | null>(
		mainUserInfo?.default_document_reader_model_id ?? null,
	);
	const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

	useEffect(() => {
		setSelectedSummaryModelId(
			mainUserInfo?.default_document_reader_model_id ?? null,
		);
	}, [mainUserInfo?.default_document_reader_model_id]);

	const { data, isPending, isError, error } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const mutateSummaryDocument = useMutation({
		mutationFn: () =>
			summaryDocumentContentByAi({
				document_id: id,
				model_id: selectedSummaryModelId ?? undefined,
			}),
		onSuccess() {
			setIsSummaryDialogOpen(false);
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

	if (isError && error) {
		return (
			<div className='flex h-full min-h-[24rem] items-center justify-center px-6 text-center text-sm text-muted-foreground'>
				{error.message}
			</div>
		);
	}

	if (isPending) {
		return <Skeleton className='h-[36rem] w-full rounded-[30px]' />;
	}

	if (!data) return null;

	const title = data.title || t('document_no_title');
	const description = data.description || t('document_no_description');
	const lastActiveAt = data.update_time ?? data.create_time;
	const lastActiveDate = toDate(lastActiveAt);
	const createdAtText =
		formatInUserTimeZone(data.create_time, 'yyyy-MM-dd') || '--';
	const createdAtHint = formatInUserTimeZone(data.create_time) || undefined;
	const lastActiveDistance = lastActiveDate
		? formatDistance(lastActiveDate, new Date(), {
				addSuffix: true,
				locale: locale === 'zh' ? zhCN : enUS,
			})
		: '--';
	const categoryLabel =
		data.category === DocumentCategory.WEBSITE
			? t('document_category_link')
			: data.category === DocumentCategory.FILE
				? t('document_category_file')
				: data.category === DocumentCategory.QUICK_NOTE
					? t('document_category_quick_note')
					: data.category === DocumentCategory.AUDIO
						? t('document_category_audio')
						: t('document_category_others');
	const fromPlatLabel = data.from_plat || '-';
	const statusActionClassName =
		'h-auto p-0 text-xs font-medium text-muted-foreground underline underline-offset-4';
	const freshnessState = getDocumentFreshnessState(data);
	const warningMessages = [
		freshnessState.summaryStale ? t('document_summary_stale_warning') : null,
		freshnessState.graphStale ? t('document_graph_stale_warning') : null,
		freshnessState.podcastStale ? t('document_podcast_stale_warning') : null,
	].filter((message): message is string => Boolean(message));

	const renderStatusBadge = (
		label: string,
		value: string,
		action?: ReactNode,
	) => {
		return (
			<div className='inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/45 px-3 py-1.5 text-xs text-muted-foreground'>
				<span>{label}</span>
				<span className='font-medium text-foreground'>{value}</span>
				{action ? (
					<>
						<span className='text-border'>/</span>
						{action}
					</>
				) : null}
			</div>
		);
	};

	const statusBadges = [
		data.embedding_task
			? renderStatusBadge(
					t('document_embedding_status'),
					data.embedding_task.status === DocumentEmbeddingStatus.WAIT_TO
						? t('document_embedding_status_todo')
						: data.embedding_task.status === DocumentEmbeddingStatus.Embedding
							? t('document_embedding_status_doing')
							: data.embedding_task.status === DocumentEmbeddingStatus.SUCCESS
								? t('document_embedding_status_success')
								: t('document_embedding_status_failed'),
					data.embedding_task.status === DocumentEmbeddingStatus.FAILED ? (
						<Button
							variant='link'
							size='sm'
							className={statusActionClassName}
							disabled={mutateEmbeddingDocument.isPending}
							onClick={() => {
								mutateEmbeddingDocument.mutate();
							}}>
							{t('ai_reembedding')}
							{mutateEmbeddingDocument.isPending ? (
								<Loader2 className='size-3.5 animate-spin' />
							) : null}
						</Button>
					) : undefined,
				)
			: null,
		data.transcribe_task
			? renderStatusBadge(
					t('document_transcribe_status'),
					data.transcribe_task.status === DocumentTranscribeStatus.WAIT_TO
						? t('document_transcribe_status_todo')
						: data.transcribe_task.status ===
							  DocumentTranscribeStatus.TRANSCRIBING
							? t('document_transcribe_status_doing')
							: data.transcribe_task.status === DocumentTranscribeStatus.SUCCESS
								? t('document_transcribe_status_success')
								: t('document_transcribe_status_failed'),
				)
			: null,
		data.graph_task
			? renderStatusBadge(
					t('document_graph_status'),
					data.graph_task.status === DocumentGraphStatus.WAIT_TO
						? t('document_graph_status_todo')
						: data.graph_task.status === DocumentGraphStatus.BUILDING
							? t('document_graph_status_doing')
							: data.graph_task.status === DocumentGraphStatus.SUCCESS
								? t('document_graph_status_success')
								: t('document_graph_status_failed'),
				)
			: null,
		data.summarize_task
			? renderStatusBadge(
					t('document_summarize_status'),
					data.summarize_task.status === DocumentSummarizeStatus.WAIT_TO
						? t('document_summarize_status_todo')
						: data.summarize_task.status === DocumentSummarizeStatus.SUMMARIZING
							? t('document_summarize_status_doing')
							: data.summarize_task.status === DocumentSummarizeStatus.SUCCESS
								? t('document_summarize_status_success')
								: t('document_summarize_status_failed'),
				)
			: null,
		data.convert_task
			? renderStatusBadge(
					t('document_md_status'),
					data.convert_task.status === DocumentMdConvertStatus.WAIT_TO
						? t('document_md_status_todo')
						: data.convert_task.status === DocumentMdConvertStatus.CONVERTING
							? t('document_md_status_doing')
							: data.convert_task.status === DocumentMdConvertStatus.SUCCESS
								? t('document_md_status_success')
								: t('document_md_status_failed'),
				)
			: null,
		data.podcast_task
			? renderStatusBadge(
					t('document_podcast_status'),
					data.podcast_task.status === DocumentPodcastStatus.WAIT_TO
						? t('document_podcast_status_todo')
						: data.podcast_task.status === DocumentPodcastStatus.GENERATING
							? t('document_podcast_status_doing')
							: data.podcast_task.status === DocumentPodcastStatus.SUCCESS
								? t('document_podcast_status_success')
								: t('document_podcast_status_failed'),
				)
			: null,
		data.process_task
			? renderStatusBadge(
					t('document_process_status'),
					data.process_task.status === DocumentProcessStatus.WAIT_TO
						? t('document_process_status_todo')
						: data.process_task.status === DocumentProcessStatus.PROCESSING
							? t('document_process_status_doing')
							: data.process_task.status === DocumentProcessStatus.SUCCESS
								? t('document_process_status_success')
								: t('document_process_status_failed'),
				)
			: null,
	].filter(Boolean);

	const summaryActionButton = (
		<Button
			variant='outline'
			className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
			disabled={mutateSummaryDocument.isPending}
			onClick={() => {
				setIsSummaryDialogOpen(true);
			}}>
			{mutateSummaryDocument.isPending ? (
				<Loader2 className='size-4 animate-spin' />
			) : null}
			{data.summarize_task ? t('ai_resummary') : t('ai_summary')}
		</Button>
	);

	const renderSummaryCard = () => {
		if (!data.summarize_task) {
			return (
				<TaskStateCard
					variant='panel'
					icon={Sparkles}
					badge={t('document_summarize_status_todo')}
					title={t('ai_summary_empty')}
					description={t('ai_summary_empty_description')}
					tone='warning'
					action={summaryActionButton}
				/>
			);
		}

		if (data.summarize_task.status === DocumentSummarizeStatus.WAIT_TO) {
			return (
				<TaskStateCard
					variant='panel'
					icon={Sparkles}
					badge={t('document_summarize_status_todo')}
					title={t('ai_summary_wait_to')}
					description={t('ai_summary_wait_to_description')}
					tone='warning'
				/>
			);
		}

		if (data.summarize_task.status === DocumentSummarizeStatus.SUMMARIZING) {
			return (
				<TaskStateCard
					variant='panel'
					icon={Loader2}
					badge={t('document_summarize_status_doing')}
					title={t('ai_summarizing')}
					description={t('ai_summary_processing_description')}
					tone='default'
					spinning
				/>
			);
		}

		if (data.summarize_task.status === DocumentSummarizeStatus.FAILED) {
			return (
				<TaskStateCard
					variant='panel'
					icon={Sparkles}
					badge={t('document_summarize_status_failed')}
					title={t('ai_summary_failed')}
					description={t('ai_summary_failed_description')}
					tone='danger'
					action={summaryActionButton}
				/>
			);
		}

		return (
			<TaskStateCard
				variant='panel'
				icon={Sparkles}
				badge={t('document_summarize_status_success')}
				title={t('ai_summary_ready')}
				tone={freshnessState.summaryStale ? 'warning' : 'success'}
				hint={
					freshnessState.summaryStale
						? t('document_summary_stale_hint')
						: undefined
				}
				action={summaryActionButton}
				bodyClassName='px-3.5 pb-3.5 pt-3'>
				<div className='rounded-[16px] border border-border/60 bg-background/45 px-3.5 py-3 text-sm leading-7 text-muted-foreground'>
					{data.summarize_task.summary}
				</div>
			</TaskStateCard>
		);
	};

	return (
		<>
		<div className='space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5'>
			<div className='space-y-4 rounded-[24px] border border-border/60 bg-background/35 p-4'>
				<div className='space-y-2'>
					<h2 className='break-words text-2xl font-semibold leading-9 tracking-tight'>
						{title}
					</h2>
					<p className='break-words text-sm leading-7 text-muted-foreground'>
						{description}
					</p>
				</div>

				{data.creator ? (
					<Link
						href={`/user/detail/${data.creator.id}`}
						className='group flex items-center gap-3 rounded-2xl border border-border/50 bg-background/45 px-3 py-2.5 transition-colors hover:bg-background/65'>
						<Avatar className='size-10 ring-1 ring-border/60'>
							<AvatarImage
								src={replacePath(data.creator.avatar, data.creator.id)}
								alt='avatar'
								className='size-10 object-cover'
							/>
							<AvatarFallback className='size-10 font-semibold'>
								{data.creator.nickname.slice(0, 1) ?? '?'}
							</AvatarFallback>
						</Avatar>
						<div className='min-w-0'>
							<p className='truncate text-sm font-medium transition-colors group-hover:text-foreground'>
								{data.creator.nickname}
							</p>
							<p className='truncate text-xs text-muted-foreground'>
								{t('section_updated_at')}: {lastActiveDistance}
							</p>
						</div>
					</Link>
				) : null}

				<div className='flex flex-wrap gap-1.5'>
					<MetaBadge>
						{t('document_category')}: {categoryLabel}
					</MetaBadge>
					<MetaBadge>
						{t('document_from_plat')}: {fromPlatLabel}
					</MetaBadge>
				</div>
			</div>

			{data.sections && data.sections.length > 0 ? (
				<div className='space-y-3 rounded-[24px] border border-border/60 bg-background/35 p-4'>
					<div className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
						<BookMarked className='size-3.5' />
						<p>{t('document_related_sections')}</p>
					</div>
					<div className='flex flex-wrap gap-2'>
						{data.sections.map((section) => {
							return (
								<Link
									key={section.id}
									href={`/section/detail/${section.id}`}
									className='inline-flex items-center rounded-full border border-border/60 bg-background/55 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background/85 hover:text-foreground'>
									<BookMarked className='mr-1.5 size-3.5' />
									{section.title}
								</Link>
							);
						})}
					</div>
				</div>
			) : null}

			{data.labels && data.labels.length > 0 ? (
				<div className='flex flex-wrap gap-1.5'>
					{data.labels.map((label) => {
						return <MetaBadge key={label.id}># {label.name}</MetaBadge>;
					})}
				</div>
			) : null}

			<div className='grid grid-cols-2 gap-3'>
				<InfoMetric
					icon={CalendarClock}
					label={t('section_updated_at')}
					value={lastActiveDistance}
					hint={
						lastActiveDate ? formatInUserTimeZone(lastActiveDate) : undefined
					}
				/>
				<InfoMetric
					icon={CalendarDays}
					label={t('section_info_created_at')}
					value={createdAtText}
					hint={createdAtHint}
				/>
				<InfoMetric
					icon={Layers3}
					label={t('document_category')}
					value={categoryLabel}
				/>
				<InfoMetric
					icon={Globe2}
					label={t('document_from_plat')}
					value={fromPlatLabel}
				/>
			</div>

			{statusBadges.length > 0 ? (
				<div className='flex flex-wrap gap-2 rounded-[24px] border border-border/60 bg-background/35 p-4'>
					{statusBadges}
				</div>
			) : null}

			{warningMessages.length > 0 ? (
				<div className='space-y-2'>
					{warningMessages.map((message) => (
						<Alert
							key={message}
							className='border-amber-500/30 bg-amber-500/8 text-amber-800 dark:text-amber-200'>
							<AlertTriangle className='size-4 text-current' />
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					))}
				</div>
			) : null}

			{renderSummaryCard()}
		</div>
		<ResourceConfirmDialog
			open={isSummaryDialogOpen}
			onOpenChange={setIsSummaryDialogOpen}
			title={data.summarize_task ? t('ai_resummary') : t('ai_summary')}
			description={t('resource_dialog_summary_description')}
			confirmLabel={data.summarize_task ? t('ai_resummary') : t('ai_summary')}
			confirmDisabled={!selectedSummaryModelId}
			confirmLoading={mutateSummaryDocument.isPending}
			onConfirm={() => {
				mutateSummaryDocument.mutate();
			}}>
			<div className='space-y-2'>
				<p className='text-sm font-medium text-foreground'>{t('use_model')}</p>
				<AIModelSelect
					value={selectedSummaryModelId}
					onChange={setSelectedSummaryModelId}
					className='w-full'
					placeholder={t('setting_default_model_choose')}
				/>
			</div>
		</ResourceConfirmDialog>
		</>
	);
};

export default DocumentInfo;
