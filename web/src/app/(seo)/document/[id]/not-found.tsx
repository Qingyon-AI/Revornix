import { NotFoundView } from '@/components/not-found/not-found-view';
import { Compass, FileQuestion, Home } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const SeoDocumentNotFound = async () => {
	const t = await getTranslations();
	return (
		<NotFoundView
			icon={FileQuestion}
			eyebrow={t('not_found_eyebrow_public')}
			title={t('document_not_found')}
			description={t('document_not_found_description')}
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

export default SeoDocumentNotFound;
