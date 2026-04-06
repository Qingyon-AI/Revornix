import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
	ArrowRight,
	BookOpen,
	CheckCircle2,
	DatabaseZap,
	Lock,
	PenSquare,
	Sparkles,
	Users,
} from 'lucide-react';

import { Badge } from './ui/badge';
import { Button } from './ui/button';

const GrowthPath = () => {
	const t = useTranslations();

	const personas = [
		{
			title: t('persona_1_title'),
			description: t('persona_1_description'),
			Icon: BookOpen,
		},
		{
			title: t('persona_2_title'),
			description: t('persona_2_description'),
			Icon: PenSquare,
		},
		{
			title: t('persona_3_title'),
			description: t('persona_3_description'),
			Icon: Users,
		},
	];

	const steps = [
		{
			title: t('start_step_1_title'),
			description: t('start_step_1_description'),
		},
		{
			title: t('start_step_2_title'),
			description: t('start_step_2_description'),
		},
		{
			title: t('start_step_3_title'),
			description: t('start_step_3_description'),
		},
	];

	const trustSignals = [
		{
			title: t('trust_1_title'),
			description: t('trust_1_description'),
			Icon: Lock,
		},
		{
			title: t('trust_2_title'),
			description: t('trust_2_description'),
			Icon: DatabaseZap,
		},
		{
			title: t('trust_3_title'),
			description: t('trust_3_description'),
			Icon: Sparkles,
		},
	];

	return (
		<section className='relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-gradient-to-b from-white via-slate-50 to-slate-100 p-6 dark:border-white/10 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 md:p-10'>
			<div className='absolute -left-16 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-sky-400/20 blur-3xl' />
			<div className='absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl' />

			<div className='relative space-y-8'>
				<div className='max-w-3xl space-y-4'>
					<Badge className='rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-semibold tracking-[0.22em] text-slate-500 dark:border-white/15 dark:bg-white/10 dark:text-slate-300'>
						{t('growth_badge')}
					</Badge>
					<h2 className='text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl'>
						{t('growth_title')}
					</h2>
					<p className='text-base leading-relaxed text-slate-600 dark:text-slate-300'>
						{t('growth_description')}
					</p>
				</div>

				<div className='grid gap-6 lg:grid-cols-2'>
					<div className='space-y-4'>
						<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>
							{t('persona_title')}
						</h3>
						{personas.map((persona) => (
							<div
								key={persona.title}
								className='rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5'>
								<div className='flex items-center gap-3'>
									<div className='inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white/15'>
										<persona.Icon className='h-4 w-4' />
									</div>
									<p className='font-semibold text-slate-900 dark:text-white'>
										{persona.title}
									</p>
								</div>
								<p className='mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
									{persona.description}
								</p>
							</div>
						))}
					</div>

					<div className='rounded-2xl border border-slate-200/70 bg-white/85 p-5 dark:border-white/10 dark:bg-slate-900/70'>
						<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>
							{t('start_path_title')}
						</h3>
						<ol className='mt-5 space-y-4'>
							{steps.map((step, index) => (
								<li key={step.title} className='flex items-start gap-3'>
									<span className='mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white/15'>
										{index + 1}
									</span>
									<div>
										<p className='font-medium text-slate-900 dark:text-white'>
											{step.title}
										</p>
										<p className='text-sm text-slate-600 dark:text-slate-300'>
											{step.description}
										</p>
									</div>
								</li>
							))}
						</ol>

						<div className='mt-6 flex flex-wrap gap-3'>
							<Button asChild className='rounded-full'>
								<Link href='https://app.revornix.com' className='text-sm'>
									{t('growth_primary_cta')}
									<ArrowRight className='ml-2 h-4 w-4' />
								</Link>
							</Button>
							<Button asChild variant='outline' className='rounded-full'>
								<Link href='/docs/start' className='text-sm'>
									{t('growth_secondary_cta')}
								</Link>
							</Button>
							<Button asChild variant='ghost' className='rounded-full'>
								<Link href='/docs/question' className='text-sm'>
									{t('growth_tertiary_cta')}
								</Link>
							</Button>
						</div>
						<p className='mt-4 text-xs text-slate-500 dark:text-slate-400'>
							{t('growth_note')}
						</p>
					</div>
				</div>

				<div className='grid gap-4 sm:grid-cols-3'>
					{trustSignals.map((signal) => (
						<div
							key={signal.title}
							className='rounded-2xl border border-slate-200/70 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5'>
							<div className='flex items-center gap-2 text-slate-900 dark:text-white'>
								<signal.Icon className='h-4 w-4' />
								<p className='font-semibold'>{signal.title}</p>
							</div>
							<p className='mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
								{signal.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default GrowthPath;
