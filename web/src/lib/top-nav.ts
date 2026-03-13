import routers, { findRouteByPath, type RouteItem } from '@/config/router';

export type TopNavLocale = 'zh' | 'en';

export type TopNavCrumb = {
	path: string;
	title: string;
	unclickable?: boolean;
};

const fallbackTitles: Record<TopNavLocale, string> = {
	zh: '未命名路径',
	en: 'Unnamed Path',
};

export const getTopNavFallbackTitle = (locale: TopNavLocale) => {
	return fallbackTitles[locale];
};

export const getRouteTitleByLocale = (
	route: RouteItem | null,
	locale: TopNavLocale,
) => {
	if (!route) {
		return getTopNavFallbackTitle(locale);
	}

	return locale === 'zh' ? route.title : route.title_en ?? route.title;
};

export const getRouteTitleByPath = (path: string, locale: TopNavLocale) => {
	return getRouteTitleByLocale(findRouteByPath(routers, path), locale);
};

export const buildStaticTopNavCrumbs = (
	pathname: string,
	locale: TopNavLocale,
): TopNavCrumb[] => {
	return pathname
		.split('/')
		.filter((path) => path !== '')
		.map((_, index, paths) => {
			const currentPath = `/${paths.slice(0, index + 1).join('/')}`;
			const route = findRouteByPath(routers, currentPath);

			return {
				path: currentPath,
				title: getRouteTitleByLocale(route, locale),
				unclickable: route?.unclickable,
				hideInBreadcrumb: route?.hideInBreadcrumb,
			};
		})
		.filter((crumb) => !crumb.hideInBreadcrumb)
		.map(({ hideInBreadcrumb: _hideInBreadcrumb, ...crumb }) => crumb);
};
