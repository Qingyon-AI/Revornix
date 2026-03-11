'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

const PRIVACY_POLICY_URL = 'https://revornix.com/en/docs/privacy';
const TERMS_OF_SERVICE_URL = 'https://revornix.com/docs/tos';

const AuthLegalNotice = () => {
	const t = useTranslations();

	return (
		<p className='text-center text-xs leading-6 text-muted-foreground'>
			{t('auth_legal_notice_prefix')}{' '}
			<Link
				href={TERMS_OF_SERVICE_URL}
				target='_blank'
				className='font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80'>
				{t('auth_legal_notice_terms')}
			</Link>{' '}
			{t('auth_legal_notice_and')}{' '}
			<Link
				href={PRIVACY_POLICY_URL}
				target='_blank'
				className='font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80'>
				{t('auth_legal_notice_privacy')}
			</Link>
		</p>
	);
};

export default AuthLegalNotice;
