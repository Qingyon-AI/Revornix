import {
	getSitemapChunk,
	getSitemapChunkCount,
	renderSitemapUrlSetXml,
	SITEMAP_CONTENT_TYPE,
} from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const chunkId = Number(id);

	if (!Number.isInteger(chunkId) || chunkId < 0) {
		return new Response('Not Found', {
			status: 404,
		});
	}

	const chunkCount = await getSitemapChunkCount();
	if (chunkId >= chunkCount) {
		return new Response('Not Found', {
			status: 404,
		});
	}

	const sitemapEntries = await getSitemapChunk(chunkId);

	return new Response(renderSitemapUrlSetXml(sitemapEntries), {
		headers: {
			'Content-Type': SITEMAP_CONTENT_TYPE,
		},
	});
}
