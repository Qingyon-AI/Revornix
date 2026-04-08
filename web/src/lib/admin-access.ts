import { API_PREFIX } from '@/config/api';
import { UserRole } from '@/enums/user';
import type { PrivateUserInfo } from '@/generated';
import { serverRequest } from '@/lib/request-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const getAdminUserOrRedirect = async () => {
	const cookieStore = await cookies();
	const accessToken = cookieStore.get('access_token')?.value;

	if (!accessToken || !API_PREFIX) {
		redirect('/dashboard');
	}

	const currentUser = await serverRequest<PrivateUserInfo>(
		`${API_PREFIX}/user/mine/info`,
		{
			headers: new Headers({
				Authorization: `Bearer ${accessToken}`,
			}),
		},
	).catch(() => null);

	if (
		!currentUser ||
		(currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.ROOT)
	) {
		redirect('/dashboard');
	}

	return currentUser;
};
