import SeoLayoutShell from '@/components/seo/layout/seo-layout-shell';

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<SeoLayoutShell>
			<main className='w-full'>{children}</main>
		</SeoLayoutShell>
	);
};

export default Layout;
