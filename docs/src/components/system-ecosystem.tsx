import React from 'react';
import { FaApple, FaChrome, FaNpm, FaPython, FaWeixin } from 'react-icons/fa';

import { Badge } from './ui/badge';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type EcosystemStatus = 'published' | 'developing';

interface EcosystemItem {
	name: string;
	description: string;
	icon: React.ReactNode;
	status: EcosystemStatus;
	channel: string;
	accent: string;
	eta?: string;
	url?: string;
}

const statusStyles: Record<EcosystemStatus, string> = {
	published:
		'border border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300',
	developing:
		'border border-amber-400/30 bg-amber-400/10 text-amber-600 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300',
};

const SystemEcosystem: React.FC = () => {
	const t = useTranslations();

	const items: EcosystemItem[] = [
		{
			name: t('system_eco_npm'),
			description: t('system_eco_npm_des'),
			icon: <FaNpm size={32} className='text-red-500' />,
			status: 'published',
			channel: 'Web SDK',
			accent: 'from-red-500/30 to-orange-400/30',
			url: 'https://github.com/Qingyon-AI/Revornix-Npm-Lib',
		},
		{
			name: t('system_eco_pip'),
			description: t('system_eco_pip_des'),
			icon: <FaPython size={32} className='text-sky-500' />,
			status: 'published',
			channel: 'Python SDK',
			accent: 'from-sky-500/30 to-cyan-400/30',
			url: 'https://github.com/Qingyon-AI/Revornix-Python-Lib',
		},
		{
			name: t('system_eco_chrome_plugin'),
			description: t('system_eco_chrome_plugin_des'),
			icon: <FaChrome size={32} className='text-blue-500' />,
			status: 'published',
			channel: 'Browser Extension',
			accent: 'from-indigo-500/30 to-blue-400/30',
			url: 'https://github.com/Qingyon-AI/Revornix-Chrome-Extension',
		},
		{
			name: t('system_eco_ios_app'),
			description: t('system_eco_ios_app_des'),
			icon: <FaApple size={32} className='text-zinc-700 dark:text-zinc-200' />,
			status: 'developing',
			channel: 'Mobile Native',
			accent: 'from-slate-500/30 to-slate-300/20',
			eta: '2026 03',
		},
		{
			name: t('system_eco_wechat_miniprogram'),
			description: t('system_eco_wechat_miniprogram_des'),
			icon: <FaWeixin size={32} className='text-emerald-500' />,
			status: 'developing',
			channel: 'Mini Program',
			accent: 'from-emerald-500/30 to-lime-400/30',
			eta: '2026 05',
		},
	];

	return (
		<section className='relative mb-10 overflow-hidden rounded-[32px] border border-slate-200/50 bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-16 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 md:px-12'>
			<div className='absolute -right-24 top-0 h-72 w-72 rounded-full bg-sky-400/20 blur-[120px]' />
			<div className='absolute -bottom-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-400/20 blur-[140px]' />

			<div className='relative mx-auto max-w-6xl space-y-12'>
				<header className='mx-auto max-w-3xl text-center'>
					<Badge className='mb-6 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1 text-xs font-medium tracking-[0.25em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300'>
						{t('system_eco')}
					</Badge>
					<h2 className='text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white mb-6'>
						{t('system_eco_title')}
					</h2>
					<p className='text-base leading-relaxed text-slate-600 dark:text-slate-300'>
						{t('system_eco_description')}
					</p>
				</header>

				<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
					{items.map((item, index) => (
						<React.Fragment key={item.name}>
							{item.url ? (
								<Link href={item.url} target={'_blank'} key={index}>
									<article
										key={item.name}
										className='group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_40px_100px_-80px_rgba(30,64,175,0.45)] transition duration-300 hover:-translate-y-1 hover:border-slate-200/80 hover:shadow-[0_60px_120px_-70px_rgba(37,99,235,0.25)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_50px_120px_-90px_rgba(14,165,233,0.35)]'>
										<div
											className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition duration-300 group-hover:opacity-60 ${item.accent}`}
										/>
										<div className='relative flex flex-col gap-4'>
											<div className='flex items-center justify-between'>
												<div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-slate-900 shadow-inner shadow-slate-900/5 dark:bg-white/10 dark:text-white'>
													{item.icon}
												</div>
												<span
													className={`rounded-full px-3 py-1 text-xs font-semibold ${
														statusStyles[item.status]
													}`}>
													{item.status === 'developing'
														? t('developing')
														: t('published')}
												</span>
											</div>

											<div>
												<h3 className='text-lg font-semibold text-slate-900 dark:text-white'>
													{item.name}
												</h3>
												<p className='mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
													{item.description}
												</p>
											</div>
										</div>

										<div className='relative mt-auto flex items-center justify-between pt-5 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
											<span>{item.channel}</span>
											{item.eta ? (
												<span>
													{t('about')} {item.eta}
												</span>
											) : (
												<span>{t('stable_run')}</span>
											)}
										</div>
									</article>
								</Link>
							) : (
								<article
									key={item.name}
									className='group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_40px_100px_-80px_rgba(30,64,175,0.45)] transition duration-300 hover:-translate-y-1 hover:border-slate-200/80 hover:shadow-[0_60px_120px_-70px_rgba(37,99,235,0.25)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_50px_120px_-90px_rgba(14,165,233,0.35)]'>
									<div
										className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition duration-300 group-hover:opacity-60 ${item.accent}`}
									/>
									<div className='relative flex flex-col gap-4'>
										<div className='flex items-center justify-between'>
											<div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-slate-900 shadow-inner shadow-slate-900/5 dark:bg-white/10 dark:text-white'>
												{item.icon}
											</div>
											<span
												className={`rounded-full px-3 py-1 text-xs font-semibold ${
													statusStyles[item.status]
												}`}>
												{item.status === 'developing'
													? t('developing')
													: t('published')}
											</span>
										</div>

										<div>
											<h3 className='text-lg font-semibold text-slate-900 dark:text-white'>
												{item.name}
											</h3>
											<p className='mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
												{item.description}
											</p>
										</div>
									</div>

									<div className='relative mt-auto flex items-center justify-between pt-5 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
										<span>{item.channel}</span>
										{item.eta ? (
											<span>
												{t('about')} {item.eta}
											</span>
										) : (
											<span>{t('stable_run')}</span>
										)}
									</div>
								</article>
							)}
						</React.Fragment>
					))}
				</div>
			</div>
		</section>
	);
};

export default SystemEcosystem;
