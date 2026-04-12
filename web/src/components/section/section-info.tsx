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
		<div className='rounded-2xl border border-border/50 bg-background/20 px-3 py-2.5'>
			<div className='flex items-start gap-2.5'>
				<div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-background/55 text-muted-foreground'>
					<Icon className='size-3.5' />
				</div>
				<div className='min-w-0 space-y-0.5'>
					<p className='text-[11px] leading-5 text-muted-foreground'>{label}</p>
					<div className='text-sm font-semibold leading-5'>{value}</div>
					{hint ? (
						<p className='truncate text-[11px] leading-5 text-muted-foreground/85'>
							{hint}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
};

const SectionInfo = ({ id }: { id: number }) => {
	const locale = useLocale();
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();

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
				<div className='space-y-4'>
					<div className='space-y-2'>
						<Skeleton className='h-9 w-[78%] rounded-2xl' />
						<Skeleton className='h-4 w-24 rounded-full' />
						<Skeleton className='h-4 w-full rounded-full' />
						<Skeleton className='h-4 w-[84%] rounded-full' />
					</div>

					<div className='flex items-center gap-3 rounded-2xl border border-border/50 bg-background/45 px-3 py-2.5'>
						<Skeleton className='size-10 rounded-full' />
						<div className='min-w-0 flex-1 space-y-2'>
							<Skeleton className='h-4 w-28 rounded-full' />
							<Skeleton className='h-3 w-24 rounded-full' />
						</div>
					</div>
				</div>

				<div className='flex flex-wrap gap-1.5'>
					<Skeleton className='h-7 w-20 rounded-full' />
					<Skeleton className='h-7 w-24 rounded-full' />
					<Skeleton className='h-7 w-16 rounded-full' />
				</div>

				<div className='grid grid-cols-2 gap-3'>
					{Array.from({ length: 4 }).map((_, index) => (
						<div
							key={index}
							className='rounded-2xl border border-border/50 bg-background/20 px-3 py-2.5'>
							<div className='flex items-start gap-2.5'>
								<Skeleton className='size-6 shrink-0 rounded-lg' />
								<div className='min-w-0 flex-1 space-y-1.5'>
									<Skeleton className='h-3 w-18 rounded-full' />
									<Skeleton className='h-4 w-24 rounded-full' />
									<Skeleton className='h-3 w-28 rounded-full' />
								</div>
							</div>
						</div>
					))}
				</div>

				<div className='flex flex-wrap gap-2 rounded-[24px] border border-border/60 bg-background/35 p-4'>
					<Skeleton className='h-9 w-32 rounded-full' />
					<Skeleton className='h-9 w-36 rounded-full' />
					<Skeleton className='h-9 w-32 rounded-full' />
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
	const effectivePodcastStatus = section.podcast_task?.status;
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
			? {
					key: 'process',
					node: renderStatusBadge(
						t('section_process_status'),
						section.process_task.status === SectionProcessStatus.WAIT_TO
							? t('section_process_status_todo')
							: section.process_task.status === SectionProcessStatus.PROCESSING
								? t('section_process_status_doing')
								: section.process_task.status === SectionProcessStatus.SUCCESS
									? t('section_process_status_success')
									: t('section_process_status_failed'),
					),
				}
			: null,
		documentIntegrationStatus
			? {
					key: 'document-integration',
					node: renderStatusBadge(
						t('section_document_integration_status'),
						documentIntegrationStatus,
					),
				}
			: null,
		effectivePodcastStatus !== undefined
			? {
					key: 'podcast',
					node: renderStatusBadge(
						t('section_podcast_status'),
						effectivePodcastStatus === SectionPodcastStatus.WAIT_TO
							? t('section_podcast_status_todo')
							: effectivePodcastStatus === SectionPodcastStatus.GENERATING
								? t('section_podcast_status_doing')
								: effectivePodcastStatus === SectionPodcastStatus.SUCCESS
									? t('section_podcast_status_success')
									: t('section_podcast_status_failed'),
					),
				}
			: null,
	].filter(
		(
			item,
		): item is {
			key: string;
			node: ReturnType<typeof renderStatusBadge>;
		} => Boolean(item),
	);
	return (
		<>
			<div className='space-y-2'>
				<h2 className='break-words text-2xl font-semibold leading-9 tracking-tight'>
					{title}
				</h2>
				{section.is_day_section ? (
					<div className='flex flex-wrap gap-2'>
						<InfoBadge>{t('section_day_badge')}</InfoBadge>
					</div>
				) : null}
				<p className='text-sm leading-7 text-muted-foreground'>{description}</p>
			</div>

			{section.is_day_section ? (
				<Alert className='border-emerald-500/30 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200'>
					<AlertTriangle className='size-4 text-current' />
					<AlertDescription>
						<span className='font-medium'>{t('section_day_notice_title')}</span>{' '}
						{t('section_day_notice_description')}
					</AlertDescription>
				</Alert>
			) : null}

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
					{statusBadges.map((badge) => (
						<div key={badge.key}>{badge.node}</div>
					))}
				</div>
			) : null}
		</>
	);
};

export default SectionInfo;
