'use client';

import { memo, useMemo } from 'react';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import GraphStatePanel from '@/components/graph/graph-state-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionProcessStatus } from '@/enums/section';
import { getSectionDetail } from '@/service/section';
import { searchSectionGraph } from '@/service/graph';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

const SectionGraph = ({
	section_id,
	showSearch = false,
}: {
	section_id: number;
	showSearch?: boolean;
}) => {
	const t = useTranslations();
	const {
		data: section,
		isError: isSectionDetailError,
		error: sectionDetailError,
	} = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: () => getSectionDetail({ section_id }),
	});
	const processStatus =
		section?.process_task?.status ?? SectionProcessStatus.SUCCESS;
	const isSectionProcessing = processStatus < SectionProcessStatus.SUCCESS;
	const isSectionFailed = processStatus === SectionProcessStatus.FAILED;

	const { data, isLoading, isError, error, isFetched } = useQuery({
		queryKey: ['searchDocumentGraph', section_id, processStatus],
		queryFn: async () =>
			searchSectionGraph({
				section_id,
			}),
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
			{!section && !isSectionDetailError ? (
				<Skeleton className='h-full w-full rounded-2xl' />
			) : null}
			{isSectionDetailError ? (
				<div className='text-sm text-muted-foreground'>
					Error: {sectionDetailError.message}
				</div>
			) : null}
			{isError ? (
				<div className='text-sm text-muted-foreground'>Error: {error.message}</div>
			) : null}
			{isLoading && !nodes.length ? <Skeleton className='h-full w-full rounded-2xl' /> : null}
			{nodes.length > 0 ? (
				<EntityGraphCanvas
					nodes={nodes}
					edges={edges}
					className='h-full w-full'
					showSearch={showSearch}
				/>
			) : null}
			{!nodes.length && isSectionProcessing ? (
				<GraphStatePanel
					icon={processStatus === SectionProcessStatus.WAIT_TO ? Sparkles : Loader2}
					badge={
						processStatus === SectionProcessStatus.WAIT_TO
							? t('document_graph_status_todo')
							: t('document_graph_status_doing')
					}
					title={
						processStatus === SectionProcessStatus.WAIT_TO
							? t('section_graph_wait_to')
							: t('section_graph_building')
					}
					description={t('section_graph_description')}
					spinning={processStatus === SectionProcessStatus.PROCESSING}
					tone={
						processStatus === SectionProcessStatus.WAIT_TO ? 'warning' : 'default'
					}
				/>
			) : null}
			{!nodes.length && isSectionFailed ? (
				<GraphStatePanel
					icon={AlertCircle}
					badge={t('document_graph_status_failed')}
					title={t('section_graph_failed')}
					description={t('section_graph_description')}
					iconClassName='text-destructive'
					tone='danger'
				/>
			) : null}
			{isFetched && !nodes.length && !isSectionProcessing && !isSectionFailed ? (
				<GraphStatePanel
					icon={Sparkles}
					badge={t('document_graph_status_success')}
					title={t('section_graph_empty')}
					description={t('section_graph_description')}
					tone='success'
				/>
			) : null}
		</div>
	);
};

SectionGraph.displayName = 'SectionGraph';

export default memo(SectionGraph);
