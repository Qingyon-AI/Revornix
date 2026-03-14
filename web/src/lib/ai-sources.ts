import { AIChunkCitation, AIDocumentSource } from '@/types/ai';

const pickNonEmptyArray = <T>(primary?: T[], fallback?: T[]) => {
	if (Array.isArray(primary) && primary.length > 0) {
		return primary;
	}
	return Array.isArray(fallback) ? fallback : undefined;
};

export const mergeDocumentSources = (
	existing: AIDocumentSource[] = [],
	incoming: AIDocumentSource[] = [],
) => {
	const mergedByDocumentId = new Map<number, AIDocumentSource>();

	for (const source of existing) {
		mergedByDocumentId.set(source.document_id, source);
	}

	for (const source of incoming) {
		const current = mergedByDocumentId.get(source.document_id);
		if (!current) {
			mergedByDocumentId.set(source.document_id, source);
			continue;
		}

		mergedByDocumentId.set(source.document_id, {
			...current,
			...source,
			description: source.description ?? current.description,
			section_titles: pickNonEmptyArray(source.section_titles, current.section_titles),
			source_tool: source.source_tool ?? current.source_tool,
		});
	}

	return [...mergedByDocumentId.values()];
};

export const mergeChunkCitations = (
	existing: AIChunkCitation[] = [],
	incoming: AIChunkCitation[] = [],
) => {
	const mergedByChunkId = new Map<string, AIChunkCitation>();

	for (const citation of existing) {
		mergedByChunkId.set(citation.chunk_id, citation);
	}

	for (const citation of incoming) {
		const current = mergedByChunkId.get(citation.chunk_id);
		mergedByChunkId.set(citation.chunk_id, current ? { ...current, ...citation } : citation);
	}

	return [...mergedByChunkId.values()];
};
