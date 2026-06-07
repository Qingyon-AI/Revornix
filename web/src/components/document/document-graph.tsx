'use client';

import { memo, useEffect, useMemo, useState } from 'react';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import GraphModeTabs from '@/components/graph/graph-mode-tabs';
import GraphStatePanel from '@/components/graph/graph-state-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentGraphStatus } from '@/enums/document';
import { getRenderableGraphData } from '@/lib/graph-render';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import { getDocumentDetail } from '@/service/document';
import { searchDocumentGraph, type GraphMode } from '@/service/graph';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Hourglass, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';

const DocumentGraph = ({
	document_id,
	showSearch = false,
	hideStatePanels = false,
	onHasRenderableGraphChange,
}: {
	document_id: number;
	showSearch?: boolean;
	hideStatePanels?: boolean;
	onHasRenderableGraphChange?: (hasRenderableGraph: boolean) => void;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const loader = useTopLoader();
	const [mode, setMode] = useState<GraphMode>('knowledge');

	const handleDocumentNodeClick = (documentId: string) => {
		// Clicking the current document's own node would navigate to the same
		// route (a no-op that also leaves the loader spinning), so skip it.
		if (Number(documentId) === document_id) {
			return;
		}
		loader.start();
		router.push(`/document/detail/${documentId}`);
	};

	const {
		data: document,
		isError: isDocumentDetailError,
		error: documentDetailError,
	} = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id }),
	});
	const graphStatus = document?.graph_task?.status;
	const isGraphReady = graphStatus === DocumentGraphStatus.SUCCESS;
	const freshnessState = getDocumentFreshnessState(document);

	const { data, isLoading, isError, error, isFetched } = useQuery({
		queryKey: ['searchDocumentGraphData', document_id, graphStatus, mode],
		queryFn: async () =>
			searchDocumentGraph({
				document_id,
				mode,
			}),
		enabled: isGraphReady,
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
				group: node.kind === 'document' ? 'document' : 'entity',
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

	const hasRenderableGraph = isGraphReady && nodes.length > 0;

	useEffect(() => {
		onHasRenderableGraphChange?.(hasRenderableGraph);
	}, [hasRenderableGraph, onHasRenderableGraphChange]);

	const modeTabs = <GraphModeTabs value={mode} onValueChange={setMode} />;

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
							icon={Hourglass}
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
					{hasRenderableGraph ? (
						<EntityGraphCanvas
							nodes={nodes}
							edges={edges}
							className='h-full w-full'
							showSearch={showSearch}
							toolbar={modeTabs}
							onDocumentNodeClick={handleDocumentNodeClick}
						/>
					) : null}
				</>
			) : null}
			{isGraphReady && !hasRenderableGraph ? (
				<div className='absolute left-1/2 top-3 z-30 -translate-x-1/2'>
					{modeTabs}
				</div>
			) : null}
		</div>
	);
};

DocumentGraph.displayName = 'DocumentGraph';

export default memo(DocumentGraph);
