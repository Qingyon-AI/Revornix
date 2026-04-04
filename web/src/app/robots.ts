import type { MetadataRoute } from 'next';
import { getSitemapIndexUrl } from '@/lib/sitemap';

export default async function robots(): Promise<MetadataRoute.Robots> {

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
					'/setting',
					'/user/detail',
					'/user/fans',
					'/user/follows',
				],
			},
		],
		sitemap: getSitemapIndexUrl(),
	};
}
