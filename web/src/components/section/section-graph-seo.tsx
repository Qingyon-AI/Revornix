'use client';

import type { GraphResponse, SectionInfo } from '@/generated';
import { memo, useMemo } from 'react';

import EntityGraphCanvas, {
	type GraphCanvasLink,
	type GraphCanvasNode,
} from '@/components/graph/entity-graph-canvas';
import GraphStatePanel from '@/components/graph/graph-state-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionProcessStatus } from '@/enums/section';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { searchPublicSectionGraph, searchSectionGraph } from '@/service/graph';
import { getPublicSectionDetail, getSectionDetail } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

const SectionGraphSEO = ({
	section_id,
	showSearch = false,
	showStaleHint = true,
	initialSection,
	initialGraph,
	publicMode = false,
}: {
	section_id: number;
	showSearch?: boolean;
	showStaleHint?: boolean;
	initialSection?: SectionInfo | null;
	initialGraph?: GraphResponse | null;
	publicMode?: boolean;
}) => {
	const t = useTranslations();
	const {
		data: section,
		isError: isSectionDetailError,
		error: sectionDetailError,
	} = useQuery({
		queryKey: publicMode
			? ['getPublicSectionDetail', section_id]
			: ['getSectionDetail', section_id],
		queryFn: () =>
			publicMode
				? getPublicSectionDetail({ section_id })
				: getSectionDetail({ section_id }),
		initialData: initialSection ?? undefined,
		retry: publicMode ? false : undefined,
		refetchOnWindowFocus: publicMode ? false : undefined,
		enabled: !(publicMode && Boolean(initialSection)),
		staleTime: publicMode && initialSection ? Infinity : undefined,
	});
	const processStatus =
		section?.process_task?.status ?? SectionProcessStatus.SUCCESS;
	const isSectionProcessing = processStatus < SectionProcessStatus.SUCCESS;
	const isSectionFailed = processStatus === SectionProcessStatus.FAILED;
	const freshnessState = getSectionFreshnessState(section);
	const staleHint =
		showStaleHint && freshnessState.graphStale
			? t('section_graph_stale_hint')
			: null;

	const { data, isLoading, isError, error, isFetched } = useQuery({
		queryKey: publicMode
			? ['searchPublicSectionGraph', section_id, processStatus]
			: ['searchDocumentGraph', section_id, processStatus],
		queryFn: async () =>
			publicMode
				? searchPublicSectionGraph({
						section_id,
					})
				: searchSectionGraph({
						section_id,
					}),
		initialData: initialGraph ?? undefined,
		retry: publicMode ? false : undefined,
		refetchOnWindowFocus: publicMode ? false : undefined,
		enabled: !(publicMode && Boolean(initialGraph)),
		staleTime: publicMode && initialGraph ? Infinity : undefined,
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
	const graphErrorMessage = isSectionDetailError
		? sectionDetailError.message
		: isError
			? error.message
			: null;
	const hasGraphError = Boolean(graphErrorMessage);

	return (
		<div className='relative flex w-full items-center justify-center md:h-full'>
			{!section && !isSectionDetailError ? (
				<Skeleton className='h-full w-full rounded-2xl' />
			) : null}
			{isLoading && !nodes.length ? <Skeleton className='h-full w-full rounded-2xl' /> : null}
			{nodes.length > 0 ? (
				<>
					{staleHint ? (
						<div className='pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 shadow-sm dark:text-amber-200'>
							<AlertCircle className='size-3.5' />
							<span>{staleHint}</span>
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
			{!nodes.length && hasGraphError ? (
				<GraphStatePanel
					icon={AlertCircle}
					badge={t('document_graph_status_failed')}
					title={t('section_graph_failed')}
					description={graphErrorMessage ?? t('section_graph_description')}
					iconClassName='text-destructive'
					tone='danger'
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
			{!nodes.length && !hasGraphError && isSectionFailed ? (
				<GraphStatePanel
					icon={AlertCircle}
					badge={t('document_graph_status_failed')}
					title={t('section_graph_failed')}
					description={t('section_graph_description')}
					iconClassName='text-destructive'
					tone='danger'
				/>
			) : null}
			{isFetched &&
			!nodes.length &&
			!hasGraphError &&
			!isSectionProcessing &&
			!isSectionFailed ? (
				<GraphStatePanel
					icon={Sparkles}
					badge={t('document_graph_status_success')}
					title={t('section_graph_empty')}
					description={staleHint ?? t('section_graph_description')}
					tone={freshnessState.graphStale ? 'warning' : 'success'}
				/>
			) : null}
		</div>
	);
};

SectionGraphSEO.displayName = 'SectionGraphSEO';

export default memo(SectionGraphSEO);
