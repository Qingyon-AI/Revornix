'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { formatDistance } from 'date-fns';
import {
	BellRing,
	BookOpenText,
	CalendarClock,
	CalendarDays,
	NotebookPen,
	type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { UserSectionAuthority } from '@/enums/section';
import { formatInUserTimeZone, toDate } from '@/lib/time';
import { useUserContext } from '@/provider/user-provider';
import { cn, replacePath } from '@/lib/utils';
import { getSectionDetail } from '@/service/section';

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
				<Skeleton className='h-44 w-full rounded-[26px]' />

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
	const coverSrc =
		section.cover && creatorId !== undefined
			? replacePath(section.cover, creatorId)
			: null;
	const creatorCardClassName =
		'flex items-center gap-3 rounded-2xl border border-border/50 bg-background/45 px-3 py-2.5 transition-colors';

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
					<div className='flex h-36 items-end bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.1),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(56,189,180,0.1),transparent_30%),linear-gradient(135deg,rgba(50,45,42,0.5),rgba(50,45,42,0.2))] p-4'>
						<div className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80 backdrop-blur'>
							<NotebookPen className='size-3.5' />
							{t('section_creator')}
						</div>
					</div>
				)}
			</div>

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
		</div>
	);
};

export default SectionInfo;
