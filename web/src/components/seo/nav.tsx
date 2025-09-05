import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import NavUser from './nav-user';

const Nav = async () => {
	const t = await getTranslations();
	return (
		<header className='sticky top-0 w-full flex flex-row items-center justify-between px-5 md:px-12 h-16 z-10 backdrop-blur-xl'>
			<Link href={'/'} className='font-bold text-2xl'>
				Revornix
			</Link>
			<div className='flex flex-row gap-1 items-center'>
				<Link href={'https://revornix.com'} target='_blank'>
					<Button variant={'link'}>{t('seo_nav_docs')}</Button>
				</Link>
				<NavUser />
			</div>
		</header>
	);
};

export default Nav;
