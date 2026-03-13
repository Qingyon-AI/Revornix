'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { getDocumentDetail } from '@/service/document';
import { getSectionDetail } from '@/service/section';
import {
	buildStaticTopNavCrumbs,
	getRouteTitleByPath,
	type TopNavCrumb,
	type TopNavLocale,
} from '@/lib/top-nav';

type DynamicBreadcrumbMatch<TData> = {
	fallbackPath: string;
	id: number;
	queryKey: readonly [string, string, number];
	queryFn: (id: number) => Promise<TData>;
	selectTitle: (data: TData) => string | undefined;
};

const resolveDynamicBreadcrumbMatch = (
	pathname: string,
): DynamicBreadcrumbMatch<unknown> | null => {
	const documentDetailMatch = pathname.match(/^\/document\/detail\/(\d+)\/?$/);
	if (documentDetailMatch) {
		return {
			fallbackPath: '/document/detail',
			id: Number(documentDetailMatch[1]),
			queryKey: [
				'top-nav-dynamic-crumb',
				'document',
				Number(documentDetailMatch[1]),
			],
			queryFn: (id) => getDocumentDetail({ document_id: id }),
			selectTitle: (data) =>
				(data as Awaited<ReturnType<typeof getDocumentDetail>> | undefined)?.title,
		};
	}

	const sectionDetailMatch = pathname.match(/^\/section\/detail\/(\d+)\/?$/);
	if (sectionDetailMatch) {
		return {
			fallbackPath: '/section/detail',
			id: Number(sectionDetailMatch[1]),
			queryKey: [
				'top-nav-dynamic-crumb',
				'section',
				Number(sectionDetailMatch[1]),
			],
			queryFn: (id) => getSectionDetail({ section_id: id }),
			selectTitle: (data) =>
				(data as Awaited<ReturnType<typeof getSectionDetail>> | undefined)?.title,
		};
	}

	return null;
};

export const useTopNavCrumbs = () => {
	const pathname = usePathname();
	const locale = useLocale();
	const normalizedLocale: TopNavLocale = locale === 'zh' ? 'zh' : 'en';

	const dynamicMatch = useMemo(() => {
		return resolveDynamicBreadcrumbMatch(pathname);
	}, [pathname]);

	const fallbackDynamicTitle = useMemo(() => {
		if (!dynamicMatch) {
			return null;
		}

		return getRouteTitleByPath(dynamicMatch.fallbackPath, normalizedLocale);
	}, [dynamicMatch, normalizedLocale]);

	const { data: dynamicTitle } = useQuery<string | undefined>({
		queryKey: dynamicMatch?.queryKey ?? ['top-nav-dynamic-crumb', pathname, normalizedLocale],
		queryFn: async () => {
			if (!dynamicMatch) {
				return undefined;
			}

			const data = await dynamicMatch.queryFn(dynamicMatch.id);
			return dynamicMatch.selectTitle(data);
		},
		enabled: Boolean(dynamicMatch),
	});

	return useMemo<TopNavCrumb[]>(() => {
		const staticCrumbs = buildStaticTopNavCrumbs(pathname, normalizedLocale);

		if (!dynamicMatch || staticCrumbs.length === 0) {
			return staticCrumbs;
		}

		const lastCrumb = staticCrumbs[staticCrumbs.length - 1];
		if (lastCrumb.path !== pathname) {
			return staticCrumbs;
		}

		return [
			...staticCrumbs.slice(0, -1),
			{
				...lastCrumb,
				title: dynamicTitle ?? fallbackDynamicTitle ?? lastCrumb.title,
				unclickable: true,
			},
		];
	}, [
		dynamicMatch,
		dynamicTitle,
		fallbackDynamicTitle,
		normalizedLocale,
		pathname,
	]);
};
