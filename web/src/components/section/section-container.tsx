'use client';

import { useEffect, useMemo, useState } from 'react';
import { useInterval } from 'ahooks';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { SectionPodcastStatus, SectionProcessStatus } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { isScheduledSectionWaitingForTrigger } from '@/lib/section-automation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRightSidebar } from '@/provider/right-sidebar-provider';
import { searchSectionGraph } from '@/service/graph';
import { getSectionDetail } from '@/service/section';
import { getSectionCoverSrc } from '@/lib/section-cover';
import ImageWithFallback from '../ui/image-with-fallback';

import SectionMarkdown from './section-markdown';
import SectionOperate from './section-operate';
import { Skeleton } from '../ui/skeleton';
import SectionDetailSidebar from './section-detail-sidebar';

const SectionDetailSkeleton = () => {
	return (
		<div className='mx-auto flex h-full w-full max-w-[980px] flex-col gap-6'>
			<div className='overflow-hidden rounded-[28px] border border-border/60 bg-background/40 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.48)]'>
				<Skeleton className='aspect-[16/6.5] w-full rounded-none sm:aspect-[16/6]' />
			</div>

			<div className='space-y-5'>
				<div className='mx-auto w-full max-w-[880px] space-y-4'>
					<Skeleton className='h-4 w-40 rounded-full' />
					<div className='space-y-3'>
						<Skeleton className='h-8 w-[72%] rounded-2xl sm:h-10' />
						<Skeleton className='h-5 w-[92%] rounded-full' />
						<Skeleton className='h-5 w-[68%] rounded-full' />
					</div>
					<div className='rounded-[24px] border border-border/60 bg-background/45 px-4 py-3'>
						<Skeleton className='mx-auto h-4 w-64 rounded-full sm:w-80' />
					</div>
				</div>

				<div className='mx-auto w-full max-w-[880px] space-y-6 rounded-[28px] border border-border/60 bg-background/30 p-5 sm:p-6'>
					<div className='space-y-3'>
						<Skeleton className='h-5 w-full rounded-full' />
						<Skeleton className='h-5 w-full rounded-full' />
						<Skeleton className='h-5 w-[86%] rounded-full' />
						<Skeleton className='h-5 w-[72%] rounded-full' />
					</div>
					<div className='space-y-3'>
						<Skeleton className='h-5 w-[94%] rounded-full' />
						<Skeleton className='h-5 w-full rounded-full' />
						<Skeleton className='h-5 w-[82%] rounded-full' />
					</div>
					<div className='space-y-3'>
						<Skeleton className='h-5 w-full rounded-full' />
						<Skeleton className='h-5 w-[90%] rounded-full' />
						<Skeleton className='h-5 w-[78%] rounded-full' />
					</div>
					<div className='rounded-[24px] border border-border/60 bg-background/45 px-4 py-3'>
						<Skeleton className='mx-auto h-4 w-56 rounded-full sm:w-72' />
					</div>
				</div>
			</div>

			<div className='border-t border-border/60 grid w-full grid-cols-7 gap-2 bg-background/55 p-2.5 backdrop-blur-xl'>
				{Array.from({ length: 7 }).map((_, index) => (
					<Skeleton key={index} className='h-11 w-full rounded-[20px]' />
				))}
			</div>
		</div>
	);
};

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
	const isScheduledWaitingForTrigger =
		isScheduledSectionWaitingForTrigger(section);
	const freshnessState = getSectionFreshnessState(section);
	const hasRenderableGraph = Boolean(graphData?.nodes?.length);
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
			<div className='mx-auto flex w-full max-w-[1600px] min-h-full flex-1 flex-col px-5 md:px-0'>
				<div className='min-h-0 flex-1 overflow-hidden'>
					<>
						{isPending && !section ? <SectionDetailSkeleton /> : null}
						{sectionCoverSrc ? (
							<div className='mx-auto mb-6 w-full max-w-[980px] overflow-hidden rounded-[28px] shadow-[0_22px_60px_-42px_rgba(15,23,42,0.18)]'>
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
				<div className='fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50'>
					<SectionOperate id={id} />
				</div>
			) : null}
		</>
	);
};

export default SectionContainer;
