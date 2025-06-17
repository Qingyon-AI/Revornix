import Link from 'next/link';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';

const EngineManager = () => {
	const t = useTranslations()
	return (
		<Link href={'/setting/engine'}>
			<Button variant={'outline'}>{t('setting_engine_manage')}</Button>
		</Link>
	);
};

export default EngineManager;
