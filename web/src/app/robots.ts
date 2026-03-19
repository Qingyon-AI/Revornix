import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/seo-metadata';
import { getSitemapUrls } from '@/lib/sitemap';

export default async function robots(): Promise<MetadataRoute.Robots> {
	const siteOrigin = getSiteOrigin();

	return {
		rules: [
			{
				userAgent: '*',
				allow: ['/community', '/document/', '/section/', '/user/'],
				disallow: [
					'/account',
					'/callback',
					'/dashboard',
					'/document/create',
					'/document/detail',
					'/document/mine',
					'/document/recent',
					'/document/star',
					'/document/unread',
					'/graph',
					'/hot-search',
					'/integrations',
					'/revornix-ai',
					'/section/community',
					'/section/create',
					'/section/detail',
					'/section/mine',
					'/section/subscribed',
					'/section/today',
					'/setting',
					'/user/detail',
					'/user/fans',
					'/user/follows',
				],
			},
		],
		host: siteOrigin,
		sitemap: await getSitemapUrls(),
	};
}
