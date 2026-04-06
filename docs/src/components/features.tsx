import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import {
	Sparkles,
	Workflow,
	LineChart,
	Brain,
	Share2,
	ShieldCheck,
	ServerCog,
	Scaling,
} from 'lucide-react';
import Link from 'next/link';

interface Feature {
	title: string;
	description: string;
	Icon: LucideIcon;
	accent: string;
	url?: string;
}

const FeatureCard = ({ feature }: { feature: Feature }) => {
	const t = useTranslations();

	const { Icon, title, description, accent } = feature;

	return (
		<div className='group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 transition duration-300 hover:-translate-y-1 hover:border-slate-200/80 hover:shadow-[0_40px_120px_-40px_rgba(37,99,235,0.3)] dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-[0_30px_90px_-60px_rgba(15,23,42,0.9)]'>
			<div
				className={`absolute -left-6 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-70 ${accent}`}
			/>
			<div className='relative flex flex-col gap-5 h-full'>
				<div className='inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-900/20 transition duration-300 group-hover:scale-105 group-hover:shadow-lg dark:bg-white/15'>
					<Icon className='h-6 w-6' />
				</div>
				<div className='space-y-3 flex-1'>
					<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>
						{title}
					</h3>
					<p className='text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
						{description}
					</p>
				</div>
				{feature.url && (
					<Link
						href={feature.url}
						className='mt-auto pt-4 text-sm font-medium text-slate-900/70 transition duration-300 group-hover:text-sky-600 dark:text-slate-200/80 dark:group-hover:text-sky-300'>
						{t('view_more')} →
					</Link>
				)}
			</div>
		</div>
	);
};

const iconPalette = [
	{
		icon: Sparkles,
		accent: 'bg-sky-400/40',
	},
	{
		icon: Workflow,
		accent: 'bg-indigo-400/40',
	},
	{
		icon: Share2,
		accent: 'bg-pink-400/40',
	},
	{
		icon: LineChart,
		accent: 'bg-emerald-400/40',
	},
	{
		icon: ShieldCheck,
		accent: 'bg-amber-400/40',
	},
	{
		icon: Brain,
		accent: 'bg-purple-400/40',
	},
	{
		icon: ServerCog,
		accent: 'bg-cyan-400/40',
	},
	{
		icon: Scaling,
		accent: 'bg-rose-400/40',
	},
];

const Features = () => {
	const t = useTranslations();

	const featureEntries: Feature[] = [
		{
			title: t('feature_1'),
			description: t('feature_1_tips'),
			Icon: iconPalette[0].icon,
			accent: iconPalette[0].accent,
			url: '/docs/documents/document-collect',
		},
		{
			title: t('feature_2'),
			description: t('feature_2_tips'),
			Icon: iconPalette[1].icon,
			accent: iconPalette[1].accent,
			url: '/docs/ai/engine',
		},
		{
			title: t('feature_3'),
			description: t('feature_3_tips'),
			Icon: iconPalette[2].icon,
			accent: iconPalette[2].accent,
			url: '/docs/developer/structure',
		},
		{
			title: t('feature_4'),
			description: t('feature_4_tips'),
			Icon: iconPalette[3].icon,
			accent: iconPalette[3].accent,
			url: '/docs/sections/section-share',
		},
		{
			title: t('feature_5'),
			description: t('feature_5_tips'),
			Icon: iconPalette[4].icon,
			accent: iconPalette[4].accent,
			url: 'https://github.com/Qingyon-AI/Revornix',
		},
		{
			title: t('feature_6'),
			description: t('feature_6_tips'),
			Icon: iconPalette[5].icon,
			accent: iconPalette[5].accent,
			url: '/docs/ai/revornix-ai',
		},
		{
			title: t('feature_7'),
			description: t('feature_7_tips'),
			Icon: iconPalette[6].icon,
			accent: iconPalette[6].accent,
			url: '/docs/ai/custom-model',
		},
		{
			title: t('feature_8'),
			description: t('feature_8_tips'),
			Icon: iconPalette[7].icon,
			accent: iconPalette[7].accent,
			url: '/docs/integrations/openclaw-skill',
		},
	];

	return (
		<section className='relative'>
			<div className='mx-auto text-center'>
				<h2 className='text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white mb-6'>
					{t('features')}
				</h2>
				<p className='text-base leading-relaxed text-slate-600 dark:text-slate-300'>
					{t('features_description')}
				</p>
			</div>

			<div className='mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
				{featureEntries.map((feature, index) => (
					<FeatureCard key={index} feature={feature} />
				))}
			</div>
		</section>
	);
};

export default Features;
