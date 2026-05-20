import SeoCommunityBrowser from '@/components/seo/community/seo-community-browser';
import JsonLd from '@/components/seo/shared/json-ld';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import {
	fetchPublicDocuments,
	fetchPublicDocumentLabels,
	fetchPublicSections,
	fetchPublicSectionLabels,
	getPublicSectionHref,
} from '@/lib/seo';
import { buildMetadata, createAbsoluteUrl } from '@/lib/seo-metadata';

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
	return getSingleValue(value) === 'sections' ? 'sections' : 'documents';
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
	if (tab !== 'documents') {
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
	const [sectionsResult, documentsResult, labelsResult] = await Promise.allSettled([
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
		tab === 'documents'
			? fetchPublicDocumentLabels()
			: fetchPublicSectionLabels(),
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

	if (labelsResult.status === 'rejected') {
		console.error('[SEO community] failed to fetch public labels', {
			tab,
			...toLoggableError(labelsResult.reason),
		});
	}

	const sections = sectionsResult.status === 'fulfilled' ? sectionsResult.value : null;
	const documents =
		documentsResult.status === 'fulfilled' ? documentsResult.value : null;
	const labels = labelsResult.status === 'fulfilled' ? labelsResult.value : [];

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

			<SeoCommunityBrowser
				tab={tab}
				keyword={keyword}
				labelId={labelId}
				labels={labels}
				initialSections={sections}
				initialDocuments={documents}
			/>
		</div>
	);
};

export default CommunityPage;
