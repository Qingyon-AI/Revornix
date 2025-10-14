import { RegisterForm } from '@/components/user/register-form';

export default function RegisterPage() {
	return (
		<div className='flex items-center justify-center min-h-[calc(theme("height.screen")-theme("height.16"))]'>
			<RegisterForm />
		</div>
	);
}
