import type { Metadata } from 'next';
import AdminSectionsPage from '@/components/admin/admin-sections-page';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Admin Sections',
	'Manage platform sections in the Revornix admin console.',
);

export default function AdminSectionsRoutePage() {
	return <AdminSectionsPage />;
}
