import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Revornix Account Access',
	'Sign in or create a Revornix account to manage documents, sections, AI workflows, and workspace settings.',
);

// Auth routes intentionally render without Nav/Footer so the split layout can
// bleed to the viewport edges. AuthShell carries the brand mark and the
// locale/theme controls that Nav would otherwise provide.
const Layout = ({ children }: { children: React.ReactNode }) => {
	return <main>{children}</main>;
};

export default Layout;
