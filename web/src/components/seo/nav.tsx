'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const Nav = () => {
	const t = useTranslations();
	return (
		<header className='sticky top-0 w-full flex flex-row items-center justify-between px-5 md:px-12 h-16 z-10 backdrop-blur-xl'>
			<Link href={'/'} className='font-bold text-2xl'>
				Revornix
			</Link>
			<div className='flex flex-row gap-1 items-center'>
				<Link href={'https://revornix.com'} target='_blank'>
					<Button variant={'link'}>{t('seo_nav_docs')}</Button>
				</Link>
				<Link href={'/login'}>
					<Button>{t('seo_nav_login_in')}</Button>
				</Link>
			</div>
		</header>
	);
};

export default Nav;
