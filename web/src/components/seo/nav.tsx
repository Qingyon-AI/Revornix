import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { BookText } from 'lucide-react';
import Link from 'next/link';
import NavUser from './nav-user';
import PublicNavControls from './public-nav-controls';

const Nav = async () => {
	const t = await getTranslations();
	return (
		<header className='sticky top-0 z-20 flex h-16 w-full items-center border-b border-border/40 bg-background/72 backdrop-blur-xl'>
			<div className='mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6'>
				<Link href='/community' className='truncate text-[1.75rem] font-bold tracking-tight md:text-[2rem]'>
					Revornix
				</Link>
				<div className='flex shrink-0 flex-row items-center gap-1 md:gap-1.5'>
					<Link href='/dashboard'>
						<Button
							variant='outline'
							size='sm'
							className='hidden rounded-xl text-sm md:inline-flex'>
							{t('seo_nav_dashboard')}
						</Button>
					</Link>
					<Link href='/community'>
						<Button
							variant='outline'
							size='sm'
							className='hidden rounded-xl text-sm md:inline-flex'>
							{t('seo_nav_community')}
						</Button>
					</Link>
					<PublicNavControls />
					<Link href='https://revornix.com' target='_blank'>
						<Button variant='outline' size='icon-sm' className='rounded-xl md:hidden' aria-label={t('seo_nav_docs')}>
							<BookText className='size-4' />
						</Button>
						<Button
							variant='outline'
							size='sm'
							className='hidden rounded-xl text-sm md:inline-flex'>
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
