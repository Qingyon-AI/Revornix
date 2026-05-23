import { NotFoundView } from '@/components/not-found/not-found-view';
import { Compass, Home, LibraryBig } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const SeoSectionNotFound = async () => {
	const t = await getTranslations();
	return (
		<NotFoundView
			icon={LibraryBig}
			eyebrow={t('not_found_eyebrow_public')}
			title={t('section_not_found')}
			description={t('section_not_found_description')}
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
	);
};

export default SeoSectionNotFound;
