'use client';

import { useEffect, useMemo, useState } from 'react';
import { useInterval } from 'ahooks';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { SectionPodcastStatus, SectionProcessStatus } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { getRenderableGraphData } from '@/lib/graph-render';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { isScheduledSectionWaitingForTrigger } from '@/lib/section-automation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRightSidebar } from '@/provider/right-sidebar-provider';
import { searchSectionGraph } from '@/service/graph';
import { getSectionDetail } from '@/service/section';
import { getSectionCoverSrc } from '@/lib/section-cover';
import ImageWithFallback from '../ui/image-with-fallback';
import MobileAutoAudioTrack from '../ui/mobile-auto-audio-track';

import SectionMarkdown from './section-markdown';
import SectionOperate from './section-operate';
import SectionDetailSidebar from './section-detail-sidebar';

const SectionContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { setContent, clearContent } = useRightSidebar();
	const isCompactViewport = useIsMobile(1280);

	const { data: section, isPending } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});
	const { data: graphData } = useQuery({
		queryKey: ['searchSectionGraphBadge', id],
		queryFn: () => searchSectionGraph({ section_id: id }),
		enabled: Boolean(section?.id),
	});
	const sectionCoverSrc = getSectionCoverSrc(section);
	const sectionPodcastSrc = section?.podcast_task?.podcast_file_name ?? null;
	const mobileOperateOffsetClassName = sectionPodcastSrc
		? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]'
		: 'bottom-[calc(1rem+env(safe-area-inset-bottom))]';
	const isScheduledWaitingForTrigger =
		isScheduledSectionWaitingForTrigger(section);
	const freshnessState = getSectionFreshnessState(section);
	const hasRenderableGraph = getRenderableGraphData(graphData).hasRenderableGraph;
	const graphCardState =
		hasRenderableGraph && freshnessState.graphStale
			? {
					badge: t('section_graph_status_stale'),
					tone: 'warning' as const,
				}
			: hasRenderableGraph ||
				  section?.process_task?.status === SectionProcessStatus.SUCCESS
				? {
						badge: t('document_graph_status_success'),
						tone: 'success' as const,
					}
				: section?.process_task?.status === SectionProcessStatus.FAILED
					? {
							badge: t('document_graph_status_failed'),
							tone: 'danger' as const,
						}
					: section?.process_task?.status === SectionProcessStatus.PROCESSING
						? {
								badge: t('document_graph_status_doing'),
								tone: 'default' as const,
							}
						: {
								badge: t('document_graph_status_todo'),
								tone: 'warning' as const,
							};

	const [delay, setDelay] = useState<number | undefined>();
	useInterval(() => {
		queryClient.invalidateQueries({
			queryKey: ['getSectionDetail', id],
		});
	}, delay);

	useEffect(() => {
		const hasRunningProcessTask =
			section?.process_task?.status === SectionProcessStatus.PROCESSING ||
			(section?.process_task?.status === SectionProcessStatus.WAIT_TO &&
				!isScheduledWaitingForTrigger);
		const hasRunningPodcastTask =
			section?.podcast_task?.status === SectionPodcastStatus.GENERATING ||
			(section?.podcast_task?.status === SectionPodcastStatus.WAIT_TO &&
				!isScheduledWaitingForTrigger);
		if (hasRunningProcessTask || hasRunningPodcastTask) {
			setDelay(1000);
			return;
		}
		setDelay(undefined);
	}, [
		isScheduledWaitingForTrigger,
		section?.podcast_task?.status,
		section?.process_task?.status,
	]);

	const sidebarContent = useMemo(
		() => (
			<SectionDetailSidebar
				id={id}
				isPending={isPending}
				hasSection={Boolean(section)}
				hasRenderableGraph={hasRenderableGraph}
				graphBadge={graphCardState.badge}
				graphTone={graphCardState.tone}
				graphStale={freshnessState.graphStale}
			/>
		),
		[
			freshnessState.graphStale,
			graphCardState.badge,
			graphCardState.tone,
			hasRenderableGraph,
			id,
			isPending,
			section?.id,
		],
	);

	useEffect(() => {
		setContent(sidebarContent);
	}, [setContent, sidebarContent]);

	useEffect(() => {
		return () => {
			clearContent();
		};
	}, [clearContent, id]);

	return (
		<>
			{section && sectionPodcastSrc ? (
				<MobileAutoAudioTrack
					src={sectionPodcastSrc}
					scriptUrl={section.podcast_task?.podcast_script_file_name ?? undefined}
					title={section.title || t('section_title_empty')}
					artist={section.creator?.nickname || 'AI Generated'}
					cover={sectionCoverSrc ?? undefined}
				/>
			) : null}
			<div className='mx-auto flex w-full max-w-[1600px] min-h-full flex-1 flex-col px-5 md:px-0'>
				<div className='min-h-0 flex-1 overflow-hidden'>
					<>
						{sectionCoverSrc ? (
							<div className='mx-auto w-full overflow-hidden'>
								<div className='relative'>
									<ImageWithFallback
										src={sectionCoverSrc}
										alt={section?.title || t('section_title_empty')}
										preview
										className='max-h-[300px] w-full object-cover sm:max-h-[360px]'
										fallbackClassName='max-h-[300px] w-full sm:max-h-[360px]'
										fallbackSvgClassName='max-w-[240px] p-6'
									/>
									<div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-background/28 via-transparent to-transparent' />
								</div>
							</div>
						) : null}
						<SectionMarkdown id={id} />
					</>
				</div>

				{section && !isCompactViewport ? (
					<div className='pointer-events-none sticky bottom-0 z-40 mt-auto'>
						<div className='pointer-events-auto w-full'>
							<SectionOperate id={id} />
						</div>
					</div>
				) : null}
			</div>

			{section && isCompactViewport ? (
				<div
					className={`fixed right-4 z-50 ${mobileOperateOffsetClassName}`}>
					<SectionOperate id={id} />
				</div>
			) : null}
		</>
	);
};

export default SectionContainer;
