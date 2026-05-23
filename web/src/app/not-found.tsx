import { NotFoundView } from '@/components/not-found/not-found-view';
import SeoLayoutShell from '@/components/seo/layout/seo-layout-shell';
import { Compass, Home } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const NotFound = async () => {
	const t = await getTranslations();
	return (
		<SeoLayoutShell>
			<main className='w-full'>
				<NotFoundView
					eyebrow={t('not_found_eyebrow_global')}
					title={t('page_not_found')}
					description={t('page_not_found_description')}
					actions={[
						{
							href: '/',
							label: t('go_back_home'),
							icon: Home,
						},
						{
							href: '/community',
							label: t('not_found_browse_community'),
							icon: Compass,
						},
					]}
				/>
			</main>
		</SeoLayoutShell>
	);
};

export default NotFound;
