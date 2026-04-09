'use client';

import { memo, useEffect, useMemo, useState } from 'react';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import GraphStatePanel from '@/components/graph/graph-state-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentGraphStatus } from '@/enums/document';
import { getQueryClient } from '@/lib/get-query-client';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import { generateDocumentGraph, getDocumentDetail } from '@/service/document';
import { searchDocumentGraph } from '@/service/graph';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import AIModelSelect from '@/components/ai/model-select';
import { useUserContext } from '@/provider/user-provider';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';

const resolveGraphGenerateErrorMessage = (
	message: string | undefined,
	t: ReturnType<typeof useTranslations>,
) => {
	if (!message) {
		return t('document_graph_generate_failed_default');
	}
	if (message.includes('Paid subscription or available compute points required.')) {
		return t('document_graph_generate_failed_access');
	}
	if (message.includes('Official LLM quota exceeded')) {
		return t('document_graph_generate_failed_quota');
	}
	return message;
};

const DocumentGraph = ({
	document_id,
	showSearch = false,
}: {
	document_id: number;
	showSearch?: boolean;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [selectedModelId, setSelectedModelId] = useState<number | null>(
		mainUserInfo?.default_document_reader_model_id ?? null,
	);
	const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

	useEffect(() => {
		setSelectedModelId(mainUserInfo?.default_document_reader_model_id ?? null);
	}, [mainUserInfo?.default_document_reader_model_id]);

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
				model_id: selectedModelId ?? undefined,
			}),
		onSuccess() {
			setIsGenerateDialogOpen(false);
			toast.success(t('document_graph_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', document_id],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserInfo'],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserComputeLedger'],
			});
		},
		onError(mutationError) {
			toast.error(
				resolveGraphGenerateErrorMessage(mutationError.message, t),
			);
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
		<>
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
								<div className='flex flex-col items-center gap-2'>
									<Button
										variant='outline'
										size='sm'
										className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
										title={t('document_graph_generate')}
										onClick={() => {
											setIsGenerateDialogOpen(true);
										}}>
										{t('document_graph_generate')}
									</Button>
									<p className='max-w-md text-center text-xs leading-5 text-muted-foreground'>
										{t('document_graph_access_hint')}
									</p>
								</div>
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
								<div className='flex flex-col items-center gap-2'>
									<Button
										variant='outline'
										size='sm'
										className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
										title={t('document_graph_regenerate')}
										onClick={() => {
											setIsGenerateDialogOpen(true);
										}}>
										{t('document_graph_regenerate')}
									</Button>
									<p className='max-w-md text-center text-xs leading-5 text-muted-foreground'>
										{t('document_graph_access_hint')}
									</p>
								</div>
							}
						/>
					) : null}
					{isGraphReady && isFetched && nodes.length === 0 ? (
						<GraphStatePanel
							icon={Sparkles}
							badge={t('document_graph_status_success')}
							title={t('document_graph_data_empty')}
							description={t('document_graph_description')}
							tone={freshnessState.graphStale ? 'warning' : 'success'}
						/>
					) : null}
					{isGraphReady && nodes.length > 0 ? (
						<>
							{freshnessState.graphStale ? (
								<div className='pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 shadow-sm dark:text-amber-200'>
									<AlertCircle className='size-3.5' />
									<span>{t('document_graph_stale_hint')}</span>
								</div>
							) : null}
							<EntityGraphCanvas
								nodes={nodes}
								edges={edges}
								className='h-full w-full'
								showSearch={showSearch}
							/>
						</>
					) : null}
				</>
			) : null}
		</div>
		<ResourceConfirmDialog
			open={isGenerateDialogOpen}
			onOpenChange={setIsGenerateDialogOpen}
			title={t('document_graph_generate')}
			description={t('resource_dialog_graph_description')}
			confirmLabel={t('document_graph_generate')}
			confirmDisabled={!selectedModelId}
			confirmLoading={mutateGenerateDocumentGraph.isPending}
			onConfirm={() => {
				mutateGenerateDocumentGraph.mutate();
			}}>
			<div className='space-y-2'>
				<p className='text-sm font-medium text-foreground'>{t('use_model')}</p>
				<AIModelSelect
					value={selectedModelId}
					onChange={setSelectedModelId}
					className='w-full'
					placeholder={t('setting_default_model_choose')}
				/>
			</div>
		</ResourceConfirmDialog>
		</>
	);
};

DocumentGraph.displayName = 'DocumentGraph';

export default memo(DocumentGraph);
