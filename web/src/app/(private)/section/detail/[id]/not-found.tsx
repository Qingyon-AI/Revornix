import { useTranslations } from 'next-intl';

const NotFound = () => {
	const t = useTranslations();
	return (
		<div className='flex flex-col items-center justify-center h-screen'>
			<h1 className='text-2xl font-bold'>{t('section_not_found')}</h1>
			<p className='text-gray-500'>{t('section_not_found_description')}</p>
			<a href='/' className='mt-4 text-blue-500 hover:underline'>
				{t('go_back_home')}
			</a>
		</div>
	);
};

export default NotFound;
