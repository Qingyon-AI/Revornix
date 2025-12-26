import { headers } from 'next/headers';
import { RegisterFormLocal } from '@/components/user/register-form-local';
import { RegisterFormCloud } from '@/components/user/register-form-cloud';
import { isAllowedDeployHost } from '@/lib/utils';

export default async function RegisterPage() {
	const headersList = await headers();
	const host = headersList.get('host');

	return (
		<div className='flex items-center justify-center min-h-[calc(theme("height.screen")-theme("height.16"))]'>
			{host && isAllowedDeployHost(host) && <RegisterFormCloud />}
			{host && isAllowedDeployHost(host) && <RegisterFormLocal />}
		</div>
	);
}
