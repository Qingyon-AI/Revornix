import type { MetadataRoute } from 'next';
import {
	getSitemapChunk,
	getSitemapChunkCount,
} from '@/lib/sitemap';

export const revalidate = 3600;

export async function generateSitemaps() {
	const chunkCount = await getSitemapChunkCount();

	return Array.from({ length: chunkCount }, (_, id) => ({
		id,
	}));
}

export default async function sitemap(props: {
	id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
	const id = await props.id;
	return getSitemapChunk(id);
}
