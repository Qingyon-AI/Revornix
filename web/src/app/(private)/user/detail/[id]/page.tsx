import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import UserContainer from '@/components/user/user-container';
import { buildMetadata, toMetaDescription } from '@/lib/seo-metadata';
import { getUserInfoInServer } from '@/service/user';

type Params = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { id } = await params;
	const userId = Number(id);
	const t = await getTranslations();

	if (!userId) {
		return buildMetadata({
			title: t('app_user_title_suffix'),
			description: 'User detail page in Revornix.',
			noIndex: true,
		});
	}

	try {
		const requestHeaders = await headers();
		const user = await getUserInfoInServer(
			{ user_id: userId },
			new Headers(requestHeaders),
		);
		const title = user.nickname?.trim() || 'User';
		const description = toMetaDescription(
			user.slogan?.trim() || `Profile page for ${title}.`,
		);

		return buildMetadata({
			title: `${title} | ${t('app_user_title_suffix')}`,
			description,
			noIndex: true,
		});
	} catch {
		return buildMetadata({
			title: t('app_user_title_suffix'),
			description: 'User detail page in Revornix.',
			noIndex: true,
		});
	}
}

const UserDetailPage = async ({ params }: { params: Params }) => {
	const { id } = await params;
	return <UserContainer id={Number(id)} />;
};

export default UserDetailPage;
