import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import {
	fetchPublicSectionDocuments,
	fetchPublicSections,
	type PublicSectionInfo,
} from '@/lib/seo';
import { createAbsoluteUrl, toIsoDate } from '@/lib/seo-metadata';

export const SITEMAP_REVALIDATE_SECONDS = 3600;
export const SITEMAP_URLS_PER_FILE = 50000;
export const SITEMAP_CONTENT_TYPE = 'application/xml; charset=utf-8';

const SECTION_PAGE_SIZE = 50;
const DOCUMENTS_PER_SECTION = 20;
const SECTION_DOCUMENT_CONCURRENCY = 5;

const getLastModified = (value?: Date | string | null) => {
	return value ? new Date(value) : new Date();
};

const escapeXml = (value: string) => {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
};

const addEntry = (
	entries: Map<string, MetadataRoute.Sitemap[number]>,
	path: string,
	lastModified?: Date | string | null,
	changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'],
	priority?: number,
) => {
	entries.set(path, {
		url: createAbsoluteUrl(path),
		lastModified: getLastModified(lastModified),
		changeFrequency,
		priority,
	});
};

const fetchAllPublicSections = async () => {
	const sections: PublicSectionInfo[] = [];
	let start: number | undefined;
	const seenStarts = new Set<number | undefined>();

	while (true) {
		if (seenStarts.has(start)) {
			console.error(
				'[SEO] Repeated public section pagination cursor detected while generating sitemap:',
				start,
			);
			break;
		}
		seenStarts.add(start);

		const response = await fetchPublicSections({
			start,
			limit: SECTION_PAGE_SIZE,
			desc: true,
		});

		sections.push(...(response.elements ?? []));

		if (
			!response.has_more ||
			response.next_start === undefined ||
			response.next_start === null
		) {
			break;
		}

		if (response.next_start === start) {
			console.error(
				'[SEO] Public section pagination did not advance while generating sitemap:',
				start,
			);
			break;
		}

		start = response.next_start;
	}

	return sections;
};

const fetchAllPublicSectionDocuments = async (sectionId: number) => {
	const documents: Awaited<
		ReturnType<typeof fetchPublicSectionDocuments>
	>['elements'] = [];
	let start: number | undefined;
	const seenStarts = new Set<number | undefined>();

	while (true) {
		if (seenStarts.has(start)) {
			console.error(
				'[SEO] Repeated public section document pagination cursor detected while generating sitemap:',
				sectionId,
				start,
			);
			break;
		}
		seenStarts.add(start);

		const response = await fetchPublicSectionDocuments({
			section_id: sectionId,
			start,
			limit: DOCUMENTS_PER_SECTION,
			keyword: '',
			desc: true,
		});

		documents.push(...(response.elements ?? []));

		if (
			!response.has_more ||
			response.next_start === undefined ||
			response.next_start === null
		) {
			break;
		}

		if (response.next_start === start) {
			console.error(
				'[SEO] Public section document pagination did not advance while generating sitemap:',
				sectionId,
				start,
			);
			break;
		}

		start = response.next_start;
	}

	return documents;
};

const buildSitemapEntries = async (): Promise<MetadataRoute.Sitemap> => {
	const entries = new Map<string, MetadataRoute.Sitemap[number]>();

	addEntry(entries, '/community', new Date(), 'daily', 1);

	let publicSections: PublicSectionInfo[] = [];
	try {
		publicSections = await fetchAllPublicSections();
	} catch (error) {
		console.error(
			'[SEO] Failed to fetch public sections for sitemap:',
			error,
		);
		return Array.from(entries.values());
	}

	const creatorLatestUpdate = new Map<number, Date>();

	for (const section of publicSections) {
		if (!section.publish_uuid) {
			continue;
		}

		const lastModified = getLastModified(
			section.update_time ?? section.create_time,
		);
		addEntry(
			entries,
			`/section/${section.publish_uuid}`,
			lastModified,
			'weekly',
			0.9,
		);

		if (section.creator?.id) {
			const currentLatest = creatorLatestUpdate.get(section.creator.id);
			if (!currentLatest || lastModified > currentLatest) {
				creatorLatestUpdate.set(section.creator.id, lastModified);
			}
		}
	}

	for (const [creatorId, lastModified] of creatorLatestUpdate.entries()) {
		addEntry(entries, `/user/${creatorId}`, lastModified, 'weekly', 0.7);
	}

	const documentSections = publicSections.filter(
		(section) => section.publish_uuid && (section.documents_count ?? 0) > 0,
	);

	for (
		let index = 0;
		index < documentSections.length;
		index += SECTION_DOCUMENT_CONCURRENCY
	) {
		const sectionBatch = documentSections.slice(
			index,
			index + SECTION_DOCUMENT_CONCURRENCY,
		);
		const documentPages = await Promise.all(
			sectionBatch.map(async (section) => {
				try {
					return await fetchAllPublicSectionDocuments(section.id);
				} catch (error) {
					console.error(
						'[SEO] Failed to fetch public section documents for sitemap:',
						section.id,
						error,
					);
					return [];
				}
			}),
		);

		for (const documents of documentPages) {
			for (const document of documents) {
				addEntry(
					entries,
					`/document/${document.id}`,
					document.update_time ?? document.create_time,
					'monthly',
					0.6,
				);
			}
		}
	}

	return Array.from(entries.values());
};

