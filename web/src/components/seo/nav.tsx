'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

const Nav = () => {
	return (
		<header className='sticky top-0 w-full flex flex-row items-center justify-between px-5 md:px-12 h-16 z-10 backdrop-blur-xl'>
			<Link href={'/'} className='font-bold text-2xl'>
				Revornix
			</Link>
			<div className='flex flex-row gap-1 items-center'>
				<Link href={'https://revornix.com'} target='_blank'>
					<Button variant={'link'}>文档</Button>
				</Link>
				<Link href={'/login'}>
					<Button>登陆</Button>
				</Link>
			</div>
		</header>
	);
};

export default Nav;
