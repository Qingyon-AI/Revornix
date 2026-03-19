import type { Metadata } from 'next';

const FALLBACK_SITE_URL = 'https://app.revornix.com';
const DEFAULT_SITE_NAME = 'Revornix';
const DEFAULT_SITE_DESCRIPTION = 'An Information Management Tool for the AI Era';
const DEFAULT_OG_IMAGE_PATH = '/images/cover.jpg';

export const DEFAULT_SEO_KEYWORDS = [
	'Revornix',
	'AI',
	'information management',
	'knowledge base',
	'document management',
	'content curation',
];

const ensureProtocol = (value: string) => {
	if (/^https?:\/\//i.test(value)) {
		return value;
	}
	return `https://${value}`;
};

const normalizePath = (path: string) => {
	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}
	return path.startsWith('/') ? path : `/${path}`;
};

const uniqueStrings = (values: Array<string | null | undefined>) => {
	return Array.from(
		new Set(
			values
				.map((value) => value?.trim())
				.filter((value): value is string => Boolean(value)),
		),
	);
};

export const getSiteUrl = () => {
	const rawValue = process.env.NEXT_PUBLIC_HOST?.trim();
	if (rawValue) {
		try {
			return new URL(ensureProtocol(rawValue));
		} catch (error) {
			console.error('[SEO] Invalid NEXT_PUBLIC_HOST:', rawValue, error);
		}
	}
	return new URL(FALLBACK_SITE_URL);
};

export const getSiteOrigin = () => {
	const siteUrl = getSiteUrl();
	return siteUrl.toString().replace(/\/$/, '');
};

export const createAbsoluteUrl = (path: string) => {
	return new URL(normalizePath(path), getSiteUrl()).toString();
};

export const getDefaultOgImage = () => {
	return createAbsoluteUrl(DEFAULT_OG_IMAGE_PATH);
};

export const toMetaDescription = (value: string, maxLength: number = 160) => {
	const normalized = value.replace(/\s+/g, ' ').trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}
	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

export const toIsoDate = (value: Date | string | null | undefined) => {
	if (!value) {
		return undefined;
	}

	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.getTime())) {
		return undefined;
	}

	return parsedDate.toISOString();
};

const getOpenGraphImages = (images?: Array<string | null | undefined>) => {
	const resolvedImages = uniqueStrings(images ?? []).map((image) => {
		if (image.startsWith('http://') || image.startsWith('https://')) {
			return image;
		}
		return createAbsoluteUrl(image);
	});

	if (resolvedImages.length === 0) {
		resolvedImages.push(getDefaultOgImage());
	}

	return resolvedImages.map((url) => ({ url }));
};

const getRobots = (noIndex: boolean): NonNullable<Metadata['robots']> => {
	return {
		index: !noIndex,
		follow: true,
		googleBot: {
			index: !noIndex,
			follow: true,
			'max-image-preview': 'large',
			'max-snippet': -1,
			'max-video-preview': -1,
		},
	};
};

type BuildMetadataOptions = {
	title: string;
	description: string;
	path?: string;
	images?: Array<string | null | undefined>;
	keywords?: Array<string | null | undefined>;
	noIndex?: boolean;
	type?: 'website' | 'article';
	locale?: string;
	publishedTime?: string;
	modifiedTime?: string;
	authors?: string[];
	tags?: string[];
	siteName?: string;
};

export const buildMetadata = ({
	title,
	description,
	path,
	images,
	keywords,
	noIndex = false,
	type = 'website',
	locale,
	publishedTime,
	modifiedTime,
	authors,
	tags,
	siteName = DEFAULT_SITE_NAME,
}: BuildMetadataOptions): Metadata => {
	const normalizedDescription = toMetaDescription(description || DEFAULT_SITE_DESCRIPTION);
	const canonicalUrl = path ? createAbsoluteUrl(path) : undefined;
	const openGraphImages = getOpenGraphImages(images);

	const openGraph =
		type === 'article'
			? {
					title,
					description: normalizedDescription,
					siteName,
					type: 'article' as const,
					locale,
					url: canonicalUrl,
					images: openGraphImages,
					publishedTime,
					modifiedTime,
					authors,
					tags,
				}
			: {
					title,
					description: normalizedDescription,
					siteName,
					type: 'website' as const,
					locale,
					url: canonicalUrl,
					images: openGraphImages,
				};

	return {
		title,
		description: normalizedDescription,
		applicationName: siteName,
		alternates: canonicalUrl
			? {
					canonical: canonicalUrl,
				}
			: undefined,
		category: 'technology',
		creator: siteName,
		publisher: siteName,
		referrer: 'origin-when-cross-origin',
		keywords: uniqueStrings([...DEFAULT_SEO_KEYWORDS, ...(keywords ?? [])]),
		robots: getRobots(noIndex),
		openGraph,
		twitter: {
			card: 'summary_large_image',
			title,
			description: normalizedDescription,
			images: openGraphImages.map((image) => image.url),
		},
	};
};

export const NO_INDEX_METADATA = {
	robots: getRobots(true),
} satisfies Metadata;
