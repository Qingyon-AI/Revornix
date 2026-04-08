import Link from 'next/link';
import { FileText, ShieldCheck, Users, Waypoints } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CARDS = [
	{
		href: '/admin/users',
		icon: Users,
		titleKey: 'admin_overview_users_title',
		descriptionKey: 'admin_overview_users_description',
	},
	{
		href: '/admin/documents',
		icon: FileText,
		titleKey: 'admin_overview_documents_title',
		descriptionKey: 'admin_overview_documents_description',
	},
	{
		href: '/admin/sections',
		icon: Waypoints,
		titleKey: 'admin_overview_sections_title',
		descriptionKey: 'admin_overview_sections_description',
	},
];

const AdminOverview = async () => {
	const t = await getTranslations();

	return (
		<div className='p-6 sm:p-7'>
			<div className='mb-6 rounded-[28px] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_85%_16%,rgba(56,189,248,0.14),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_85%_16%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(15,23,42,0.86))]'>
				<div className='inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300'>
					<ShieldCheck className='size-3.5' />
					{t('admin_console_badge')}
				</div>
				<h2 className='mt-4 text-3xl font-semibold tracking-tight'>
					{t('admin_overview_title')}
				</h2>
				<p className='mt-3 max-w-3xl text-base leading-7 text-muted-foreground'>
					{t('admin_overview_description')}
				</p>
			</div>

			<div className='grid gap-4 lg:grid-cols-3'>
				{CARDS.map((card) => {
					const Icon = card.icon;
					return (
						<Link key={card.href} href={card.href} className='block'>
							<Card className='h-full rounded-[26px] border-border/60 py-0 transition hover:border-emerald-500/25 hover:bg-emerald-500/5'>
								<CardHeader className='px-6 pt-6'>
									<div className='mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'>
										<Icon className='size-5' />
									</div>
									<CardTitle className='text-xl tracking-tight'>
										{t(card.titleKey)}
									</CardTitle>
									<CardDescription className='leading-6'>
										{t(card.descriptionKey)}
									</CardDescription>
								</CardHeader>
								<CardContent className='px-6 pb-6 text-sm text-muted-foreground'>
									{t('admin_overview_open_module')}
								</CardContent>
							</Card>
						</Link>
					);
				})}
			</div>
		</div>
	);
};

export default AdminOverview;
