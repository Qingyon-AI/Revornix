import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import NavUser from './nav-user';
import PublicNavControls from './public-nav-controls';

const Nav = async () => {
	const t = await getTranslations();
	return (
		<header className='sticky top-0 z-20 flex h-16 w-full items-center border-b border-border/40 bg-background/72 backdrop-blur-xl'>
			<div className='mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-6'>
				<Link href='/' className='text-[2rem] font-bold tracking-tight'>
					Revornix
				</Link>
				<div className='flex flex-row items-center gap-1.5'>
					<PublicNavControls />
					<Link href='https://revornix.com' target='_blank'>
						<Button
							variant='outline'
							size='sm'
							className='rounded-xl text-sm'>
							{t('seo_nav_docs')}
						</Button>
					</Link>
					<NavUser />
				</div>
			</div>
		</header>
	);
};

export default Nav;
