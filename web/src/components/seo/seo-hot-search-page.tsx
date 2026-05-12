'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import HotSearchCard from '@/components/hot-search/hot-search-card';
import HotSearchErrorCard from '@/components/hot-search/hot-search-error-card';
import type { Website } from '@/components/hot-search/types';
import { Skeleton } from '@/components/ui/skeleton';
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

const SeoHotSearchPage = () => {
	const t = useTranslations();
	const [websites, setWebsites] = useState<Website[]>();
	const [loading, setLoading] = useState(true);

	const handleInitData = useCallback(async () => {
		setLoading(true);

		const promises = HOT_WEBSITES.map(async (website) => {
			const response = await fetch(`${DAILY_HOT_API_PREFIX}/${website}`, {
				cache: 'no-cache',
			}).then((res) => {
				if (res.status === 200) {
					return res.json();
				}

				return {
					code: res.status,
					name: website,
					title: '',
					type: '',
					link: '',
					total: 0,
					fromCache: false,
					updateTime: '',
					data: [],
				};
			});

			return response as Website;
		});

		const data: Website[] = [];
		for (const promise of promises) {
			const website = await promise;
			data.push(website);
		}

		setWebsites(data);
		setLoading(false);
	}, []);

	useEffect(() => {
		void handleInitData();
	}, [handleInitData]);

	return (
		<div className='mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10'>
			<div className='mx-auto mb-8 space-y-3'>
				<h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
					{t('seo_hot_search_title')}
				</h1>
				<p className='text-sm leading-6 text-muted-foreground sm:text-base'>
					{t('seo_hot_search_description')}
				</p>
			</div>

			{loading ? (
				<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
					{Array.from({ length: 9 }).map((_, index) => (
						<Skeleton key={index} className='h-[280px] w-full rounded-3xl' />
					))}
				</div>
			) : null}

			{websites && websites.length > 0 ? (
				<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
					{websites.map((website, index) =>
						website.code === 200 ? (
							<HotSearchCard key={`${website.name}-${index}`} website={website} />
						) : (
							<HotSearchErrorCard key={`${website.name}-${index}`} />
						),
					)}
				</div>
			) : null}
		</div>
	);
};

export default SeoHotSearchPage;
