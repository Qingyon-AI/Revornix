'use client';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentGraphStatus } from '@/enums/document';
import { getQueryClient } from '@/lib/get-query-client';
import { generateDocumentGraph, getDocumentDetail } from '@/service/document';
import { searchDocumentGraph } from '@/service/graph';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
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

	const { data, isLoading, isError, error, isFetched, refetch } = useQuery({
		queryKey: ['searchDocumentGraphData', document_id],
		queryFn: async () =>
			searchDocumentGraph({
				document_id,
			}),
	});

	const {
		data: document,
		isError: isDocumentDetailError,
		error: documentDetailError,
	} = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id }),
	});

	useEffect(() => {
		if (document?.graph_task?.status === DocumentGraphStatus.SUCCESS) {
			refetch();
		}
	}, [document?.graph_task?.status, refetch]);

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
		<div className='relative flex h-full min-h-40 w-full items-center justify-center'>
			{isDocumentDetailError ? (
				<div className='text-sm text-muted-foreground'>
					Error: {documentDetailError.message}
				</div>
			) : null}
			{isError ? (
				<div className='text-sm text-muted-foreground'>Error: {error.message}</div>
			) : null}
			{isLoading ? <Skeleton className='h-full w-full rounded-2xl' /> : null}
			{isFetched && !isError && !isDocumentDetailError ? (
				<>
					{!document?.graph_task ? (
						<div className='flex flex-col items-center justify-center text-sm text-muted-foreground'>
							{t('document_graph_empty')}
							<Button
								variant='link'
								size='sm'
								className='m-0 p-0 text-muted-foreground underline underline-offset-3'
								disabled={mutateGenerateDocumentGraph.isPending}
								title={t('document_graph_generate')}
								onClick={() => {
									mutateGenerateDocumentGraph.mutate();
								}}>
								{t('document_graph_generate')}
								{mutateGenerateDocumentGraph.isPending ? (
									<Loader2 className='size-4 animate-spin' />
								) : null}
							</Button>
						</div>
					) : null}
					{document?.graph_task?.status === DocumentGraphStatus.WAIT_TO ? (
						<div className='text-sm text-muted-foreground'>
							{t('document_graph_wait_to')}
						</div>
					) : null}
					{document?.graph_task?.status === DocumentGraphStatus.BUILDING ? (
						<div className='text-sm text-muted-foreground'>
							{t('document_graph_building')}
						</div>
					) : null}
					{document?.graph_task?.status === DocumentGraphStatus.FAILED ? (
						<div className='flex flex-col items-center justify-center text-sm text-muted-foreground'>
							{t('document_graph_failed')}
							<Button
								variant='link'
								size='sm'
								className='m-0 p-0 text-muted-foreground underline underline-offset-3'
								disabled={mutateGenerateDocumentGraph.isPending}
								title={t('document_graph_regenerate')}
								onClick={() => {
									mutateGenerateDocumentGraph.mutate();
								}}>
								{t('document_graph_regenerate')}
								{mutateGenerateDocumentGraph.isPending ? (
									<Loader2 className='size-4 animate-spin' />
								) : null}
							</Button>
						</div>
					) : null}
					{document?.graph_task?.status === DocumentGraphStatus.SUCCESS &&
					nodes.length === 0 ? (
						<div className='text-sm text-muted-foreground'>
							{t('document_graph_data_empty')}
						</div>
					) : null}
					{document?.graph_task?.status === DocumentGraphStatus.SUCCESS &&
					nodes.length > 0 ? (
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

export default DocumentGraph;
