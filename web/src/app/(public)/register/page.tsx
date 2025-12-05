import { headers } from 'next/headers';
import { RegisterFormLocal } from '@/components/user/register-form-local';
import { RegisterFormCloud } from '@/components/user/register-form-cloud';

export default async function RegisterPage() {
	const headersList = await headers();
	const host = headersList.get('host');

	return (
		<div className='flex items-center justify-center min-h-[calc(theme("height.screen")-theme("height.16"))]'>
			{(host?.includes('revornix.com') || host?.includes('revornix.cn')) && (
				<RegisterFormCloud />
			)}
			{host &&
				!host?.includes('revornix.com') &&
				!host.includes('revornix.cn') && <RegisterFormLocal />}
		</div>
	);
}
