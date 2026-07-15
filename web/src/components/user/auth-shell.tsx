'use client';

import CompactNavControls from '@/components/app/compact-nav-controls';
import { BookOpenText, Bot, LibraryBig, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
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
		<div className='grid min-h-svh lg:grid-cols-2'>
			<div className='flex flex-col gap-4 p-6 md:p-10'>
				<div className='flex items-center justify-between gap-2'>
					<Link
						href='https://revornix.com'
						target='_blank'
						className='flex items-center gap-2 font-medium'>
						<div className='flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground'>
							<Sparkles className='size-4' />
						</div>
						{t('website_title')}
					</Link>
					<CompactNavControls />
				</div>
				<div className='flex flex-1 items-center justify-center'>
					<div className='w-full max-w-sm'>{children}</div>
				</div>
				<AuthLegalNotice />
			</div>

			<div className='relative hidden overflow-hidden border-l border-border/60 bg-muted/40 px-10 dark:bg-background/30 lg:flex lg:flex-col lg:justify-center xl:px-14'>
				<div className='pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.03] blur-3xl dark:bg-white/[0.03]' />
				<div className='relative'>
					<div className='max-w-xl space-y-3'>
						<h1 className='text-balance text-[1.85rem] font-semibold leading-[1.08] tracking-tight text-foreground xl:text-[2.2rem]'>
							{t('auth_shell_title')}
						</h1>
						<p className='max-w-lg text-sm leading-7 text-muted-foreground'>
							{t('auth_shell_description')}
						</p>
					</div>
					<div className='mt-6 grid gap-3'>
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
			</div>
		</div>
	);
};

export default AuthShell;