export const getAllSitemapEntries = unstable_cache(
	buildSitemapEntries,
	['public-sitemap-entries'],
	{
		revalidate: SITEMAP_REVALIDATE_SECONDS,
	},
);

const buildSitemapChunks = async (): Promise<Array<MetadataRoute.Sitemap>> => {
	const entries = await getAllSitemapEntries();
	const chunks: Array<MetadataRoute.Sitemap> = [];

	for (let index = 0; index < entries.length; index += SITEMAP_URLS_PER_FILE) {
		chunks.push(entries.slice(index, index + SITEMAP_URLS_PER_FILE));
	}

	return chunks.length > 0 ? chunks : [[]];
};

export const getAllSitemapChunks = unstable_cache(
	buildSitemapChunks,
	['public-sitemap-chunks'],
	{
		revalidate: SITEMAP_REVALIDATE_SECONDS,
	},
);

export const getSitemapChunkCount = unstable_cache(
	async () => {
		const chunks = await getAllSitemapChunks();
		return chunks.length;
	},
	['public-sitemap-chunk-count'],
	{
		revalidate: SITEMAP_REVALIDATE_SECONDS,
	},
);

export const getSitemapChunk = async (
	id: string | number,
): Promise<MetadataRoute.Sitemap> => {
	const chunkId = Number(id);
	if (!Number.isInteger(chunkId) || chunkId < 0) {
		return [];
	}

	const chunks = await getAllSitemapChunks();
	return chunks[chunkId] ?? [];
};

const getChunkLastModified = (chunk: MetadataRoute.Sitemap) => {
	let lastModified: Date | undefined;

	for (const entry of chunk) {
		if (!entry.lastModified) {
			continue;
		}

		const parsedDate = new Date(entry.lastModified);
		if (Number.isNaN(parsedDate.getTime())) {
			continue;
		}

		if (!lastModified || parsedDate > lastModified) {
			lastModified = parsedDate;
		}
	}

	return lastModified;
};

export const getSitemapIndexUrl = () => {
	return createAbsoluteUrl('/sitemap.xml');
};

export const getSitemapChunkUrls = unstable_cache(
	async () => {
		const chunkCount = await getSitemapChunkCount();

		return Array.from({ length: chunkCount }, (_, index) =>
			createAbsoluteUrl(`/sitemap/${index}.xml`),
		);
	},
	['public-sitemap-chunk-urls'],
	{
		revalidate: SITEMAP_REVALIDATE_SECONDS,
	},
);

export const getSitemapChunkDescriptors = unstable_cache(
	async () => {
		const chunks = await getAllSitemapChunks();

		return chunks.map((chunk, index) => ({
			id: index,
			url: createAbsoluteUrl(`/sitemap/${index}.xml`),
			lastModified: getChunkLastModified(chunk),
		}));
	},
	['public-sitemap-chunk-descriptors'],
	{
		revalidate: SITEMAP_REVALIDATE_SECONDS,
	},
);

export const renderSitemapIndexXml = (
	entries: Array<{
		url: string;
		lastModified?: Date | string | null;
	}>,
) => {
	const body = entries
		.map((entry) => {
			const lastModified = toIsoDate(entry.lastModified);

			return [
				'<sitemap>',
				`<loc>${escapeXml(entry.url)}</loc>`,
				lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : '',
				'</sitemap>',
			]
				.filter(Boolean)
				.join('');
		})
		.join('');

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`,
	].join('');
};

export const renderSitemapUrlSetXml = (entries: MetadataRoute.Sitemap) => {
	const body = entries
		.map((entry) => {
			const lastModified = toIsoDate(entry.lastModified);

			return [
				'<url>',
				`<loc>${escapeXml(entry.url)}</loc>`,
				lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : '',
				entry.changeFrequency
					? `<changefreq>${escapeXml(entry.changeFrequency)}</changefreq>`
					: '',
				typeof entry.priority === 'number'
					? `<priority>${entry.priority.toFixed(1)}</priority>`
					: '',
				'</url>',
			]
				.filter(Boolean)
				.join('');
		})
		.join('');

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
	].join('');
};
