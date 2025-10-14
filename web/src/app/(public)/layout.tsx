import Footer from '@/components/seo/footer';
import Nav from '@/components/seo/nav';

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<Nav />
			<main className='w-full'>{children}</main>
			<Footer />
		</>
	);
};

export default Layout;
