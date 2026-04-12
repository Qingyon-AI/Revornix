'use client';

import { useEffect, useRef, useState } from 'react';
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
import { getSectionDetail } from '@/service/section';
import { getSectionCoverSrc } from '@/lib/section-cover';
import ImageWithFallback from '../ui/image-with-fallback';

import SectionMarkdown from './section-markdown';
import SectionOperate from './section-operate';
import { Skeleton } from '../ui/skeleton';
import { useSidebar } from '../ui/sidebar';
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
	const { state: sidebarState } = useSidebar();
	const { open: rightSidebarOpen, setContent, clearContent } = useRightSidebar();
	const isCompactViewport = useIsMobile(1280);
	const mainColumnRef = useRef<HTMLDivElement | null>(null);
	const [dockBounds, setDockBounds] = useState({
		left: 0,
		width: 0,
	});

	const surfaceCardClassName =
		'rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur shadow-none';

	const { data: section, isPending } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});
	const sectionCoverSrc = getSectionCoverSrc(section);
	const isScheduledWaitingForTrigger =
		isScheduledSectionWaitingForTrigger(section);
	const freshnessState = getSectionFreshnessState(section);
	const graphCardState =
		freshnessState.graphStale &&
		section?.process_task?.status === SectionProcessStatus.SUCCESS
			? {
					badge: t('section_graph_status_stale'),
					tone: 'warning' as const,
				}
			: section?.process_task?.status === SectionProcessStatus.SUCCESS
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

	useEffect(() => {
		setContent(
			<SectionDetailSidebar
				id={id}
				isPending={isPending}
				hasSection={Boolean(section)}
				graphBadge={graphCardState.badge}
				graphTone={graphCardState.tone}
				graphStale={freshnessState.graphStale}
				surfaceCardClassName={surfaceCardClassName}
			/>,
		);
	}, [
		freshnessState.graphStale,
		graphCardState.badge,
		graphCardState.tone,
		id,
		isPending,
		section,
		setContent,
		surfaceCardClassName,
	]);

	useEffect(() => {
		return () => {
			clearContent();
		};
	}, [clearContent, id]);

	useEffect(() => {
		let animationFrameId: number | null = null;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const updateDockBounds = () => {
			if (!mainColumnRef.current) {
				return;
			}

			const rect = mainColumnRef.current.getBoundingClientRect();
			setDockBounds((currentBounds) => {
				if (
					Math.abs(currentBounds.left - rect.left) < 0.5 &&
					Math.abs(currentBounds.width - rect.width) < 0.5
				) {
					return currentBounds;
				}

				return {
					left: rect.left,
					width: rect.width,
				};
			});
		};

		const syncDockBoundsDuringTransition = (duration = 260) => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}

			const startedAt = performance.now();

			const tick = () => {
				updateDockBounds();

				if (performance.now() - startedAt < duration) {
					animationFrameId = requestAnimationFrame(tick);
					return;
				}

				animationFrameId = null;
			};

			animationFrameId = requestAnimationFrame(tick);
			timeoutId = setTimeout(() => {
				updateDockBounds();
			}, duration);
		};

		updateDockBounds();
		syncDockBoundsDuringTransition();

		const resizeObserver = new ResizeObserver(() => {
			updateDockBounds();
		});

		if (mainColumnRef.current) {
			resizeObserver.observe(mainColumnRef.current);
		}

		window.addEventListener('resize', updateDockBounds);

		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateDockBounds);
		};
	}, [isCompactViewport, rightSidebarOpen, sidebarState, section?.id]);

	return (
		<>
			<div className='mx-auto flex w-full max-w-[1600px] flex-col pt-0'>
				<div ref={mainColumnRef} className='relative min-w-0'>
					<>
						{isPending && !section ? <SectionDetailSkeleton /> : null}
						{sectionCoverSrc ? (
							<div className='mx-auto mb-6 w-full overflow-hidden bg-background/45 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.18)]'>
								<div className='relative'>
									<ImageWithFallback
										src={sectionCoverSrc}
										alt={section?.title || t('section_title_empty')}
										className='max-h-[300px] w-full object-cover sm:max-h-[360px]'
										fallbackClassName='max-h-[300px] w-full sm:max-h-[360px]'
										fallbackSvgClassName='max-w-[240px] p-6'
									/>
									<div className='absolute inset-0 bg-gradient-to-t from-background/28 via-transparent to-transparent' />
								</div>
							</div>
						) : null}
						<SectionMarkdown id={id} />
					</>
				</div>

			</div>

			{section && isCompactViewport ? (
				<div className='pointer-events-none fixed bottom-4 right-4 z-40'>
					<SectionOperate id={id} />
				</div>
			) : null}

			{section && !isCompactViewport && dockBounds.width > 0 ? (
				<div
					className='pointer-events-none sticky bottom-0 z-40'
					style={{
						left: `${dockBounds.left}px`,
						width: `${dockBounds.width}px`,
					}}>
					<div className='pointer-events-auto w-full'>
						<SectionOperate id={id} />
					</div>
				</div>
			) : null}
		</>
	);
};

export default SectionContainer;
