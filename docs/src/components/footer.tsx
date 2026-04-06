import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Footer } from 'nextra-theme-docs';
import ICP from './icp';

const CustomFooter = () => {
	const t = useTranslations();

	return (
		<Footer className='grid grid-cols-1 md:grid-cols-3 gap-6'>
			<div className='flex flex-col text-sm gap-5'>
				<Link href='https://app.revornix.com'>{t('hero_primary_cta')}</Link>
				<Link href='https://github.com/Qingyon-AI/Revornix' target={'_blank'}>
					{t('github_url')}
				</Link>
				<Link
					href='https://github.com/Qingyon-AI/Revornix/blob/develop/LICENSE'
					target={'_blank'}>
					{t('opensource_legal')}
				</Link>
				<Link
					href='https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3'
					target={'_blank'}>
					{t('roadmap')}
				</Link>
				<Link href='/blogs'>{t('blogs')}</Link>
				<p>
					© {new Date().getFullYear()}{' '}
					<Link href='https://qingyon.com'>{t('company')}</Link>
					{t('rights')}
				</p>
				<ICP />
			</div>
			<div className='flex flex-col text-sm gap-5'>
				<Link
					href='https://github.com/Qingyon-AI/Revornix-Npm-Lib'
					target={'_blank'}>
					{t('system_eco_npm')}
				</Link>
				<Link
					href='https://github.com/Qingyon-AI/Revornix-Python-Lib'
					target={'_blank'}>
					{t('system_eco_pip')}
				</Link>
				<Link
					href='https://github.com/Qingyon-AI/Revornix-Chrome-Extension'
					target={'_blank'}>
					{t('system_eco_chrome_plugin')}
				</Link>
			</div>
			<div className='flex flex-col text-sm gap-5'>
				<p className='text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
					{t('footer_contact_title')}
				</p>
				<Link href='mailto:1142704468@qq.com'>{t('footer_contact_email')}</Link>
				<Link href='https://discord.com/invite/3XZfz84aPN' target={'_blank'}>
					{t('footer_contact_discord')}
				</Link>
				<Link href='https://github.com/Qingyon-AI/Revornix/issues' target={'_blank'}>
					{t('footer_contact_issues')}
				</Link>
				<Link href='/docs/contact'>{t('footer_contact_more')}</Link>
			</div>
		</Footer>
	);
};

export default CustomFooter;
