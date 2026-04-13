import Nav from '@/components/seo/nav';
import SeoLayoutShell from '@/components/seo/seo-layout-shell';

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<SeoLayoutShell header={<Nav />}>
			<main className='w-full'>{children}</main>
		</SeoLayoutShell>
	);
};

export default Layout;
