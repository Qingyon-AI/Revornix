import { useTranslations } from 'next-intl';
import Link from 'next/link';

const Footer = () => {
	const t = useTranslations();
	return (
		<div className='w-full shrink-0 px-5 py-4 text-xs text-muted-foreground md:px-6'>
			<p className='text-center'>
				Copyright ©{' '}
				<Link href={'https://www.qingyon.com'} target='_blank'>
					Qingyong Technology (Hangzhou) Co., Inc.
				</Link>{' '}
				Since {2025}.
			</p>
		</div>
	);
};

export default Footer;
