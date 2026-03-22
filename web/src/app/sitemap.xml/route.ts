import {
	getSitemapChunkDescriptors,
	renderSitemapIndexXml,
	SITEMAP_CONTENT_TYPE,
} from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
	const sitemapChunks = await getSitemapChunkDescriptors();

	return new Response(renderSitemapIndexXml(sitemapChunks), {
		headers: {
			'Content-Type': SITEMAP_CONTENT_TYPE,
		},
	});
}
