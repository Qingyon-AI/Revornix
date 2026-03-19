import PublicSectionCard from '@/components/seo/public-section-card';
import JsonLd from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight, Compass, Search } from 'lucide-react';
import { fetchPublicSections, getPublicSectionHref } from '@/lib/seo';
import { buildMetadata, createAbsoluteUrl } from '@/lib/seo-metadata';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const getSingleValue = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
};

const getStartValue = (value: string | string[] | undefined) => {
	const rawValue = getSingleValue(value);
	if (!rawValue) {
		return undefined;
	}

	const parsedValue = Number(rawValue);
	return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

export async function generateMetadata(props: {
	searchParams: SearchParams;
}): Promise<Metadata> {
	const [t, searchParams] = await Promise.all([
		getTranslations(),
		props.searchParams,
	]);
	const keyword = getSingleValue(searchParams.q)?.trim();
	const start = getStartValue(searchParams.start);
	const noIndex = Boolean(keyword) || start !== undefined;

	if (keyword) {
		return buildMetadata({
			title: `${keyword} | ${t('seo_community_title')}`,
			description: t('seo_community_description'),
			path: '/community',
			noIndex,
			keywords: [keyword, 'community', 'public sections'],
		});
	}

	return buildMetadata({
		title: t('seo_community_title'),
		description: t('seo_community_description'),
		path: '/community',
		noIndex,
		keywords: ['community', 'public sections', 'knowledge sharing'],
	});
}

const CommunityPage = async (props: { searchParams: SearchParams }) => {
	const [t, locale, searchParams] = await Promise.all([
		getTranslations(),
		getLocale(),
		props.searchParams,
	]);
	const keyword = getSingleValue(searchParams.q)?.trim() || undefined;
	const start = getStartValue(searchParams.start);
	const sections = await fetchPublicSections({
		keyword,
		start,
		limit: 12,
		desc: true,
	});

	const nextHref = new URLSearchParams();
	if (keyword) {
		nextHref.set('q', keyword);
	}
	if (sections.next_start !== undefined && sections.next_start !== null) {
		nextHref.set('start', String(sections.next_start));
	}

	const surfaceCardClassName =
		'gap-0 rounded-[26px] border border-border/60 bg-card/88 py-0 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur';
	const communitySchema = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: t('seo_community_title'),
		description: t('seo_community_description'),
		url: createAbsoluteUrl('/community'),
		inLanguage: locale,
		mainEntity:
			sections.elements?.slice(0, 8).map((section) => ({
				'@type': 'CollectionPage',
				name: section.title,
				description: section.description,
				url: createAbsoluteUrl(getPublicSectionHref(section)),
			})) ?? [],
	};

	return (
		<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8'>
			<JsonLd data={communitySchema} />
			<Card
				className={`relative overflow-hidden rounded-[26px] ${surfaceCardClassName}`}>
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.12),transparent_22%)]' />
				<CardContent className='px-5 py-8 sm:px-8 sm:py-10 lg:px-10'>
					<div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
						<div className='max-w-3xl space-y-4'>
							<div className='space-y-3'>
								<h1 className='text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl'>
									{t('seo_community_title')}
								</h1>
								<p className='max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base'>
									{t('seo_community_description')}
								</p>
							</div>
						</div>

						<div className='grid gap-3 sm:grid-cols-3 lg:w-[420px]'>
							<div className='rounded-[24px] border border-border/60 bg-background/65 px-4 py-4 backdrop-blur'>
								<div className='text-xs uppercase tracking-[0.18em] text-muted-foreground'>
									{t('section_publish_status_on')}
								</div>
								<div className='mt-2 text-2xl font-semibold'>
									{sections.total ?? 0}
								</div>
							</div>
							<div className='rounded-[24px] border border-border/60 bg-background/65 px-4 py-4 backdrop-blur'>
								<div className='text-xs uppercase tracking-[0.18em] text-muted-foreground'>
									{t('section_documents')}
								</div>
								<div className='mt-2 text-2xl font-semibold'>
									{sections.elements?.reduce(
										(total, item) => total + (item.documents_count ?? 0),
										0,
									) ?? 0}
								</div>
							</div>
							<div className='rounded-[24px] border border-border/60 bg-background/65 px-4 py-4 backdrop-blur'>
								<div className='text-xs uppercase tracking-[0.18em] text-muted-foreground'>
									{t('section_subscribers')}
								</div>
								<div className='mt-2 text-2xl font-semibold'>
									{sections.elements?.reduce(
										(total, item) => total + (item.subscribers_count ?? 0),
										0,
									) ?? 0}
								</div>
							</div>
						</div>
					</div>

					<form
						action='/community'
						className='mt-8 flex flex-col gap-3 sm:flex-row'>
						<div className='relative flex-1'>
							<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
							<Input
								type='search'
								name='q'
								defaultValue={keyword}
								placeholder={t('seo_community_search_placeholder')}
								className='h-11 rounded-2xl border-border/60 bg-background/72 pl-10'
							/>
						</div>
						<Button type='submit' className='h-11 rounded-2xl px-5'>
							{t('seo_community_search_action')}
						</Button>
						{keyword ? (
							<Link href='/community'>
								<Button
									type='button'
									variant='outline'
									className='h-11 rounded-2xl px-5'>
									{t('seo_community_reset')}
								</Button>
							</Link>
						) : null}
					</form>
				</CardContent>
			</Card>

			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex items-center gap-2 text-sm text-muted-foreground'>
					<Compass className='size-4' />
					<span>
						{t('seo_community_result', {
							count: sections.total ?? 0,
						})}
					</span>
				</div>
				{keyword ? (
					<div className='text-sm text-muted-foreground'>“{keyword}”</div>
				) : null}
			</div>

			{sections.elements && sections.elements.length > 0 ? (
				<div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
					{sections.elements.map((section) => (
						<PublicSectionCard
							key={`${section.id}-${section.publish_uuid ?? 'private'}`}
							section={section}
						/>
					))}
				</div>
			) : (
				<Card className='rounded-[30px] border border-dashed border-border/70 bg-muted/20 shadow-none'>
					<CardContent className='flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 py-10 text-center'>
						<div className='flex size-14 items-center justify-center rounded-full border border-border/60 bg-background/75'>
							<Compass className='size-6 text-muted-foreground' />
						</div>
						<div className='space-y-2'>
							<h2 className='text-xl font-semibold'>
								{t('seo_community_empty')}
							</h2>
							<p className='max-w-lg text-sm leading-6 text-muted-foreground'>
								{t('seo_community_empty_description')}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				{sections.has_more && sections.next_start ? (
					<Link href={`/community?${nextHref.toString()}`}>
						<Button className='rounded-2xl'>
							{t('seo_community_next')}
							<ArrowRight />
						</Button>
					</Link>
				) : null}
			</div>
		</div>
	);
};

export default CommunityPage;
