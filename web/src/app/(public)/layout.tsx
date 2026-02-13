import Footer from '@/components/seo/footer';
import Nav from '@/components/seo/nav';
import NextTopLoader from 'nextjs-toploader';

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<NextTopLoader />
			<Nav />
			<main className='w-full'>{children}</main>
			<Footer />
		</>
	);
};

export default Layout;
