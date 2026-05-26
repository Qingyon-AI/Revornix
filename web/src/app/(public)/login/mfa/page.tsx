import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import AuthShell from '@/components/user/auth-shell';
import PasskeyMfaLogin from '@/components/user/passkey-mfa-login';
import { getSafeRedirectPage } from '@/lib/safe-redirect';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Multi-factor Verification',
	'Finish signing in to Revornix with an additional verification step.',
);

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function MfaLoginPage(props: { searchParams: SearchParams }) {
	const searchParams = await props.searchParams;
	const cookieStore = await cookies();
	if (cookieStore.get('access_token')) {
		const redirectToRaw = Array.isArray(searchParams.redirect_to)
			? searchParams.redirect_to[0]
			: searchParams.redirect_to;
		redirect(getSafeRedirectPage(redirectToRaw ?? null));
	}

	const challengeId = Array.isArray(searchParams.challenge_id)
		? searchParams.challenge_id[0]
		: searchParams.challenge_id;
	if (!challengeId) {
		redirect('/login');
	}

	const redirectTo = Array.isArray(searchParams.redirect_to)
		? searchParams.redirect_to[0]
		: searchParams.redirect_to;
	const methodsRaw = Array.isArray(searchParams.methods)
		? searchParams.methods[0]
		: searchParams.methods;
	const methods = methodsRaw
		? methodsRaw.split(',').map((method) => method.trim()).filter(Boolean)
		: ['passkey'];

	return (
		<Suspense>
			<AuthShell>
				<PasskeyMfaLogin
					challengeId={challengeId}
					redirectTo={getSafeRedirectPage(redirectTo ?? null)}
					methods={methods}
				/>
			</AuthShell>
		</Suspense>
	);
}
