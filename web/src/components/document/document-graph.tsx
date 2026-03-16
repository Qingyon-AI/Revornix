'use client';

import { memo, useMemo } from 'react';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import GraphStatePanel from '@/components/graph/graph-state-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentGraphStatus } from '@/enums/document';
import { getQueryClient } from '@/lib/get-query-client';
import { generateDocumentGraph, getDocumentDetail } from '@/service/document';
import { searchDocumentGraph } from '@/service/graph';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '../ui/button';

const DocumentGraph = ({
	document_id,
	showSearch = false,
}: {
	document_id: number;
	showSearch?: boolean;
}) => {
	const t = useTranslations();

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

	const { data, isLoading, isError, error, isFetched } = useQuery({
		queryKey: ['searchDocumentGraphData', document_id, graphStatus],
		queryFn: async () =>
			searchDocumentGraph({
				document_id,
			}),
		enabled: isGraphReady,
	});

	const queryClient = getQueryClient();

	const mutateGenerateDocumentGraph = useMutation({
		mutationFn: () =>
			generateDocumentGraph({
				document_id,
			}),
		onSuccess() {
			toast.success(t('document_graph_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', document_id],
			});
		},
		onError(mutationError) {
			toast.error(mutationError.message);
			console.error(mutationError);
		},
	});

	const nodes: GraphCanvasNode[] = useMemo(
		() =>
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
			})) ?? [],
		[data?.nodes]
	);

	const edges: GraphCanvasLink[] = useMemo(
		() =>
			data?.edges.map((edge) => ({
				source: edge.src_node,
				target: edge.tgt_node,
			})) ?? [],
		[data?.edges]
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
				<div className='text-sm text-muted-foreground'>Error: {error.message}</div>
			) : null}
			{isGraphReady && isLoading ? (
				<Skeleton className='h-full w-full rounded-2xl' />
			) : null}
			{document && !isDocumentDetailError ? (
				<>
					{!document?.graph_task ? (
						<GraphStatePanel
							icon={Sparkles}
							badge={t('document_graph_status_todo')}
							title={t('document_graph_empty')}
							description={t('document_graph_description')}
							tone='warning'
							action={
								<Button
									variant='outline'
									size='sm'
									className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
									disabled={mutateGenerateDocumentGraph.isPending}
									title={t('document_graph_generate')}
									onClick={() => {
										mutateGenerateDocumentGraph.mutate();
									}}>
									{mutateGenerateDocumentGraph.isPending ? (
										<Loader2 className='size-4 animate-spin' />
									) : null}
									{t('document_graph_generate')}
								</Button>
							}
						/>
					) : null}
					{document?.graph_task?.status === DocumentGraphStatus.WAIT_TO ? (
						<GraphStatePanel
							icon={Sparkles}
							badge={t('document_graph_status_todo')}
							title={t('document_graph_wait_to')}
							description={t('document_graph_description')}
							tone='warning'
						/>
					) : null}
					{document?.graph_task?.status === DocumentGraphStatus.BUILDING ? (
						<GraphStatePanel
							icon={Loader2}
							badge={t('document_graph_status_doing')}
							title={t('document_graph_building')}
							description={t('document_graph_description')}
							spinning
							tone='default'
						/>
					) : null}
					{document?.graph_task?.status === DocumentGraphStatus.FAILED ? (
						<GraphStatePanel
							icon={AlertCircle}
							badge={t('document_graph_status_failed')}
							title={t('document_graph_failed')}
							description={t('document_graph_description')}
							iconClassName='text-destructive'
							tone='danger'
							action={
								<Button
									variant='outline'
									size='sm'
									className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
									disabled={mutateGenerateDocumentGraph.isPending}
									title={t('document_graph_regenerate')}
									onClick={() => {
										mutateGenerateDocumentGraph.mutate();
									}}>
									{mutateGenerateDocumentGraph.isPending ? (
										<Loader2 className='size-4 animate-spin' />
									) : null}
									{t('document_graph_regenerate')}
								</Button>
							}
						/>
					) : null}
					{isGraphReady && isFetched && nodes.length === 0 ? (
						<GraphStatePanel
							icon={Sparkles}
							badge={t('document_graph_status_success')}
							title={t('document_graph_data_empty')}
							description={t('document_graph_description')}
							tone='success'
						/>
					) : null}
					{isGraphReady && nodes.length > 0 ? (
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

DocumentGraph.displayName = 'DocumentGraph';

export default memo(DocumentGraph);
