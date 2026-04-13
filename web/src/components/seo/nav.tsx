import { getTranslations } from 'next-intl/server';
import { BookText } from 'lucide-react';
import Link from 'next/link';
import NavUser from './nav-user';
import PublicNavControls from './public-nav-controls';

const Nav = async () => {
	const t = await getTranslations();

	const navLinks = [
		{ href: '/community', label: t('seo_nav_community') },
		{ href: '/dashboard', label: t('seo_nav_dashboard') },
		{ href: 'https://revornix.com', label: t('seo_nav_docs'), external: true },
	];

	return (
		<header className='sticky top-0 z-20 border-b border-border/40 bg-background/76 backdrop-blur-xl'>
			<div className='mx-auto flex h-14 w-full max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'>
				<div className='flex min-w-0 items-center gap-6'>
					<Link
						href='/community'
						className='truncate text-lg font-semibold tracking-tight sm:text-xl'>
						Revornix
					</Link>

					<nav className='hidden items-center gap-4 md:flex'>
						{navLinks.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								target={item.external ? '_blank' : undefined}
								className='text-sm text-muted-foreground transition-colors hover:text-foreground'>
								{item.label}
							</Link>
						))}
					</nav>
				</div>

				<div className='flex shrink-0 items-center gap-1.5'>
					<Link
						href='https://revornix.com'
						target='_blank'
						className='inline-flex md:hidden'>
						<span className='flex size-8 items-center justify-center rounded-xl border border-border/60 bg-background/72 text-muted-foreground transition-colors hover:text-foreground'>
							<BookText className='size-4' />
						</span>
					</Link>
					<PublicNavControls />
					<NavUser />
				</div>
			</div>
		</header>
	);
};

export default Nav;
