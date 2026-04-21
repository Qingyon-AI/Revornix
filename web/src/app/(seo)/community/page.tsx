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
import { Separator } from '@/components/ui/separator';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type CommunityTab = 'sections' | 'documents';

const toLoggableError = (reason: unknown) => {
	if (!reason || typeof reason !== 'object') {
		return {
			message: String(reason ?? 'Unknown error'),
			code: undefined,
		};
	}

	const error = reason as {
		message?: string;
		code?: number;
		success?: boolean;
	};

	return {
		message: error.message ?? 'Unknown error',
		code: error.code,
		success: error.success,
	};
};

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
	const [sectionsResult, documentsResult] = await Promise.allSettled([
		tab === 'sections'
			? fetchPublicSections({
					keyword,
					start,
					limit: 12,
					desc: true,
				})
			: Promise.resolve(null),
		tab === 'documents'
			? fetchPublicDocuments({
					keyword,
					start,
					limit: 12,
					desc: true,
				})
			: Promise.resolve(null),
	]);

	if (sectionsResult.status === 'rejected') {
		console.error('[SEO community] failed to fetch public sections', {
			tab,
			keyword,
			start,
			...toLoggableError(sectionsResult.reason),
		});
	}

	if (documentsResult.status === 'rejected') {
		console.error('[SEO community] failed to fetch public documents', {
			tab,
			keyword,
			start,
			...toLoggableError(documentsResult.reason),
		});
	}

	const sections = sectionsResult.status === 'fulfilled' ? sectionsResult.value : null;
	const documents =
		documentsResult.status === 'fulfilled' ? documentsResult.value : null;

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
				? (documents?.elements?.slice(0, 8).map((document) => ({
						'@type': 'Article',
						name: document.title,
						description: document.description,
						url: createAbsoluteUrl(`/document/${document.id}`),
					})) ?? [])
				: (sections?.elements?.slice(0, 8).map((section) => ({
						'@type': 'CollectionPage',
						name: section.title,
						description: section.description,
						url: createAbsoluteUrl(getPublicSectionHref(section)),
					})) ?? []),
	};

	return (
		<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8'>
			<JsonLd data={communitySchema} />

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

			<Separator />

			<div className='md:sticky top-14 z-10 bg-background/92 backdrop-blur-xl py-5'>
				<div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
					<div className='min-w-0 space-y-2'>
						<h2 className='text-xl font-semibold tracking-tight sm:text-2xl'>
							{tab === 'documents'
								? t('seo_community_documents_title')
								: t('seo_community_title')}
						</h2>
						<p className='max-w-[40rem] text-sm leading-6 text-muted-foreground'>
							{tab === 'documents'
								? t('seo_community_documents_description')
								: t('seo_community_description')}
						</p>
					</div>
					<div className='flex w-full min-w-0 flex-col gap-3 xl:max-w-[720px] xl:items-end'>
						<div className='flex w-full min-w-0 flex-wrap items-center gap-3 xl:justify-end'>
							<div className='inline-flex max-w-full rounded-2xl border border-border/60 bg-background/45 p-1'>
								<Button
									asChild
									variant='ghost'
									className={cn(
										'h-9 rounded-xl px-3 shadow-none',
										tab === 'sections'
											? 'border border-border/70 bg-background text-foreground hover:bg-background'
											: 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
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
										'h-9 rounded-xl px-3 shadow-none',
										tab === 'documents'
											? 'border border-border/70 bg-background text-foreground hover:bg-background'
											: 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
									)}>
									<Link
										href={buildCommunityHref({ tab: 'documents', keyword })}>
										<FileText className='mr-2 size-4' />
										{t('seo_community_documents_tab')}
									</Link>
								</Button>
							</div>
						</div>

						<form
							action='/community'
							className='flex w-full min-w-0 flex-col gap-3'>
							<input type='hidden' name='tab' value={tab} />
							<div className='flex w-full min-w-0 flex-col gap-3 sm:flex-row'>
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
								<div className='flex gap-3'>
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
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>

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
