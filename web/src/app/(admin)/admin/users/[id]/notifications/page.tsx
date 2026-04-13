import type { Metadata } from 'next';
import AdminUserNotificationsPage from '@/components/admin/admin-user-notifications-page';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Admin User Notifications',
	'Review notification records for a user in the Revornix admin console.',
);

export default async function AdminUserNotificationsRoutePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <AdminUserNotificationsPage userId={Number(id)} />;
}
