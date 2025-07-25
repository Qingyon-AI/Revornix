'use client';

import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import HotSearchCard from '@/components/hot-search/hot-search-card';
import HotSearchErrorCard from '@/components/hot-search/hot-search-error-card';
import { DAILY_HOT_API_PREFIX } from '@/config/api';

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

	const [websites, setWebsites] = useState<Website[]>();
	const [keyword, setKeyword] = useState('');
	const [refreshStatus, setRefreshStatus] = useState(false);

	const handleInitData = useCallback(async () => {
		setRefreshStatus(true);
		let data = [];
		const promises = websites_to_craw.map(async (website) => {
			const response = await fetch(baseUrl + `/${website}`, {
				cache: 'no-cache',
			}).then((res) => {
				if (res.status === 200) {
					return res.json();
				} else {
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
				}
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
						{websites.map((website, index) => {
							if (website.code === 200) {
								return <HotSearchCard key={index} website={website} />;
							} else {
								return <HotSearchErrorCard key={index} />;
							}
						})}
					</div>
				</>
			)}
		</div>
	);
};

export default HotSearch;
