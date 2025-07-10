import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

const InitDone = () => {
	const t = useTranslations();
	return (
		<div className='bg-muted rounded p-5 py-12 flex flex-col justify-center items-center gap-5'>
			<CircleCheck className='size-28 text-muted-foreground' />
			<p className='text-muted-foreground text-sm'>{t('init_done')}</p>
		</div>
	);
};

export default InitDone;
