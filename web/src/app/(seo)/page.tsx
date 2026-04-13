import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookMarked, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	buildMetadata,
	createAbsoluteUrl,
	formatMetaTitle,
} from '@/lib/seo-metadata';
import JsonLd from '@/components/seo/json-ld';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations();
	return buildMetadata({
		title: formatMetaTitle(t('seo_home_title')),
		description: t('seo_home_description'),
		path: '/',
		keywords: ['public knowledge hub', 'community sections', 'creator profiles'],
	});
}

const SEOPage = async () => {
	const t = await getTranslations();
	const cookieStore = await cookies();
	const access_token = cookieStore.get('access_token');
	if (access_token) {
		redirect('/dashboard');
	}

	const homeSchema = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: t('seo_home_title'),
		description: t('seo_home_description'),
		url: createAbsoluteUrl('/'),
		mainEntity: {
			'@type': 'ItemList',
			name: t('seo_home_learn_title'),
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: t('seo_home_learn_1'),
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: t('seo_home_learn_2'),
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: t('seo_home_learn_3'),
				},
			],
		},
	};

	return (
		<div className='mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-12'>
			<JsonLd data={homeSchema} />
			<section className='relative overflow-hidden rounded-[32px] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.38)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.2),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(15,23,42,0.84))] sm:p-8 lg:p-10'>
				<div className='max-w-4xl space-y-5'>
					<div className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
						{t('seo_home_eyebrow')}
					</div>
					<h1 className='max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.05]'>
						{t('seo_home_heading')}
					</h1>
					<p className='max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg'>
						{t('seo_home_intro')}
					</p>
					<div className='flex flex-col gap-3 sm:flex-row'>
						<Link href='/community'>
							<Button className='rounded-2xl px-5'>
								{t('seo_home_primary_cta')}
								<ArrowRight />
							</Button>
						</Link>
						<Link href='/login'>
							<Button variant='outline' className='rounded-2xl px-5'>
								{t('seo_home_secondary_cta')}
							</Button>
						</Link>
					</div>
				</div>
			</section>

			<section className='grid gap-4 md:grid-cols-3'>
				<Card className='rounded-[28px] border border-border/60 bg-card/88 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)]'>
					<CardContent className='space-y-3 p-6'>
						<BookMarked className='size-5 text-emerald-500' />
						<h2 className='text-xl font-semibold'>{t('seo_home_highlight_sections')}</h2>
						<p className='text-sm leading-7 text-muted-foreground'>{t('seo_home_body_1')}</p>
					</CardContent>
				</Card>
				<Card className='rounded-[28px] border border-border/60 bg-card/88 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)]'>
					<CardContent className='space-y-3 p-6'>
						<Users className='size-5 text-sky-500' />
						<h2 className='text-xl font-semibold'>{t('seo_home_highlight_creators')}</h2>
						<p className='text-sm leading-7 text-muted-foreground'>{t('seo_home_body_2')}</p>
					</CardContent>
				</Card>
				<Card className='rounded-[28px] border border-border/60 bg-card/88 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)]'>
					<CardContent className='space-y-3 p-6'>
						<FileText className='size-5 text-amber-500' />
						<h2 className='text-xl font-semibold'>{t('seo_home_highlight_documents')}</h2>
						<ul className='list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground'>
							<li>{t('seo_home_learn_1')}</li>
							<li>{t('seo_home_learn_2')}</li>
							<li>{t('seo_home_learn_3')}</li>
						</ul>
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default SEOPage;
