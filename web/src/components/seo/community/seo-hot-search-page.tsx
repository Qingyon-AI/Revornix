'use client';

import { useTranslations } from 'next-intl';

import HotSearchGrid from '@/components/hot-search/hot-search-grid';

const SeoHotSearchPage = () => {
	const t = useTranslations();

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

			<HotSearchGrid className='md:grid-cols-2 xl:grid-cols-3' />
		</div>
	);
};

export default SeoHotSearchPage;
