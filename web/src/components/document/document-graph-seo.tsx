'use client';

import { memo, useMemo } from 'react';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import GraphStatePanel from '@/components/graph/graph-state-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentGraphStatus } from '@/enums/document';
import type { GraphResponse } from '@/generated';
import { getRenderableGraphData } from '@/lib/graph-render';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import type { PublicDocumentDetail } from '@/lib/seo';
import { searchDocumentGraph, searchPublicDocumentGraph } from '@/service/graph';
import { getDocumentDetail, getPublicDocumentDetail } from '@/service/document';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

const DocumentGraphSEO = ({
	document_id,
	showSearch = false,
	hideStatePanels = false,
	initialDocument,
	initialGraph,
	publicMode = false,
}: {
	document_id: number;
	showSearch?: boolean;
	hideStatePanels?: boolean;
	initialDocument?: PublicDocumentDetail | null;
	initialGraph?: GraphResponse | null;
	publicMode?: boolean;
}) => {
	const t = useTranslations();

	const {
		data: document,
		isError: isDocumentDetailError,
		error: documentDetailError,
	} = useQuery({
		queryKey: publicMode
			? ['getPublicDocumentDetail', document_id]
			: ['getDocumentDetail', document_id],
		queryFn: () =>
			publicMode
				? getPublicDocumentDetail({ document_id })
				: getDocumentDetail({ document_id }),
		initialData: initialDocument ?? undefined,
		retry: publicMode ? false : undefined,
		refetchOnWindowFocus: publicMode ? false : undefined,
		enabled: !(publicMode && Boolean(initialDocument)),
		staleTime: publicMode && initialDocument ? Infinity : undefined,
	});
	const graphStatus = document?.graph_task?.status;
	const isGraphReady = graphStatus === DocumentGraphStatus.SUCCESS;
	const freshnessState = getDocumentFreshnessState(document);

	const { data, isLoading, isError, error, isFetched } = useQuery({
		queryKey: publicMode
			? ['searchPublicDocumentGraphData', document_id, graphStatus]
			: ['searchDocumentGraphData', document_id, graphStatus],
		queryFn: async () =>
			publicMode
				? searchPublicDocumentGraph({ document_id })
				: searchDocumentGraph({ document_id }),
		initialData: initialGraph ?? undefined,
		retry: publicMode ? false : undefined,
		refetchOnWindowFocus: publicMode ? false : undefined,
		enabled: isGraphReady && !(publicMode && Boolean(initialGraph)),
		staleTime: publicMode && initialGraph ? Infinity : undefined,
	});

	const renderableGraph = useMemo(() => getRenderableGraphData(data), [data]);
	const hasIncompleteGraphPayload =
		Boolean(data?.nodes?.length || data?.edges?.length) &&
		!renderableGraph.hasRenderableGraph;
	const nodes: GraphCanvasNode[] = useMemo(
		() =>
			renderableGraph.nodes.map((node) => ({
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
			})),
		[renderableGraph.nodes],
	);

	const edges: GraphCanvasLink[] = useMemo(
		() =>
			renderableGraph.edges.map((edge) => ({
				source: edge.src_node,
				target: edge.tgt_node,
			})),
		[renderableGraph.edges],
	);

	return (
		<div className='relative flex h-full min-h-40 w-full items-center justify-center'>
			{!document && !isDocumentDetailError ? (
				<Skeleton className='h-full w-full rounded-2xl' />
			) : null}
			{isDocumentDetailError ? (
				<div className='text-sm text-muted-foreground'>
					Error: {documentDetailError.message}
				</div>
			) : null}
			{isGraphReady && isError ? (
				<div className='text-sm text-muted-foreground'>
					Error: {error.message}
				</div>
			) : null}
			{isGraphReady && isLoading ? (
				<Skeleton className='h-full w-full rounded-2xl' />
			) : null}
			{document && !isDocumentDetailError ? (
				<>
					{!hideStatePanels && !hasIncompleteGraphPayload && !document.graph_task ? (
						<GraphStatePanel
							icon={Sparkles}
							badge={t('document_graph_status_todo')}
							title={t('document_graph_empty')}
							description={t('document_graph_description')}
							tone='warning'
						/>
					) : null}
					{!hideStatePanels &&
					!hasIncompleteGraphPayload &&
					document.graph_task?.status === DocumentGraphStatus.WAIT_TO ? (
						<GraphStatePanel
							icon={Sparkles}
							badge={t('document_graph_status_todo')}
							title={t('document_graph_wait_to')}
							description={t('document_graph_description')}
							tone='warning'
						/>
					) : null}
					{!hideStatePanels &&
					!hasIncompleteGraphPayload &&
					document.graph_task?.status === DocumentGraphStatus.BUILDING ? (
						<GraphStatePanel
							icon={Loader2}
							badge={t('document_graph_status_doing')}
							title={t('document_graph_building')}
							description={t('document_graph_description')}
							spinning
							tone='default'
						/>
					) : null}
					{!hideStatePanels &&
					!hasIncompleteGraphPayload &&
					document.graph_task?.status === DocumentGraphStatus.FAILED ? (
						<GraphStatePanel
							icon={AlertCircle}
							badge={t('document_graph_status_failed')}
							title={t('document_graph_failed')}
							description={t('document_graph_description')}
							iconClassName='text-destructive'
							tone='danger'
						/>
					) : null}
					{!hideStatePanels &&
					!hasIncompleteGraphPayload &&
					isGraphReady &&
					isFetched &&
					nodes.length === 0 ? (
						<GraphStatePanel
							icon={Sparkles}
							badge={
								freshnessState.graphStale
									? t('document_status_stale')
									: t('document_graph_status_success')
							}
							title={t('document_graph_data_empty')}
							description={t('document_graph_description')}
							tone={freshnessState.graphStale ? 'warning' : 'success'}
						/>
					) : null}
					{nodes.length > 0 ? (
						<EntityGraphCanvas
							nodes={nodes}
							edges={edges}
							className='h-full w-full'
							showSearch={showSearch}
						/>
					) : null}
				</>
			) : null}
		</div>
	);
};

DocumentGraphSEO.displayName = 'DocumentGraphSEO';

export default memo(DocumentGraphSEO);
