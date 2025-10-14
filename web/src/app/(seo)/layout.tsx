import Nav from '@/components/seo/nav';

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<Nav />
			<main className='w-full'>{children}</main>
		</>
	);
};

export default Layout;
