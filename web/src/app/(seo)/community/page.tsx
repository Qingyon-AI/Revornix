import SeoCommunityBrowser from '@/components/seo/seo-community-browser';
import JsonLd from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Compass, FileText, Search } from 'lucide-react';
import {
	fetchPublicDocuments,
	fetchPublicSections,
	getPublicSectionHref,
} from '@/lib/seo';
import { buildMetadata, createAbsoluteUrl } from '@/lib/seo-metadata';
import { cn } from '@/lib/utils';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type CommunityTab = 'sections' | 'documents';

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

const getTabValue = (value: string | string[] | undefined): CommunityTab => {
	return getSingleValue(value) === 'documents' ? 'documents' : 'sections';
};

const buildCommunityHref = ({
	tab,
	keyword,
	start,
}: {
	tab: CommunityTab;
	keyword?: string;
	start?: number;
}) => {
	const params = new URLSearchParams();
	if (tab !== 'sections') {
		params.set('tab', tab);
	}
	if (keyword) {
		params.set('q', keyword);
	}
	if (start !== undefined) {
		params.set('start', String(start));
	}
	const query = params.toString();
	return query ? `/community?${query}` : '/community';
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
	const tab = getTabValue(searchParams.tab);
	const noIndex = Boolean(keyword) || start !== undefined;

	if (keyword) {
		return buildMetadata({
			title: `${keyword} | ${
				tab === 'documents'
					? t('seo_community_documents_title')
					: t('seo_community_title')
			}`,
			description:
				tab === 'documents'
					? t('seo_community_documents_description')
					: t('seo_community_description'),
			path: buildCommunityHref({ tab }),
			noIndex,
			socialCard: {
				eyebrow:
					tab === 'documents'
						? t('seo_community_documents_tab')
						: t('seo_community_sections_tab'),
				theme: 'community',
			},
			keywords:
				tab === 'documents'
					? [keyword, 'community', 'public documents']
					: [keyword, 'community', 'public sections'],
		});
	}

	return buildMetadata({
		title:
			tab === 'documents'
				? t('seo_community_documents_title')
				: t('seo_community_title'),
		description:
			tab === 'documents'
				? t('seo_community_documents_description')
				: t('seo_community_description'),
		path: buildCommunityHref({ tab }),
		noIndex,
		socialCard: {
			eyebrow:
				tab === 'documents'
					? t('seo_community_documents_tab')
					: t('seo_community_sections_tab'),
			theme: 'community',
		},
		keywords:
			tab === 'documents'
				? ['community', 'public documents', 'knowledge sharing']
				: ['community', 'public sections', 'knowledge sharing'],
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
	const tab = getTabValue(searchParams.tab);
	const [sections, documents] = await Promise.all([
		tab === 'sections'
			? fetchPublicSections({
					keyword,
					start,
					limit: 12,
					desc: true,
				})
			: null,
		tab === 'documents'
			? fetchPublicDocuments({
					keyword,
					start,
					limit: 12,
					desc: true,
				})
			: null,
	]);

	const surfaceCardClassName =
		'gap-0 rounded-[24px] border border-border/60 bg-background/24 py-0 shadow-none';
	const communitySchema = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name:
			tab === 'documents'
				? t('seo_community_documents_title')
				: t('seo_community_title'),
		description:
			tab === 'documents'
				? t('seo_community_documents_description')
				: t('seo_community_description'),
		url: createAbsoluteUrl(buildCommunityHref({ tab })),
		inLanguage: locale,
		mainEntity:
			tab === 'documents'
				? documents?.elements?.slice(0, 8).map((document) => ({
						'@type': 'Article',
						name: document.title,
						description: document.description,
						url: createAbsoluteUrl(`/document/${document.id}`),
					})) ?? []
				: sections?.elements?.slice(0, 8).map((section) => ({
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
				className={`relative overflow-hidden rounded-[24px] ${surfaceCardClassName}`}>
				<CardContent className='relative z-10 px-5 py-8 sm:px-8 sm:py-10 lg:px-10'>
					<div className='flex flex-col gap-6'>
						<div className='max-w-3xl space-y-4'>
							<div className='space-y-3'>
								<h1 className='text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl'>
									{tab === 'documents'
										? t('seo_community_documents_title')
										: t('seo_community_title')}
								</h1>
								<p className='max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base'>
									{tab === 'documents'
										? t('seo_community_documents_description')
										: t('seo_community_description')}
								</p>
							</div>
						</div>
					</div>

					<div className='mt-8 inline-flex w-fit rounded-[18px] border border-border/60 bg-background/35 p-1'>
						<Button
							asChild
							variant='ghost'
							className={cn(
								'h-10 rounded-[14px] px-4 shadow-none transition-all',
								tab === 'sections'
									? 'border border-border/70 bg-background text-foreground hover:bg-background'
									: 'border border-transparent bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground',
							)}>
							<Link href={buildCommunityHref({ tab: 'sections', keyword })}>
								<Compass className='mr-2 size-4' />
								{t('seo_community_sections_tab')}
							</Link>
						</Button>
						<Button
							asChild
							variant='ghost'
							className={cn(
								'h-10 rounded-[14px] px-4 shadow-none transition-all',
								tab === 'documents'
									? 'border border-border/70 bg-background text-foreground hover:bg-background'
									: 'border border-transparent bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground',
							)}>
							<Link href={buildCommunityHref({ tab: 'documents', keyword })}>
								<FileText className='mr-2 size-4' />
								{t('seo_community_documents_tab')}
							</Link>
						</Button>
					</div>

					<form
						action='/community'
						className='mt-8 flex flex-col gap-3 sm:flex-row'>
						<input type='hidden' name='tab' value={tab} />
						<div className='relative flex-1'>
							<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
							<Input
								type='search'
								name='q'
								defaultValue={keyword}
								placeholder={
									tab === 'documents'
										? t('seo_community_documents_search_placeholder')
										: t('seo_community_search_placeholder')
								}
								className='h-11 rounded-2xl border-border/60 bg-background/45 pl-10'
							/>
						</div>
						<Button type='submit' className='h-11 rounded-2xl px-5'>
							{t('seo_community_search_action')}
						</Button>
						{keyword ? (
							<Link href={buildCommunityHref({ tab })}>
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

			<Card className={surfaceCardClassName}>
				<CardContent className='px-5 py-6 sm:px-7 sm:py-7'>
					<div className='space-y-5'>
						<div className='space-y-3'>
							<h2 className='text-2xl font-semibold tracking-tight'>
								{t('seo_community_intro_title')}
							</h2>
							<p className='text-sm leading-7 text-muted-foreground sm:text-base'>
								{tab === 'documents'
									? t('seo_community_documents_intro_paragraph_1')
									: t('seo_community_intro_paragraph_1')}
							</p>
							<p className='text-sm leading-7 text-muted-foreground sm:text-base'>
								{tab === 'documents'
									? t('seo_community_documents_intro_paragraph_2')
									: t('seo_community_intro_paragraph_2')}
							</p>
							<p className='text-sm leading-7 text-muted-foreground sm:text-base'>
								{tab === 'documents'
									? t('seo_community_documents_intro_paragraph_3')
									: t('seo_community_intro_paragraph_3')}
							</p>
						</div>

						<div className='space-y-3'>
							<h3 className='text-lg font-semibold tracking-tight'>
								{t('seo_community_explore_title')}
							</h3>
							<ul className='list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base'>
								<li>
									{tab === 'documents'
										? t('seo_community_documents_explore_documents')
										: t('seo_community_explore_sections')}
								</li>
								<li>
									{tab === 'documents'
										? t('seo_community_documents_explore_sources')
										: t('seo_community_explore_creators')}
								</li>
								<li>
									{tab === 'documents'
										? t('seo_community_documents_explore_sections')
										: t('seo_community_explore_documents')}
								</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>

			<SeoCommunityBrowser
				tab={tab}
				keyword={keyword}
				initialSections={sections}
				initialDocuments={documents}
			/>
		</div>
	);
};

export default CommunityPage;
