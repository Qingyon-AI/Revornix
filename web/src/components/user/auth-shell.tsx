'use client';

import { BookOpenText, Bot, LibraryBig, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import AuthLegalNotice from './auth-legal-notice';

const featureCards = [
	{
		key: 'capture',
		icon: LibraryBig,
	},
	{
		key: 'organize',
		icon: BookOpenText,
	},
	{
		key: 'assist',
		icon: Bot,
	},
];

const AuthShell = ({ children }: { children: ReactNode }) => {
	const t = useTranslations();

	return (
		<div className='relative flex h-full min-h-0 items-center justify-center overflow-hidden px-4 py-4 md:px-6 md:py-8'>
			<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_34%)]' />
			<div className='pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.03] blur-3xl dark:bg-white/[0.03]' />
			<div className='relative w-full max-w-5xl'>
				<div className='overflow-hidden rounded-[30px] border border-border/60 bg-background/92 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:bg-card/88 dark:shadow-[0_28px_80px_-40px_rgba(0,0,0,0.6)]'>
					<div className='grid lg:min-h-[580px] lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.82fr)]'>
						<div className='order-2 border-t border-border/60 px-5 py-5 md:px-8 md:py-8 lg:order-1 lg:border-t-0 lg:flex lg:flex-col lg:justify-center lg:px-10 lg:py-10'>
							<div className='inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/72 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-sm'>
								<Sparkles className='size-3.5' />
								<span>{t('website_title')}</span>
							</div>
							<div className='mt-4 max-w-xl space-y-2.5 md:mt-5 md:space-y-3'>
								<h1 className='text-balance text-[1.55rem] font-semibold leading-[1.08] tracking-tight text-foreground md:text-[1.85rem] lg:text-[2.2rem]'>
									{t('auth_shell_title')}
								</h1>
								<p className='max-w-lg text-sm leading-6 text-muted-foreground md:leading-7'>
									{t('auth_shell_description')}
								</p>
							</div>
							<div className='mt-5 hidden gap-3 sm:grid lg:grid-cols-1'>
								{featureCards.map((item) => {
									const Icon = item.icon;
									return (
										<div
											key={item.key}
											className='flex items-center gap-3 rounded-2xl border border-border/60 bg-background/72 px-4 py-3.5 shadow-sm backdrop-blur-sm'>
											<div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background dark:bg-primary dark:text-primary-foreground'>
												<Icon className='size-4' />
											</div>
											<div className='space-y-1'>
												<p className='text-sm font-medium text-foreground'>
													{t(`auth_shell_feature_${item.key}_title`)}
												</p>
												<p className='text-xs leading-5 text-muted-foreground'>
													{t(`auth_shell_feature_${item.key}_description`)}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>
						<div className='order-1 bg-muted/25 px-5 py-6 dark:bg-background/30 md:px-7 md:py-8 lg:order-2 lg:flex lg:items-center lg:border-l lg:border-t-0 lg:px-8 lg:py-10'>
							<div className='mx-auto w-full max-w-md'>
								{children}
							</div>
						</div>
					</div>
				</div>
				<div className='mt-4 px-2'>
					<AuthLegalNotice />
				</div>
			</div>
		</div>
	);
};

export default AuthShell;
