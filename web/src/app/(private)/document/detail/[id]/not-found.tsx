import { NotFoundView } from '@/components/not-found/not-found-view';
import { FileQuestion, Home, LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

const NotFound = () => {
	const t = useTranslations();
	return (
		<NotFoundView
			icon={FileQuestion}
			title={t('document_not_found')}
			description={t('document_not_found_description')}
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
