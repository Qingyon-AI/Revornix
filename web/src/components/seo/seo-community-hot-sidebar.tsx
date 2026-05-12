'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, RefreshCcwIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Website } from '@/components/hot-search/types';
import { AutoScrollList } from '@/components/ui/auto-scroll-list';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DAILY_HOT_API_PREFIX } from '@/config/api';

const HOT_WEBSITES = [
	'history',
	'bilibili',
	'acfun',
	'weibo',
	'zhihu-daily',
	'baidu',
	'douyin',
	'douban-movie',
	'douban-group',
	'tieba',
	'sspai',
	'ithome',
	'jianshu',
	'guokr',
	'thepaper',
	'toutiao',
	'36kr',
	'51cto',
	'juejin',
	'qq-news',
	'sina',
	'sina-news',
	'netease-news',
	'weread',
	'hellogithub',
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
					{Array.from({ length: 12 }).map((_, index) => (
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
				<div className='min-w-0 max-w-full overflow-x-hidden'>
					<AutoScrollList
						visibleCount={12}
						itemHeight={41}
						gap={0}
						className='w-full min-w-0 max-w-full'>
						{websites.map((website, index) => (
							<div
								key={website.name}
								className='min-w-0 w-full max-w-full overflow-hidden'>
								{index !== 0 ? <Separator /> : null}
								<Link
									href={
										website.data[0]?.url ?? website.data[0]?.mobileUrl ?? '#'
									}
									target='_blank'
									className='flex min-w-0 w-full max-w-full items-center justify-between gap-3 overflow-hidden py-3 text-sm transition-colors hover:text-primary'>
									<div className='min-w-0 flex-1 overflow-hidden break-all text-ellipsis line-clamp-1'>
										{website.data[0]?.title}
									</div>
									<div className='shrink-0 text-xs text-muted-foreground'>
										{website.title}
									</div>
								</Link>
							</div>
						))}
					</AutoScrollList>
					<div className='pt-3 text-right'>
						<Link
							href='/hot-search'
							className='inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground'>
							{t('dashboard_today_hot_search_full')}
							<ChevronRight className='size-4' />
						</Link>
					</div>
				</div>
			) : null}
		</>
	);
};

export default SeoCommunityHotSidebar;
