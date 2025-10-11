'use client';

import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DAILY_HOT_API_PREFIX } from '@/config/api';
import { Website } from '@/app/(public)/hot-search/page';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AutoScrollList } from '@/components/ui/auto-scroll-list';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { useTranslations } from 'next-intl';

const TodayNews = () => {
	const t = useTranslations();
	const baseUrl = DAILY_HOT_API_PREFIX;
	const websites_to_craw = [
		'history',
		'bilibili',
		'acfun',
		'weibo',
		'zhihu',
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
	];

	const [websites, setWebsites] = useState<Website[]>([]);
	const [refreshStatus, setRefreshStatus] = useState(false);

	const handleInitData = useCallback(async () => {
		setRefreshStatus(true);
		const promises = websites_to_craw.map(async (website) => {
			const response = await fetch(baseUrl + `/${website}`, {
				cache: 'no-cache',
			});
			if (response.status === 200) {
				return (await response.json()) as Website;
			} else {
				return {
					code: response.status,
					name: website,
					title: website,
					type: '',
					link: '',
					total: 0,
					fromCache: false,
					updateTime: '',
					data: [],
				} as Website;
			}
		});

		const results = await Promise.all(promises);
		setWebsites(results.filter((w) => w?.data?.length > 0));
		setRefreshStatus(false);
	}, [baseUrl]);

	useEffect(() => {
		handleInitData();
	}, [handleInitData]);

	return (
		<Card>
			<CardHeader className='flex justify-between items-center'>
				<div className='flex flex-col gap-1.5'>
					<CardTitle>{t('dashboard_today_hot_search')}</CardTitle>
					<CardDescription>
						{t('dashboard_today_hot_search_description')}
					</CardDescription>
				</div>
				<Link href={'/hot-search'}>
					<Button variant='ghost' className='text-sm text-muted-foreground'>
						{t('dashboard_today_hot_search_full')}
						<ChevronRight />
					</Button>
				</Link>
			</CardHeader>
			<CardContent>
				{refreshStatus ? (
					<Skeleton className='w-full h-[140px]' /> // 3*28
				) : (
					<AutoScrollList visibleCount={5} itemHeight={28} gap={1}>
						{websites.map((website, index) =>
							website?.data?.[0] ? (
								<Link
									key={index}
									href={website.data[0].url}
									target='_blank'
									className='flex w-full text-sm hover:text-primary transition-colors items-center justify-between p-1 hover:bg-muted'>
									<div className='truncate flex-1'>{website.data[0].title}</div>
									<div className='text-muted-foreground shrink-0 text-xs'>
										{website.title}
									</div>
								</Link>
							) : (
								<div key={index} className='text-muted-foreground text-sm'>
									{t('dashboard_today_hot_search_empty')}
								</div>
							)
						)}
					</AutoScrollList>
				)}
			</CardContent>
		</Card>
	);
};

export default TodayNews;
