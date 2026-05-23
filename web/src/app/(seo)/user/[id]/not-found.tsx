import { NotFoundView } from '@/components/not-found/not-found-view';
import { Compass, Home, UserX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const SeoUserNotFound = async () => {
	const t = await getTranslations();
	return (
		<NotFoundView
			icon={UserX}
			eyebrow={t('not_found_eyebrow_public')}
			title={t('user_not_found')}
			description={t('user_not_found_description')}
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

export default SeoUserNotFound;
