import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import SeoHotSearchPage from '@/components/seo/community/seo-hot-search-page';
import { buildMetadata } from '@/lib/seo-metadata';

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations();

	return buildMetadata({
		title: t('seo_hot_search_title'),
		description: t('seo_hot_search_description'),
		path: '/hot-search',
		socialCard: {
			eyebrow: t('dashboard_today_hot_search'),
			theme: 'community',
		},
		keywords: ['community', 'hot search', 'trending', 'public'],
	});
}

const SeoHotSearchRoute = () => {
	return <SeoHotSearchPage />;
};

export default SeoHotSearchRoute;
