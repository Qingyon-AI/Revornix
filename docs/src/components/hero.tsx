import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MegaphoneIcon, Sparkles, ArrowRight } from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import WeComCode from './wecom-code';

const Hero = () => {
	const t = useTranslations();

	const highlights = [
		{
			title: t('main_feature_1'),
			description: t('main_feature_1_description'),
		},
		{
			title: t('main_feature_2'),
			description: t('main_feature_2_description'),
		},
		{
			title: t('main_feature_3'),
			description: t('main_feature_3_description'),
		},
		{
			title: t('main_feature_4'),
			description: t('main_feature_4_description'),
		},
	];

	return (
		<section className='mt-12'>
			<Link
				href='https://github.com/Qingyon-AI/Revornix/releases'
				target={'_blank'}
				className='w-fit'>
				<Badge
					className='flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium border-blue-500 mb-5 whitespace-break-spaces'
					variant={'outline'}>
					<MegaphoneIcon className='h-4 w-4 shrink-0' />
					<span>{t('latest_news')}</span>
				</Badge>
			</Link>

			<div className='space-y-6 mb-10'>
				<h1 className='text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl'>
					{t('main_slog')}
				</h1>
				<p className='text-lg leading-relaxed sm:text-xl dark:text-slate-100/80'>
					{t('sub_slog')}
				</p>
				<p className='text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base'>
					{t('hero_outcome')}
				</p>
			</div>

			<div className='flex flex-wrap items-center gap-4 mb-10'>
				<Button asChild className='rounded-full'>
					<Link
						href='https://app.revornix.com'
						className='flex items-center gap-2 text-sm'>
						{t('hero_primary_cta')}
						<ArrowRight className='h-4 w-4' />
					</Link>
				</Button>
				<Button
					asChild
					variant='outline'
					className='rounded-full border-slate-300 bg-white/60 text-base font-semibold text-slate-700 backdrop-blur-sm transition hover:border-slate-400 hover:bg-white dark:border-white/30 dark:bg-transparent dark:text-white dark:hover:bg-white/10'>
					<Link href='/docs/start' className='text-sm'>
						{t('hero_secondary_cta')}
					</Link>
				</Button>
				<Button asChild variant={'secondary'} className='rounded-full text-sm'>
					<Link href='/blogs'>{t('hero_tertiary_cta')}</Link>
				</Button>
				<WeComCode
					buttonStyle='button'
					label={t('hero_wecom_short_cta')}
					className='rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15'
				/>
			</div>

			<p className='mb-10 text-xs text-slate-500 dark:text-slate-400'>
				{t('hero_entry_hint')}
			</p>

			<ul className='grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-10'>
				{highlights.map((item, index) => (
					<li
						key={index}
						className='group relative overflow-hidden rounded-2xl border border-sky-100/80 bg-white/70 p-5 shadow-[0_15px_50px_-35px_rgba(14,116,220,0.45)] transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:shadow-[0_15px_40px_-30px_rgba(14,165,233,0.4)]'>
						<div className='absolute right-4 top-4'>
							<Sparkles className='h-5 w-5 text-sky-500 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 dark:text-sky-300' />
						</div>
						<p className='text-base font-semibold text-slate-900 dark:text-white'>
							{item.title}
						</p>
						<p className='mt-2 text-sm text-slate-600 dark:text-slate-100/70'>
							{item.description}
						</p>
					</li>
				))}
			</ul>

			<img
				src='https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260312200944018.png'
				alt={t('hero_preview_alt')}
				className='inset-0 h-full w-full object-cover rounded-xl dark:hidden shadow'
			/>

			<img
				src='https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20260312200910826.png'
				alt={t('hero_preview_alt')}
				className='inset-0 h-full w-full object-cover rounded-xl hidden dark:block shadow'
			/>
		</section>
	);
};

export default Hero;
