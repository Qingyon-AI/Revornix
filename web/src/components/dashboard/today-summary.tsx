'use client';

import { useQuery } from '@tanstack/react-query';
import { getDayDocumentsSummarySection } from '@/service/section';
import { useTranslations } from 'next-intl';
import { getLocalDateYMD, formatInUserTimeZone } from '@/lib/time';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';
import {
	Activity,
	AlertTriangle,
	AudioLines,
	ChevronRight,
	FileText,
	RefreshCcwIcon,
} from 'lucide-react';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import AudioPlayer from '@/components/ui/audio-player';
import { SectionPodcastStatus, SectionProcessStatus } from '@/enums/section';
import { cn } from '@/lib/utils';
import { getSectionAutomationWarnings } from '@/lib/section-automation';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CardTitleIcon from '@/components/ui/card-title-icon';

const TodaySummary = () => {
	const t = useTranslations();
	const { podcastEngine, imageGenerateEngine } = useDefaultResourceAccess();
	const today = getLocalDateYMD();
	const {
		data: section,
		isFetching,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ['todayDocumentSummarySection', today],
		queryFn: () => getDayDocumentsSummarySection({ date: today }),
	});
	const sectionCreated =
		section?.is_created !== false &&
		section?.section_id !== null &&
		section?.section_id !== undefined;

	const getProcessState = () => {
		if (!sectionCreated) {
			return {
				label: t('dashboard_today_summary_process_ready'),
				className:
					'border-muted-foreground/20 bg-muted/40 text-muted-foreground',
			};
		}
		if (!section?.process_task) {
			return {
				label: t('dashboard_today_summary_process_ready'),
				className:
					'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
			};
		}

		if (section.process_task.status === SectionProcessStatus.PROCESSING) {
			return {
				label: t('dashboard_today_summary_process_processing'),
				className:
					'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
			};
		}

		if (section.process_task.status === SectionProcessStatus.FAILED) {
			return {
				label: t('dashboard_today_summary_process_failed'),
				className:
					'border-destructive/20 bg-destructive/10 text-destructive',
			};
		}

		return {
			label: t('dashboard_today_summary_process_success'),
			className:
				'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
		};
	};

	const getAudioState = () => {
		if (!sectionCreated) {
			return t('dashboard_today_summary_audio_empty');
		}
		if (!section?.podcast_task) {
			return t('dashboard_today_summary_audio_empty');
		}
		if (section.podcast_task.status === SectionPodcastStatus.GENERATING) {
			return t('dashboard_today_summary_audio_processing');
		}
		if (section.podcast_task.status === SectionPodcastStatus.FAILED) {
			return t('dashboard_today_summary_audio_failed');
		}
		if (section.podcast_task.podcast_file_name) {
			return t('dashboard_today_summary_audio_ready');
		}
		return t('dashboard_today_summary_audio_empty');
	};

	const getAudioHint = () => {
		if (!sectionCreated) {
			return t('dashboard_today_summary_not_created_description');
		}
		if (!section?.podcast_task) {
			return t('dashboard_today_summary_audio_unavailable_hint');
		}
		if (section.podcast_task.status === SectionPodcastStatus.GENERATING) {
			return t('section_podcast_processing');
		}
		if (section.podcast_task.status === SectionPodcastStatus.FAILED) {
			return t('section_podcast_failed');
		}
		return t('dashboard_today_summary_audio_unavailable_hint');
	};

	const processState = getProcessState();
	const hasPodcastEngine =
		podcastEngine.configured && !podcastEngine.subscriptionLocked;
	const hasImageEngine =
		imageGenerateEngine.configured &&
		!imageGenerateEngine.subscriptionLocked;
	const automationWarnings = getSectionAutomationWarnings({
		autoPodcast: section?.auto_podcast ?? true,
		autoIllustration: section?.auto_illustration ?? true,
		hasPodcastEngine,
		hasImageEngine,
	});
	const warningItems = [
		(sectionCreated
			? automationWarnings.missingPodcastEngine
			: !hasPodcastEngine)
			? {
					label: t('section_card_warning_missing_podcast_engine'),
					href: '/setting#default_user_podcast_engine_choose',
				}
			: null,
		(sectionCreated
			? automationWarnings.missingIllustrationEngine
			: !hasImageEngine)
			? {
					label: t('section_card_warning_missing_illustration_engine'),
					href: '/setting#default_document_summary_model_choose',
				}
			: null,
	].filter(
		(
			item,
		): item is {
			label: string;
			href: string;
		} => Boolean(item),
	);
	const summaryHref =
		sectionCreated && section?.section_id
			? `/section/detail/${section.section_id}`
			: null;
	const automationNotice =
		warningItems.length > 0 ? (
			<div className='flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/6 px-3 py-2'>
				<div className='inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300'>
					<AlertTriangle className='size-3.5' />
					<span>{t('dashboard_today_summary_automation_notice')}</span>
				</div>
				<div className='flex flex-wrap gap-2'>
					{warningItems.map((warning) => (
						<Link
							key={warning.label}
							href={warning.href}
							className='inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:border-amber-500/45 hover:bg-amber-500/8 dark:text-amber-300'>
							<AlertTriangle className='size-3.5' />
							<span>{warning.label}</span>
						</Link>
					))}
				</div>
			</div>
		) : null;

	return (
		<Card className='rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm'>
			<CardHeader className='flex flex-row items-start justify-between gap-4'>
				<div className='flex flex-col gap-1.5'>
					<CardTitle className='flex items-center gap-3'>
						<CardTitleIcon icon={FileText} tone='emerald' />
						<span>{t('dashboard_today_summary')}</span>
					</CardTitle>
					<CardDescription>
						{t('dashboard_today_summary_description')}
					</CardDescription>
					{automationNotice}
				</div>
				{summaryHref ? (
					<Link href={summaryHref}>
						<Button variant='ghost' className='text-sm text-muted-foreground'>
							{t('dashboard_today_summary_full')}
							<ChevronRight />
						</Button>
					</Link>
				) : (
					<Button
						variant='ghost'
						className='text-sm text-muted-foreground'
						disabled>
						{t('dashboard_today_summary_full')}
						<ChevronRight />
					</Button>
				)}
			</CardHeader>
			<CardContent className='flex-1'>
				{isFetching && !section && <Skeleton className='h-48 w-full rounded-2xl' />}
				{isError && (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<AlertTriangle />
							</EmptyMedia>
							<EmptyDescription>{error?.message}</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button
								variant='outline'
								size='sm'
								onClick={() => {
									refetch();
								}}>
								<RefreshCcwIcon />
								{t('refresh')}
							</Button>
						</EmptyContent>
					</Empty>
				)}
				{section && !isError && !sectionCreated && (
					<div className='flex h-full flex-col'>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<FileText />
								</EmptyMedia>
								<EmptyDescription>
									{t('dashboard_today_summary_not_created')}
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button
									variant='outline'
									size='sm'
									onClick={() => {
										refetch();
									}}>
									<RefreshCcwIcon />
									{t('refresh')}
								</Button>
							</EmptyContent>
						</Empty>
					</div>
				)}
				{section && !isError && sectionCreated && (
					<div className='flex h-full flex-col gap-4'>
						<div className='flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4'>
							<div className='flex items-start justify-between gap-3'>
								<div className='min-w-0'>
									<p className='text-[11px] uppercase tracking-[0.22em] text-muted-foreground'>
										{section.date}
									</p>
									<h3 className='truncate text-lg font-semibold'>
										{section.title}
									</h3>
								</div>
								<Badge variant='outline' className={cn(processState.className)}>
									{processState.label}
								</Badge>
							</div>

							<div className='grid grid-cols-2 gap-3 min-[560px]:grid-cols-4'>
								<div className='rounded-xl border border-border/50 bg-background/60 p-3'>
									<div className='mb-1 flex items-center gap-2 text-xs text-muted-foreground'>
										<FileText className='size-3.5' />
										<span>{t('dashboard_today_summary_field_documents')}</span>
									</div>
									<div className='text-sm font-medium'>
										{section.documents?.length ?? 0}
									</div>
								</div>

								<div className='rounded-xl border border-border/50 bg-background/60 p-3'>
									<div className='mb-1 flex items-center gap-2 text-xs text-muted-foreground'>
										<Activity className='size-3.5' />
										<span>{t('dashboard_today_summary_field_updated')}</span>
									</div>
									<div className='text-sm font-medium'>
										{formatInUserTimeZone(
											section.update_time ?? section.create_time,
											'MM-dd HH:mm',
										)}
									</div>
								</div>

								<div className='rounded-xl border border-border/50 bg-background/60 p-3'>
									<div className='mb-1 flex items-center gap-2 text-xs text-muted-foreground'>
										<Activity className='size-3.5' />
										<span>{t('dashboard_today_summary_field_process')}</span>
									</div>
									<div className='text-sm font-medium'>{processState.label}</div>
								</div>

								<div className='rounded-xl border border-border/50 bg-background/60 p-3'>
									<div className='mb-1 flex items-center gap-2 text-xs text-muted-foreground'>
										<AudioLines className='size-3.5' />
										<span>{t('dashboard_today_summary_field_audio')}</span>
									</div>
									<div className='text-sm font-medium'>{getAudioState()}</div>
								</div>
							</div>
						</div>

						{section.podcast_task?.status === SectionPodcastStatus.SUCCESS &&
						section.podcast_task.podcast_file_name ? (
							<AudioPlayer
								src={section.podcast_task.podcast_file_name}
								title={section.title || t('dashboard_today_summary')}
								artist='AI Generated'
								variant='compact'
							/>
						) : (
							<Alert className='border-border/60 bg-muted/20'>
								<AudioLines className='text-muted-foreground' />
								<AlertDescription>{getAudioHint()}</AlertDescription>
							</Alert>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default TodaySummary;
