import type { Metadata } from 'next';
import Footer from '@/components/seo/footer';
import Nav from '@/components/seo/nav';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Revornix Account Access',
	'Sign in or create a Revornix account to manage documents, sections, AI workflows, and workspace settings.',
);

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
