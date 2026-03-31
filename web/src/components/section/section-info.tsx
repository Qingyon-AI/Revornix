'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { formatDistance } from 'date-fns';
import {
	AlertTriangle,
	BellRing,
	BookOpenText,
	CalendarClock,
	CalendarDays,
	type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import {
	SectionPodcastStatus,
	SectionProcessStatus,
	UserSectionAuthority,
} from '@/enums/section';
import { formatInUserTimeZone, toDate } from '@/lib/time';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { getSectionAutomationWarnings } from '@/lib/section-automation';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { useUserContext } from '@/provider/user-provider';
import { cn, replacePath } from '@/lib/utils';
import { getSectionDetail } from '@/service/section';

import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

const InfoBadge = ({ children }: { children: ReactNode }) => {
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
			<div className='flex items-center gap-2 text-xs text-muted-foreground'>
				<div className='flex size-7 items-center justify-center rounded-xl bg-background/65'>
					<Icon className='size-3.5' />
				</div>
				<span>{label}</span>
			</div>
			<div className='mt-3 text-base font-semibold'>{value}</div>
			{hint ? (
				<p className='mt-1 text-xs text-muted-foreground'>{hint}</p>
			) : null}
		</div>
	);
};

const SectionInfo = ({ id }: { id: number }) => {
	const locale = useLocale();
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { podcastEngine, imageGenerateEngine } = useDefaultResourceAccess();

	const {
		data: section,
		isFetching,
		isFetched,
	} = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	if (isFetching && !isFetched) {
		return (
			<div className='space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5'>
				<div className='space-y-4 rounded-[24px] border border-border/60 bg-background/35 p-4'>
					<div className='space-y-2'>
						<Skeleton className='h-8 w-3/4 rounded-2xl' />
						<Skeleton className='h-4 w-full rounded-full' />
						<Skeleton className='h-4 w-5/6 rounded-full' />
					</div>

					<div className='flex items-center gap-3 rounded-2xl border border-border/50 bg-background/45 px-3 py-2.5'>
						<Skeleton className='size-10 rounded-full' />
						<div className='min-w-0 flex-1 space-y-2'>
							<Skeleton className='h-4 w-28 rounded-full' />
							<Skeleton className='h-3 w-36 rounded-full' />
						</div>
					</div>
				</div>

				<div className='flex flex-wrap gap-1.5'>
					<Skeleton className='h-7 w-20 rounded-full' />
					<Skeleton className='h-7 w-24 rounded-full' />
					<Skeleton className='h-7 w-16 rounded-full' />
				</div>

				<div className='grid grid-cols-2 gap-3'>
					<Skeleton className='h-28 w-full rounded-2xl' />
					<Skeleton className='h-28 w-full rounded-2xl' />
					<Skeleton className='h-28 w-full rounded-2xl' />
					<Skeleton className='h-28 w-full rounded-2xl' />
				</div>
			</div>
		);
	}

	if (!section) return null;

	const title = section.title || t('section_title_empty');
	const description = section.description || t('section_description_empty');
	const fallbackCreator =
		section.authority === UserSectionAuthority.FULL_ACCESS && mainUserInfo
			? mainUserInfo
			: undefined;
	const creatorId = section.creator?.id ?? fallbackCreator?.id;
	const isOwner = creatorId !== undefined && creatorId === mainUserInfo?.id;
	const hasPodcastEngine =
		podcastEngine.configured && !podcastEngine.subscriptionLocked;
	const creatorNickname =
		section.creator?.nickname ?? fallbackCreator?.nickname ?? '--';
	const creatorAvatar = section.creator?.avatar ?? fallbackCreator?.avatar;
	const lastActiveAt = section.update_time ?? section.create_time;
	const lastActiveDate = toDate(lastActiveAt);
	const createdAtText =
		formatInUserTimeZone(section.create_time, 'yyyy-MM-dd') || '--';
	const createdAtHint = formatInUserTimeZone(section.create_time) || undefined;
	const lastActiveDistance = lastActiveDate
		? formatDistance(lastActiveDate, new Date(), {
				addSuffix: true,
				locale: locale === 'zh' ? zhCN : enUS,
			})
		: '--';
	const creatorCardClassName =
		'flex items-center gap-3 rounded-2xl border border-border/50 bg-background/45 px-3 py-2.5 transition-colors';
	const renderStatusBadge = (label: string, value: string) => {
		return (
			<div className='inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/45 px-3 py-1.5 text-xs text-muted-foreground'>
				<span>{label}</span>
				<span className='font-medium text-foreground'>{value}</span>
			</div>
		);
	};
	const effectivePodcastStatus =
		section.podcast_task?.status ??
		(section.auto_podcast &&
		hasPodcastEngine &&
		section.process_task &&
		section.process_task.status < SectionProcessStatus.SUCCESS
			? SectionPodcastStatus.WAIT_TO
			: undefined);
	const documentIntegrationStatus = (() => {
		const summary = section.document_integration;
		if (!summary || (section.documents_count ?? 0) <= 0) {
			return undefined;
		}

		if ((summary.supplementing_count ?? 0) > 0) {
			return t('section_document_integration_status_doing', {
				count: summary.supplementing_count ?? 0,
			});
		}
		if ((summary.failed_count ?? 0) > 0) {
			return t('section_document_integration_status_failed', {
				count: summary.failed_count ?? 0,
			});
		}
		if ((summary.wait_to_count ?? 0) > 0) {
			return t('section_document_integration_status_todo', {
				count: summary.wait_to_count ?? 0,
			});
		}
		if ((summary.success_count ?? 0) > 0) {
			return t('section_document_integration_status_success');
		}
		return undefined;
	})();
	const statusBadges = [
		section.process_task
			? renderStatusBadge(
					t('section_process_status'),
					section.process_task.status === SectionProcessStatus.WAIT_TO
						? t('section_process_status_todo')
						: section.process_task.status === SectionProcessStatus.PROCESSING
							? t('section_process_status_doing')
							: section.process_task.status === SectionProcessStatus.SUCCESS
								? t('section_process_status_success')
								: t('section_process_status_failed'),
				)
			: null,
		documentIntegrationStatus
			? renderStatusBadge(
					t('section_document_integration_status'),
					documentIntegrationStatus,
				)
			: null,
		effectivePodcastStatus !== undefined
			? renderStatusBadge(
					t('section_podcast_status'),
					effectivePodcastStatus === SectionPodcastStatus.WAIT_TO
						? t('section_podcast_status_todo')
						: effectivePodcastStatus === SectionPodcastStatus.GENERATING
							? t('section_podcast_status_doing')
							: effectivePodcastStatus === SectionPodcastStatus.SUCCESS
								? t('section_podcast_status_success')
								: t('section_podcast_status_failed'),
		)
			: null,
	].filter(Boolean);
	const automationWarnings = getSectionAutomationWarnings({
		autoPodcast: section.auto_podcast,
		autoIllustration: section.auto_illustration,
		hasPodcastEngine,
		hasImageEngine:
			imageGenerateEngine.configured &&
			!imageGenerateEngine.subscriptionLocked,
	});
	const warningMessages = isOwner
		? [
				automationWarnings.missingPodcastEngine
					? t('section_form_auto_podcast_engine_unset')
					: null,
				automationWarnings.missingIllustrationEngine
					? t('section_form_auto_illustration_engine_unset')
					: null,
			].filter((message): message is string => Boolean(message))
		: [];
	const freshnessState = getSectionFreshnessState(section);
	const staleWarningMessages = [
		freshnessState.markdownStale ? t('section_markdown_stale_warning') : null,
	].filter((message): message is string => Boolean(message));

	return (
		<div className='space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5'>
			<div className='space-y-4 rounded-[24px] border border-border/60 bg-background/35 p-4'>
				<div className='space-y-2'>
					<h2 className='break-words text-2xl font-semibold leading-9 tracking-tight'>
						{title}
					</h2>
					<p className='text-sm leading-7 text-muted-foreground'>
						{description}
					</p>
				</div>

				{creatorId !== undefined ? (
					<Link
						href={`/user/detail/${creatorId}`}
						className={`${creatorCardClassName} hover:bg-background/65`}>
						<Avatar className='size-10 ring-1 ring-border/60'>
							<AvatarImage
								src={
									creatorAvatar
										? replacePath(creatorAvatar, creatorId)
										: undefined
								}
								alt='avatar'
								className='size-10 object-cover'
							/>
							<AvatarFallback className='size-10 font-semibold'>
								{creatorNickname.slice(0, 1) ?? '?'}
							</AvatarFallback>
						</Avatar>
						<div className='min-w-0'>
							<p className='truncate text-sm font-medium'>{creatorNickname}</p>
							<p className='truncate text-xs text-muted-foreground'>
								{t('section_updated_at')}: {lastActiveDistance}
							</p>
						</div>
					</Link>
				) : (
					<div className={creatorCardClassName}>
						<Avatar className='size-10 ring-1 ring-border/60'>
							<AvatarImage
								src={undefined}
								alt='avatar'
								className='size-10 object-cover'
							/>
							<AvatarFallback className='size-10 font-semibold'>
								{creatorNickname.slice(0, 1) ?? '?'}
							</AvatarFallback>
						</Avatar>
						<div className='min-w-0'>
							<p className='truncate text-sm font-medium'>{creatorNickname}</p>
							<p className='truncate text-xs text-muted-foreground'>
								{t('section_updated_at')}: {lastActiveDistance}
							</p>
						</div>
					</div>
				)}
			</div>

			{section.labels && section.labels.length > 0 ? (
				<div className='flex flex-wrap gap-1.5'>
					{section.labels.map((label) => {
						return <InfoBadge key={label.id}>{label.name}</InfoBadge>;
					})}
				</div>
			) : null}

			<div className='grid grid-cols-2 gap-3'>
				<InfoMetric
					icon={BookOpenText}
					label={t('section_documents')}
					value={section.documents_count ?? 0}
				/>
				<InfoMetric
					icon={BellRing}
					label={t('section_subscribers')}
					value={section.subscribers_count ?? 0}
				/>
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
			</div>

			{statusBadges.length > 0 ? (
				<div className='flex flex-wrap gap-2 rounded-[24px] border border-border/60 bg-background/35 p-4'>
					{statusBadges}
				</div>
			) : null}

			{warningMessages.length + staleWarningMessages.length > 0 ? (
				<div className='space-y-2'>
					{[...warningMessages, ...staleWarningMessages].map((message, index) => (
						<Alert
							key={`${index}-${message}`}
							className='border-amber-500/30 bg-amber-500/8 text-amber-800 dark:text-amber-200'>
							<AlertTriangle className='size-4 text-current' />
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					))}
				</div>
			) : null}
		</div>
	);
};

export default SectionInfo;
