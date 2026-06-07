'use client';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import GraphModeTabs from '@/components/graph/graph-mode-tabs';
import GraphStatePanel from '@/components/graph/graph-state-panel';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { searchGraph, type GraphMode } from '@/service/graph';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

const GraphPage = () => {
	const t = useTranslations();
	const router = useRouter();
	const loader = useTopLoader();
	const [mode, setMode] = useState<GraphMode>('knowledge');

	const { data, isLoading, isError, error, isFetched, isSuccess } = useQuery({
		queryKey: ['searchGraphData', mode],
		queryFn: async () => searchGraph({ mode }),
	});

	const nodes: GraphCanvasNode[] =
		data?.nodes.map((node) => ({
			id: node.id,
			label: node.text,
			group: node.kind === 'document' ? 'document' : 'entity',
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

	const modeTabs = <GraphModeTabs value={mode} onValueChange={setMode} />;
	const showCanvas =
		isSuccess && isFetched && (nodes.length > 0 || edges.length > 0);

	return (
		<div className='flex min-h-0 min-w-0 flex-1 w-full'>
			<div className='relative flex min-h-0 min-w-0 flex-1'>
				{!showCanvas ? (
					<div className='absolute left-1/2 top-4 z-30 -translate-x-1/2'>
						{modeTabs}
					</div>
				) : null}
				{isLoading ? (
					<div className='h-full w-full flex justify-center items-center'>
						{t('loading')}
						<Spinner />
					</div>
				) : null}
				{isError ? (
					<GraphStatePanel
						icon={AlertTriangle}
						tone='warning'
						className='h-full w-full'
						title={t('something_wrong')}
						description={error.message || t('request_error')}
					/>
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
							toolbar={modeTabs}
							statsText={t('graph_data', {
								node_count: nodes.length,
								edge_count: edges.length,
							})}
							onDocumentNodeClick={(documentId) => {
								loader.start();
								router.push(`/document/detail/${documentId}`);
							}}
						/>
					)
				) : null}
			</div>
		</div>
	);
};

export default GraphPage;
