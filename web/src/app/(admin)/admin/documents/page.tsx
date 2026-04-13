import type { Metadata } from 'next';
import AdminDocumentsPage from '@/components/admin/admin-documents-page';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Admin Documents',
	'Manage platform documents in the Revornix admin console.',
);

export default function AdminDocumentsRoutePage() {
	return <AdminDocumentsPage />;
}
