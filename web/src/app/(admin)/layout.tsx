import type { Metadata } from 'next';
import AdminLayoutShell from '@/components/admin/admin-layout-shell';
import { NO_INDEX_METADATA } from '@/lib/seo-metadata';

export const metadata: Metadata = NO_INDEX_METADATA;

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
