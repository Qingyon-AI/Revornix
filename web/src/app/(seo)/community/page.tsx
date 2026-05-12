import SeoCommunityBrowser from '@/components/seo/seo-community-browser';
import JsonLd from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Compass, FileText, UserRound } from 'lucide-react';
import {
	fetchPublicDocuments,
	fetchPublicSections,
	getPublicSectionHref,
} from '@/lib/seo';
import { buildMetadata, createAbsoluteUrl } from '@/lib/seo-metadata';
import { cn } from '@/lib/utils';

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

const getLabelValue = (value: string | string[] | undefined) => {
	const rawValue = getSingleValue(value);
	if (!rawValue) {
		return undefined;
	}

	const parsedValue = Number(rawValue);
	return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

const buildCommunityHref = ({
	tab,
	keyword,
	start,
	labelId,
}: {
	tab: CommunityTab;
	keyword?: string;
	start?: number;
	labelId?: number;
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
	if (labelId !== undefined) {
		params.set('label', String(labelId));
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
	const labelId = getLabelValue(searchParams.label);
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
			path: buildCommunityHref({ tab, labelId }),
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
		path: buildCommunityHref({ tab, labelId }),
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
	const labelId = getLabelValue(searchParams.label);
	const [sectionsResult, documentsResult] = await Promise.allSettled([
		tab === 'sections'
			? fetchPublicSections({
					keyword,
					start,
					limit: 12,
					desc: true,
					label_ids: labelId !== undefined ? [labelId] : undefined,
				})
			: Promise.resolve(null),
		tab === 'documents'
			? fetchPublicDocuments({
					keyword,
					start,
					limit: 12,
					desc: true,
					label_ids: labelId !== undefined ? [labelId] : undefined,
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
		url: createAbsoluteUrl(buildCommunityHref({ tab, labelId })),
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
		<div className='mx-auto flex w-full max-w-[1480px] flex-col px-4 pb-10 sm:px-6 lg:px-8'>
			<JsonLd data={communitySchema} />

			<section className='md:sticky top-14 z-10 -mx-4 border-b border-border/70 bg-background/76 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'>
				<div className='flex flex-col gap-3'>
					<div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
						<div className='flex min-w-0 flex-wrap items-center gap-2'>
							<Button
								asChild
								variant='outline'
								className={cn(
									'h-9 rounded-xl px-3 shadow-none transition-colors',
									tab === 'sections'
										? 'border-foreground bg-foreground text-background hover:bg-foreground hover:text-background dark:bg-foreground dark:hover:bg-foreground'
								: 'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:bg-background dark:hover:bg-muted',
								)}>
								<Link
									href={buildCommunityHref({
										tab: 'sections',
										keyword,
										labelId,
									})}>
									<Compass className='mr-2 size-4' />
									{t('seo_community_sections_tab')}
								</Link>
							</Button>
							<Button
								asChild
								variant='outline'
								className={cn(
									'h-9 rounded-xl px-3 shadow-none transition-colors',
									tab === 'documents'
										? 'border-foreground bg-foreground text-background hover:bg-foreground hover:text-background dark:bg-foreground dark:hover:bg-foreground'
								: 'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:bg-background dark:hover:bg-muted',
								)}>
								<Link
									href={buildCommunityHref({
										tab: 'documents',
										keyword,
										labelId,
									})}>
									<FileText className='mr-2 size-4' />
									{t('seo_community_documents_tab')}
								</Link>
							</Button>
						</div>

						<div className='flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-muted-foreground sm:text-sm'>
							<span className='inline-flex items-center gap-1.5'>
								<Compass className='size-3.5' />
								{tab === 'documents'
									? t('seo_community_channel_related_sections')
									: t('seo_community_channel_section_overview')}
							</span>
							<span className='inline-flex items-center gap-1.5'>
								<UserRound className='size-3.5' />
								{tab === 'documents'
									? t('seo_community_channel_source_materials')
									: t('seo_community_channel_creators')}
							</span>
							<span className='inline-flex items-center gap-1.5'>
								<FileText className='size-3.5' />
								{tab === 'documents'
									? t('seo_community_channel_readable_documents')
									: t('seo_community_channel_linked_documents')}
							</span>
						</div>
					</div>
				</div>
			</section>

			<SeoCommunityBrowser
				tab={tab}
				keyword={keyword}
				labelId={labelId}
				initialSections={sections}
				initialDocuments={documents}
			/>
		</div>
	);
};

export default CommunityPage;
