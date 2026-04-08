import type { Metadata } from 'next';
import AdminLayoutShell from '@/components/admin/admin-layout-shell';
import { getAdminUserOrRedirect } from '@/lib/admin-access';
import { NO_INDEX_METADATA } from '@/lib/seo-metadata';

export const metadata: Metadata = NO_INDEX_METADATA;

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await getAdminUserOrRedirect();
	return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
