import AdminUserNotificationsPage from '@/components/admin/admin-user-notifications-page';

export default async function AdminUserNotificationsRoutePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <AdminUserNotificationsPage userId={Number(id)} />;
}
