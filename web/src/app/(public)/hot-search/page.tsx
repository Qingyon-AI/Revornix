'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import HotSearchCard from '@/components/hot-search/hot-search-card';
import { Input } from '@/components/ui/input';

export interface Website {
	code: number;
	name: string;
	title: string;
	type: string;
	link: string;
	total: number;
	fromCache: boolean;
	updateTime: string;
	data: HotItem[];
}

interface HotItem {
	id: string;
	title: string;
	timestamp: number;
	hot: number;
	url: string;
	mobileUrl: string;
}

const HotSearch = () => {
	const baseUrl = process.env.NEXT_PUBLIC_DAILY_HOT_API_PREFIX;
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

	const [websites, setWebsites] = useState<Website[]>();
	const [keyword, setKeyword] = useState('');
	const [refreshStatus, setRefreshStatus] = useState(false);

	const handleInitData = useCallback(async () => {
		setRefreshStatus(true);
		let data = [];
		const promises = websites_to_craw.map(async (website) => {
			const response = await fetch(baseUrl + `/${website}`, {
				cache: 'no-cache',
			}).then((res) => res.json());
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
		handleInitData();
	}, []);

	return (
		<div className='px-5 pb-5 h-full overflow-auto'>
			{refreshStatus && (
				<div className='h-full'>
					<Skeleton className='w-full h-full' />
				</div>
			)}
			{websites && websites.length > 0 && (
				<>
					<div className='grid grid-cols-1 md:grid-cols-4 gap-5'>
						{websites.map((website) => {
							return <HotSearchCard key={website.title} website={website} />;
						})}
					</div>
				</>
			)}
		</div>
	);
};

export default HotSearch;
