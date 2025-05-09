import { useRouter } from 'nextjs-toploader/app';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';

const ModelCollection = () => {
	const t = useTranslations();
	const router = useRouter();
	return (
		<Button variant='outline' onClick={() => router.push('/setting/model')}>
			{t('setting_model')}
		</Button>
	);
};

export default ModelCollection;
