'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import HotSearchCard from '@/components/hot-search/hot-search-card';
import HotSearchCardSkeleton from '@/components/hot-search/hot-search-card-skeleton';
import HotSearchErrorCard from '@/components/hot-search/hot-search-error-card';
import type { Website } from '@/components/hot-search/types';
import { DAILY_HOT_API_PREFIX } from '@/config/api';
import { cn } from '@/lib/utils';

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

type HotWebsiteName = (typeof HOT_WEBSITES)[number];

type HotSearchItem =
	| {
			name: HotWebsiteName;
			status: 'loading';
	  }
	| {
			name: HotWebsiteName;
			status: 'ready';
			website: Website;
	  };

const createLoadingItems = (): HotSearchItem[] =>
	HOT_WEBSITES.map((name) => ({
		name,
		status: 'loading',
	}));

const createErrorWebsite = (
	name: HotWebsiteName,
	code = 500,
): Website => ({
	code,
	name,
	title: '',
	type: '',
	link: '',
	total: 0,
	fromCache: false,
	updateTime: '',
	data: [],
});

const fetchHotWebsite = async (name: HotWebsiteName): Promise<Website> => {
	try {
		const response = await fetch(`${DAILY_HOT_API_PREFIX}/${name}`, {
			cache: 'no-cache',
		});

		if (response.status !== 200) {
			return createErrorWebsite(name, response.status);
		}

		const website = (await response.json()) as Website;
		return {
			...website,
			code: website.code ?? response.status,
			name: website.name || name,
		};
	} catch {
		return createErrorWebsite(name);
	}
};

const HotSearchGrid = ({ className }: { className?: string }) => {
	const [items, setItems] = useState<HotSearchItem[]>(createLoadingItems);
	const requestIdRef = useRef(0);

	const loadWebsites = useCallback(() => {
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setItems(createLoadingItems());

		HOT_WEBSITES.forEach(async (name) => {
			const website = await fetchHotWebsite(name);
			if (requestIdRef.current !== requestId) {
				return;
			}

			setItems((currentItems) =>
				currentItems.map((item) =>
					item.name === name
						? {
								name,
								status: 'ready',
								website,
							}
						: item,
				),
			);
		});
	}, []);

	useEffect(() => {
		loadWebsites();
		return () => {
			requestIdRef.current += 1;
		};
	}, [loadWebsites]);

	return (
		<div className={cn('grid grid-cols-1 gap-5', className)}>
			{items.map((item) => {
				if (item.status === 'loading') {
					return <HotSearchCardSkeleton key={item.name} />;
				}

				return item.website.code === 200 ? (
					<HotSearchCard key={item.name} website={item.website} />
				) : (
					<HotSearchErrorCard key={item.name} />
				);
			})}
		</div>
	);
};

export default HotSearchGrid;
