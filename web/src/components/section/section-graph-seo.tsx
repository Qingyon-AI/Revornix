'use client';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import { Skeleton } from '@/components/ui/skeleton';
import { searchSectionGraph } from '@/service/graph';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

const SectionGraphSEO = ({
	section_id,
	showSearch = false,
}: {
	section_id: number;
	showSearch?: boolean;
}) => {
	const t = useTranslations();

	const { data, isLoading, isError, error, isFetched } = useQuery({
		queryKey: ['searchDocumentGraph', section_id],
		queryFn: async () =>
			searchSectionGraph({
				section_id,
			}),
	});

	const nodes: GraphCanvasNode[] =
		data?.nodes.map((node) => ({
			id: node.id,
			label: node.text,
			group: 'entity',
			degree: node.degree,
			sources:
				node.sources?.map((source) => ({
					doc_id: source.doc_id,
					doc_title: source.doc_title ?? undefined,
					chunk_id: source.chunk_id ?? undefined,
				})) ?? [],
		})) ?? [];

	const edges: GraphCanvasLink[] =
		data?.edges.map((edge) => ({
			source: edge.src_node,
			target: edge.tgt_node,
		})) ?? [];

	return (
		<div className='relative flex w-full items-center justify-center md:h-full'>
			{isError ? (
				<div className='text-sm text-muted-foreground'>Error: {error.message}</div>
			) : null}
			{isLoading ? <Skeleton className='h-full w-full rounded-2xl' /> : null}
			{isFetched && nodes.length > 0 ? (
				<EntityGraphCanvas
					nodes={nodes}
					edges={edges}
					className='h-full w-full'
					showSearch={showSearch}
				/>
			) : null}
			{isFetched && nodes.length === 0 ? (
				<div className='text-sm text-muted-foreground'>
					{t('section_graph_empty')}
				</div>
			) : null}
		</div>
	);
};

export default SectionGraphSEO;
