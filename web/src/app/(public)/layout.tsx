import Footer from '@/components/seo/footer';
import Nav from '@/components/seo/nav';
import NextTopLoader from 'nextjs-toploader';

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<NextTopLoader />
			<div className='grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden'>
				<Nav />
				<main className='min-h-0 overflow-hidden'>{children}</main>
				<Footer />
			</div>
		</>
	);
};

export default Layout;
