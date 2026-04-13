import type { Metadata } from 'next';
import AdminOverview from '@/components/admin/admin-overview';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Admin Overview',
	'Review platform-wide admin insights and controls for Revornix.',
);

export default function AdminPage() {
	return <AdminOverview />;
}
