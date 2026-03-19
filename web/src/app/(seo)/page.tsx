import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { NO_INDEX_METADATA } from '@/lib/seo-metadata';

export const metadata: Metadata = NO_INDEX_METADATA;

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
