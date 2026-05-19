import Link from 'next/link';
import { FileText, Shield, ShieldCheck, Users, Waypoints } from 'lucide-react';
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
	{
		href: '/admin/security',
		icon: Shield,
		titleKey: 'admin_overview_security_title',
		descriptionKey: 'admin_overview_security_description',
	},
];

const AdminOverview = async () => {
	const t = await getTranslations();

	return (
		<div className='p-6 sm:p-7'>
			<div className='mb-6 rounded-[28px] border border-border/60 p-6 dark:'>
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

			<div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-4'>
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
