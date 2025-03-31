import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SEOPage = async () => {
	const cookieStore = await cookies();
	const access_token = cookieStore.get('access_token');
	if (access_token) {
		redirect('/dashboard');
	} else {
		redirect('/login');
	}
	return (
		<div className='flex flex-col justify-center items-center h-screen'>
			Temp Page
		</div>
	);
};

export default SEOPage;
