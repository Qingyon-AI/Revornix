import type { Metadata } from 'next';
import Footer from '@/components/seo/footer';
import Nav from '@/components/seo/nav';
import { NO_INDEX_METADATA } from '@/lib/seo-metadata';

export const metadata: Metadata = NO_INDEX_METADATA;

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<div className='grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden'>
				<Nav />
				<main className='min-h-0 overflow-hidden'>{children}</main>
				<Footer />
			</div>
		</>
	);
};

export default Layout;
