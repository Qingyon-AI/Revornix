import type { Metadata } from 'next';
import { LoginForm } from '@/components/user/login-form';
import LoginProvider from '@/provider/login-provider';
import { getSafeRedirectPage } from '@/lib/safe-redirect';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import AuthShell from '@/components/user/auth-shell';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Login',
	'Sign in to your Revornix workspace.',
);

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function LoginPage(props: { searchParams: SearchParams }) {
	const searchParams = await props.searchParams;
	const cookieStore = await cookies();
	if (cookieStore.get('access_token')) {
		const redirectToRaw = Array.isArray(searchParams.redirect_to)
			? searchParams.redirect_to[0]
			: searchParams.redirect_to;
		redirect(getSafeRedirectPage(redirectToRaw ?? null));
	}

	return (
		<Suspense>
			<AuthShell>
				<LoginProvider>
					<LoginForm />
				</LoginProvider>
			</AuthShell>
		</Suspense>
	);
}
