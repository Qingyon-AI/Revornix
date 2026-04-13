import type { Metadata } from 'next';
import AdminUsersPage from '@/components/admin/admin-users-page';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Admin Users',
	'Manage user accounts in the Revornix admin console.',
);

export default function AdminUsersRoutePage() {
	return <AdminUsersPage />;
}
