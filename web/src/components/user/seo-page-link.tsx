'use client';

import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

const SeoPageLink = () => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();

	if (!mainUserInfo?.id) {
		return <Skeleton className='w-24 h-9' />;
	}

	return (
		<Link href={`/user/${mainUserInfo.id}`} target='_blank'>
			<Button variant={'outline'}>{t('account_seo_page_visit')}</Button>
		</Link>
	);
};

export default SeoPageLink;
