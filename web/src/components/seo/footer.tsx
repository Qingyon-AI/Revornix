import { useTranslations } from 'next-intl';
import Link from 'next/link';

const Footer = () => {
	const t = useTranslations();
	return (
		<div className='w-full text-xs text-muted-foreground p-5'>
			<p className='text-center'>
				Copyright ©{' '}
				<Link href={'https://www.qingyon.com'} target='_blank'>
					Qingyong Technology (Hangzhou) Co., Inc.
				</Link>{' '}
				Since {2024}.
			</p>
		</div>
	);
};

export default Footer;
