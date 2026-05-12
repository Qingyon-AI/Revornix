'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCcwIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Website } from '@/app/(private)/hot-search/page';
import { AutoScrollList } from '@/components/ui/auto-scroll-list';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DAILY_HOT_API_PREFIX } from '@/config/api';

const HOT_WEBSITES = [
	'history',
	'bilibili',
	'weibo',
	'zhihu-daily',
	'baidu',
	'douyin',
	'ithome',
	'juejin',
] as const;

const SeoCommunityHotSidebar = () => {
	const t = useTranslations();
	const [websites, setWebsites] = useState<Website[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const results = await Promise.all(
				HOT_WEBSITES.map(async (website) => {
					try {
						const response = await fetch(`${DAILY_HOT_API_PREFIX}/${website}`, {
							cache: 'no-cache',
						});

						if (!response.ok) {
							return null;
						}

						return (await response.json()) as Website;
					} catch {
						return null;
					}
				}),
			);

			const validResults = results.filter((item): item is Website =>
				Boolean(item && item.data?.length > 0),
			);

			setWebsites(validResults);

			if (validResults.length === 0) {
				setError(t('dashboard_today_hot_search_error_no_data'));
			}
		} catch {
			setError(t('dashboard_today_hot_search_error_network'));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	return (
		<>
			{loading ? (
				<div>
					{Array.from({ length: 8 }).map((_, index) => (
						<div key={index}>
							<div className='flex items-center justify-between gap-3 py-5'>
								<Skeleton className='h-5 flex-1 rounded-md' />
								<Skeleton className='h-4 w-16 rounded-md' />
							</div>
							{index !== 7 ? <Separator /> : null}
						</div>
					))}
				</div>
			) : null}

			{!loading && error ? (
				<Empty className='min-h-[220px] rounded-2xl border border-dashed border-border/60'>
					<EmptyHeader>
						<EmptyDescription>{error}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button variant='outline' size='sm' onClick={() => void loadData()}>
							<RefreshCcwIcon className='size-4' />
							{t('refresh')}
						</Button>
					</EmptyContent>
				</Empty>
			) : null}

			{!loading && !error ? (
				<div>
					<AutoScrollList
						visibleCount={8}
						itemHeight={41}
						gap={0}
						className='w-full'>
						{websites.map((website, index) => (
							<div key={website.name} className='w-full'>
								{index !== 0 ? <Separator /> : null}
								<Link
									href={
										website.data[0]?.url ?? website.data[0]?.mobileUrl ?? '#'
									}
									target='_blank'
									className='flex w-full items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-primary'>
									<div className='min-w-0 flex-1 truncate'>
										{website.data[0]?.title}
									</div>
									<div className='shrink-0 text-xs text-muted-foreground'>
										{website.title}
									</div>
								</Link>
							</div>
						))}
					</AutoScrollList>
					<div className='text-right'>
						<Link
							href='/hot-search'
							className='text-sm text-muted-foreground transition-colors hover:text-foreground'>
							{t('dashboard_today_hot_search_full')}
						</Link>
					</div>
				</div>
			) : null}
		</>
	);
};

export default SeoCommunityHotSidebar;
