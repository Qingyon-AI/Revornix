import { LoginForm } from '@/components/user/login-form';
import LoginProvider from '@/provider/login-provider';
import { getSafeRedirectPage } from '@/lib/safe-redirect';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

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
			<div className='flex items-center justify-center min-h-[calc(theme("height.screen")-theme("height.16"))]'>
				<LoginProvider>
					<LoginForm />
				</LoginProvider>
			</div>
		</Suspense>
	);
}
