'use client';

import type { ReactNode } from 'react';

import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { formatDistance } from 'date-fns';
import {
	BellRing,
	BookOpenText,
	CalendarClock,
	CalendarDays,
	type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { formatInUserTimeZone } from '@/lib/time';
import { cn, replacePath } from '@/lib/utils';
import { getSectionDetail } from '@/service/section';

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
		<div className='rounded-xl border border-border/50 p-3'>
			<div className='flex items-center gap-2 text-xs text-muted-foreground'>
				<Icon className='size-3.5' />
				<span>{label}</span>
			</div>
			<div className='mt-2 text-base font-semibold'>{value}</div>
			{hint && <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>}
		</div>
	);
};

const SectionInfo = ({ id }: { id: number }) => {
	const locale = useLocale();
	const t = useTranslations();

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
		return <Skeleton className='h-100 w-full rounded-2xl' />;
	}

	if (!section) return null;

	const title = section.title || t('section_title_empty');
	const description = section.description || t('section_description_empty');
	const lastActiveAt = section.update_time ?? section.create_time;
	const lastActiveDistance = formatDistance(lastActiveAt, new Date(), {
		addSuffix: true,
		locale: locale === 'zh' ? zhCN : enUS,
	});

	return (
		<div className='space-y-2 px-4 pt-5'>
			<div className='min-w-0 flex-1'>
				<h2 className='text-xl font-semibold leading-8 tracking-tight'>
					{title}
				</h2>
				<p className='line-clamp-4 text-sm leading-7 text-muted-foreground'>
					{description}
				</p>
			</div>

			{section.labels && section.labels.length > 0 && (
				<div className='flex flex-wrap gap-1'>
					{section.labels.map((label) => {
						return <InfoBadge key={label.id}>{label.name}</InfoBadge>;
					})}
				</div>
			)}

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
					hint={formatInUserTimeZone(lastActiveAt)}
				/>
				<InfoMetric
					icon={CalendarDays}
					label={t('section_info_created_at')}
					value={formatInUserTimeZone(section.create_time, 'yyyy-MM-dd')}
					hint={formatInUserTimeZone(section.create_time)}
				/>
			</div>
		</div>
	);
};

export default SectionInfo;
