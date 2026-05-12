'use client';

import { useCallback, useEffect, useState } from 'react';

import HotSearchCard from '@/components/hot-search/hot-search-card';
import HotSearchErrorCard from '@/components/hot-search/hot-search-error-card';
import type { Website } from '@/components/hot-search/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DAILY_HOT_API_PREFIX } from '@/config/api';

const HotSearch = () => {
	const baseUrl = DAILY_HOT_API_PREFIX;
	const websites_to_craw = [
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
	];

	const [websites, setWebsites] = useState<Website[]>();
	const [refreshStatus, setRefreshStatus] = useState(false);

	const handleInitData = useCallback(async () => {
		setRefreshStatus(true);
		const data: Website[] = [];
		const promises = websites_to_craw.map(async (website) => {
			const response = await fetch(baseUrl + `/${website}`, {
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

		for (const promise of promises) {
			const website = await promise;
			data.push(website);
		}

		setWebsites(data);
		setRefreshStatus(false);
	}, [baseUrl]);

	useEffect(() => {
		void handleInitData();
	}, [handleInitData]);

	return (
		<div className='h-full overflow-auto px-5 pb-5'>
			{refreshStatus ? (
				<div className='h-full'>
					<Skeleton className='h-full w-full' />
				</div>
			) : null}
			{websites && websites.length > 0 ? (
				<div className='grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-4'>
					{websites.map((website, index) =>
						website.code === 200 ? (
							<HotSearchCard key={index} website={website} />
						) : (
							<HotSearchErrorCard key={index} />
						),
					)}
				</div>
			) : null}
		</div>
	);
};

export default HotSearch;
