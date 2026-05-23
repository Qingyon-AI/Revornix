import { NotFoundView } from '@/components/not-found/not-found-view';
import { Home, LayoutDashboard, LibraryBig } from 'lucide-react';
import { useTranslations } from 'next-intl';

const NotFound = () => {
	const t = useTranslations();
	return (
		<NotFoundView
			icon={LibraryBig}
			title={t('section_not_found')}
			description={t('section_not_found_description')}
			actions={[
				{
					href: '/dashboard',
					label: t('not_found_back_to_dashboard'),
					icon: LayoutDashboard,
				},
				{
					href: '/',
					label: t('go_back_home'),
					icon: Home,
				},
			]}
		/>
	);
};

export default NotFound;
