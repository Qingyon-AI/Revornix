'use client';

import { useLoginProvider } from '@/provider/login-provider';
import EmailLoginForm from './email-login-form';
import PhoneLoginForm from './phone-login-form';

export function LoginForm() {
	const { loginWay } = useLoginProvider();
	return (
		<>
			{loginWay === 'email' && <EmailLoginForm />}
			{loginWay === 'phone' && <PhoneLoginForm />}
		</>
	);
}
