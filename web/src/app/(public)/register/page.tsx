import { headers } from 'next/headers';
import { RegisterFormLocal } from '@/components/user/register-form-local';
import { RegisterFormCloud } from '@/components/user/register-form-cloud';
import { isAllowedDeployHost } from '@/lib/utils';
import AuthShell from '@/components/user/auth-shell';

export default async function RegisterPage() {
	const headersList = await headers();
	const host = headersList.get('host');

	return (
		<AuthShell>
			{host && isAllowedDeployHost(host) && <RegisterFormCloud />}
			{host && !isAllowedDeployHost(host) && <RegisterFormLocal />}
		</AuthShell>
	);
}
