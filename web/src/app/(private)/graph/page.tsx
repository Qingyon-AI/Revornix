'use client';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { searchGraph } from '@/service/graph';
import { useQuery } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const GraphPage = () => {
	const t = useTranslations();

	const { data, isLoading, isError, error, isFetched, isSuccess } = useQuery({
		queryKey: ['searchGraphData'],
		queryFn: async () => searchGraph(),
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
		<div className='flex h-full min-w-0 w-full flex-col px-5 pb-5'>
			<div className='relative flex min-h-0 min-w-0 flex-1 items-center justify-center'>
				{isLoading ? (
					<div className='h-full w-full'>
						<Skeleton className='h-full w-full rounded-2xl' />
					</div>
				) : null}
				{isError ? (
					<div className='text-sm text-muted-foreground'>Error: {error.message}</div>
				) : null}
				{isSuccess && isFetched ? (
					nodes.length === 0 && edges.length === 0 ? (
						<Empty className='h-full w-full'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<Share2 />
								</EmptyMedia>
								<EmptyDescription>{t('graph_empty')}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<EntityGraphCanvas
							nodes={nodes}
							edges={edges}
							className='h-full min-w-0 w-full'
							statsText={t('graph_data', {
								node_count: nodes.length,
								edge_count: edges.length,
							})}
						/>
					)
				) : null}
			</div>
		</div>
	);
};

export default GraphPage;
