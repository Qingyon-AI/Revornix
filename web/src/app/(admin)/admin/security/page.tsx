import type { Metadata } from 'next';
import AdminSecurityPage from '@/components/admin/admin-security-page';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Admin Security',
	'Review security settings and protections in the Revornix admin console.',
);

const Page = () => {
	return <AdminSecurityPage />;
};

export default Page;
