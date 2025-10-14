import { LoginForm } from '@/components/user/login-form';
import LoginProvider from '@/provider/login-provider';
import { Suspense } from 'react';

export default function LoginPage() {
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
