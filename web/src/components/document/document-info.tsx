'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
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

import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
	const coverSrc =
		data.cover && data.creator ? replacePath(data.cover, data.creator.id) : null;
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
	const summaryActionClassName =
		'h-auto p-0 text-sm font-medium text-muted-foreground underline underline-offset-4';
	const statusActionClassName =
		'h-auto p-0 text-xs font-medium text-muted-foreground underline underline-offset-4';

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
						: data.summarize_task.status ===
							  DocumentSummarizeStatus.SUMMARIZING
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

	return (
		<div className='space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5'>
			<div className='overflow-hidden rounded-[26px] border border-border/60 bg-background/45'>
				{coverSrc ? (
					<div className='relative'>
						<img
							src={coverSrc}
							alt={title}
							className='h-44 w-full object-cover'
						/>
						<div className='absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent' />
					</div>
				) : (
					<div className='h-36 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.16),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(15,23,42,0.25))]' />
				)}
			</div>

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
							<AvatarFallback className='size-10'>
								{data.creator.nickname}
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
					hint={lastActiveDate ? formatInUserTimeZone(lastActiveDate) : undefined}
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

			<div className='space-y-3 rounded-[24px] border border-border/60 bg-background/35 p-4'>
				<div className='flex items-center gap-2 text-sm font-semibold'>
					<Sparkles className='size-4 text-muted-foreground' />
					{t('ai_summary')}
				</div>
				{data.summarize_task ? (
					<>
						{data.summarize_task.status === DocumentSummarizeStatus.SUCCESS ? (
							<p className='text-sm leading-7 text-muted-foreground'>
								{data.summarize_task.summary}
							</p>
						) : null}
						{data.summarize_task.status ===
						DocumentSummarizeStatus.SUMMARIZING ? (
							<p className='text-sm leading-7 text-muted-foreground'>
								{t('ai_summarizing')}
							</p>
						) : null}
						{data.summarize_task.status === DocumentSummarizeStatus.FAILED ? (
							<Alert className='rounded-2xl border-destructive/30 bg-destructive/10 dark:bg-destructive/20'>
								<AlertDescription>
									<span className='inline-flex'>{t('ai_summary_failed')}</span>
									<Button
										variant='link'
										size='sm'
										className={summaryActionClassName}
										disabled={mutateSummaryDocument.isPending}
										onClick={() => {
											mutateSummaryDocument.mutate();
										}}>
										{t('ai_resummary')}
										{mutateSummaryDocument.isPending ? (
											<Loader2 className='size-4 animate-spin' />
										) : null}
									</Button>
								</AlertDescription>
							</Alert>
						) : null}
					</>
				) : (
					<Alert className='rounded-2xl border-destructive/30 bg-destructive/10 dark:bg-destructive/20'>
						<AlertDescription>
							<span className='inline-flex'>{t('ai_summary_empty')}</span>
							<Button
								variant='link'
								size='sm'
								className={summaryActionClassName}
								disabled={mutateSummaryDocument.isPending}
								onClick={() => {
									mutateSummaryDocument.mutate();
								}}>
								{t('ai_summary')}
								{mutateSummaryDocument.isPending ? (
									<Loader2 className='size-4 animate-spin' />
								) : null}
							</Button>
						</AlertDescription>
					</Alert>
				)}
			</div>
		</div>
	);
};

export default DocumentInfo;
