'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	ArrowLeft,
	FileText,
	LayoutDashboard,
	Shield,
	ShieldCheck,
	Users,
	Waypoints,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import CompactNavControls from '@/components/app/compact-nav-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/provider/user-provider';
import { UserRole } from '@/enums/user';

const ADMIN_NAV_ITEMS = [
	{
		href: '/admin',
		icon: LayoutDashboard,
		labelKey: 'admin_nav_overview',
	},
	{
		href: '/admin/users',
		icon: Users,
		labelKey: 'admin_nav_users',
	},
	{
		href: '/admin/documents',
		icon: FileText,
		labelKey: 'admin_nav_documents',
	},
	{
		href: '/admin/sections',
		icon: Waypoints,
		labelKey: 'admin_nav_sections',
	},
	{
		href: '/admin/security',
		icon: Shield,
		labelKey: 'admin_nav_security',
	},
];

const AdminLayoutShell = ({ children }: { children: React.ReactNode }) => {
	const t = useTranslations();
	const pathname = usePathname();
	const { mainUserInfo } = useUserContext();

	return (
		<div className='min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_18%),linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_18%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.98))]'>
			<div className='mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6'>
				<aside className='w-full rounded-[30px] border border-border/60 bg-card/90 p-5 shadow-[0_28px_80px_-54px_rgba(15,23,42,0.4)] backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[320px] lg:shrink-0'>
					<div className='flex h-full flex-col gap-5'>
						<div className='space-y-4'>
							<div className='inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300'>
								<ShieldCheck className='size-3.5' />
								{t('admin_console_badge')}
							</div>
							<div className='space-y-2'>
								<h1 className='text-2xl font-semibold tracking-tight'>
									{t('admin_layout_title')}
								</h1>
								<p className='text-sm leading-6 text-muted-foreground'>
									{t('admin_layout_description')}
								</p>
							</div>
						</div>

						<nav className='grid gap-2'>
							{ADMIN_NAV_ITEMS.map((item) => {
								const Icon = item.icon;
								const active =
									pathname === item.href ||
									(item.href !== '/admin' && pathname.startsWith(item.href));
								return (
									<Link key={item.href} href={item.href}>
										<div
											className={cn(
												'flex items-center gap-3 rounded-2xl border px-4 py-3 transition',
												active
													? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
													: 'border-border/60 bg-background/55 text-foreground hover:border-emerald-500/20 hover:bg-emerald-500/5',
											)}>
											<Icon className='size-4' />
											<span className='font-medium'>{t(item.labelKey)}</span>
										</div>
									</Link>
								);
							})}
						</nav>

						<div className='mt-auto space-y-3'>
							<div className='flex items-center justify-end'>
								<CompactNavControls />
							</div>

							<div className='rounded-[24px] border border-border/60 bg-background/60 p-4 space-y-2'>
								<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
									{t('admin_layout_current_user')}
								</div>
								<div className='flex items-center justify-between gap-3'>
									<div className='min-w-0'>
										<div className='truncate font-semibold'>
											{mainUserInfo?.nickname || t('loading')}
										</div>
									</div>
									<Badge className='rounded-full bg-linear-to-r from-sky-500 to-emerald-500 text-white'>
										{mainUserInfo?.role === UserRole.ROOT ? 'ROOT' : 'ADMIN'}
									</Badge>
								</div>
								<Link href='/dashboard' className='block'>
									<Button variant='outline' className='w-full rounded-2xl'>
										<ArrowLeft className='size-4' />
										{t('admin_layout_back_workspace')}
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</aside>

				<main className='min-w-0 flex-1 rounded-[30px] border border-border/60 bg-card/85 shadow-[0_28px_80px_-54px_rgba(15,23,42,0.38)] backdrop-blur'>
					{children}
				</main>
			</div>
		</div>
	);
};

export default AdminLayoutShell;
