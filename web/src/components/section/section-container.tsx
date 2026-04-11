'use client';

import { useEffect, useRef, useState } from 'react';
import { useInterval } from 'ahooks';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Expand } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionPodcastStatus, SectionProcessStatus } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { isScheduledSectionWaitingForTrigger } from '@/lib/section-automation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { getSectionDetail } from '@/service/section';
import { getSectionCoverSrc } from '@/lib/section-cover';
import ImageWithFallback from '../ui/image-with-fallback';

import SectionGraph from './section-graph';
import SectionInfo from './section-info';
import SectionMarkdown from './section-markdown';
import SectionMedia from './section-media';
import SectionOperate from './section-operate';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useSidebar } from '../ui/sidebar';
import GraphTaskCard from '@/components/graph/graph-task-card';

const SectionGraphCardSkeleton = ({
	surfaceCardClassName,
}: {
	surfaceCardClassName: string;
}) => {
	return (
		<Card className={`overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
			<div className='flex items-start justify-between gap-4 border-b border-border/60 px-4 pb-0 pt-4 sm:px-5 sm:pt-5'>
				<div className='space-y-2 pb-4'>
					<Skeleton className='h-6 w-28 rounded-xl' />
					<Skeleton className='h-4 w-48 rounded-full' />
				</div>
				<Skeleton className='size-10 shrink-0 rounded-2xl' />
			</div>

			<div className='px-4 pb-4 pt-4 sm:px-5 sm:pb-5'>
				<Skeleton className='h-[300px] w-full rounded-[24px]' />
			</div>
		</Card>
	);
};

const SectionDetailSkeleton = () => {
	return (
		<div className='mx-auto flex h-full w-full max-w-[880px] flex-col gap-6'>
			<div className='flex flex-wrap gap-2'>
				<Skeleton className='h-7 w-20 rounded-full' />
				<Skeleton className='h-7 w-24 rounded-full' />
				<Skeleton className='h-7 w-16 rounded-full' />
			</div>
			<div className='space-y-3'>
				<Skeleton className='h-12 w-[70%] rounded-2xl sm:h-14' />
				<Skeleton className='h-5 w-[42%] rounded-full' />
			</div>
			<Skeleton className='aspect-[16/7] w-full rounded-[28px]' />
			<div className='space-y-5 rounded-[28px] border border-border/60 bg-background/35 p-5 sm:p-6'>
				<div className='space-y-3'>
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-[88%] rounded-full' />
					<Skeleton className='h-5 w-[74%] rounded-full' />
				</div>
				<div className='space-y-3 pt-2'>
					<Skeleton className='h-8 w-40 rounded-2xl' />
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-[82%] rounded-full' />
				</div>
				<div className='space-y-3 pt-2'>
					<Skeleton className='h-8 w-32 rounded-2xl' />
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-[90%] rounded-full' />
					<Skeleton className='h-5 w-[70%] rounded-full' />
				</div>
				<div className='rounded-[24px] border border-border/60 bg-background/45 px-4 py-3'>
					<Skeleton className='mx-auto h-4 w-56 rounded-full sm:w-72' />
				</div>
			</div>
		</div>
	);
};

const SectionContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { state: sidebarState } = useSidebar();
	const isCompactViewport = useIsMobile(1280);
	const mainColumnRef = useRef<HTMLDivElement | null>(null);
	const [dockBounds, setDockBounds] = useState({
		left: 0,
		width: 0,
	});

	const mainCardMinHeightClassName =
		'min-h-[calc(100dvh-7rem)] sm:min-h-[calc(100dvh-7.25rem)]';
	const surfaceCardClassName =
		'rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur';
	const mainSurfaceClassName = cn(
		`bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_24%)] ${surfaceCardClassName}`,
	);
	const mainContentClassName = cn(mainCardMinHeightClassName, 'p-4 sm:p-5 lg:p-6');

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
	}, [isCompactViewport, sidebarState, section?.id]);

	return (
		<div className='relative'>
			<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pb-6 pt-0 sm:px-5 lg:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,392px)] xl:items-start'>
				<div ref={mainColumnRef} className='relative min-w-0'>
					<div className={mainSurfaceClassName}>
						<div className={mainContentClassName}>
							{isPending && !section ? <SectionDetailSkeleton /> : null}
							{sectionCoverSrc ? (
								<div className='mx-auto mb-6 w-full max-w-[880px] overflow-hidden rounded-[28px] border border-border/60 bg-background/45 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.48)]'>
									<div className='relative'>
										<ImageWithFallback
											src={sectionCoverSrc}
											alt={section?.title || t('section_title_empty')}
											className='max-h-[320px] w-full object-cover sm:max-h-[380px]'
											fallbackClassName='max-h-[320px] w-full sm:max-h-[380px]'
											fallbackSvgClassName='max-w-[240px] p-6'
										/>
										<div className='absolute inset-0 bg-gradient-to-t from-background/28 via-transparent to-transparent' />
									</div>
								</div>
							) : null}
							<SectionMarkdown id={id} />
						</div>
					</div>
				</div>

				{!isCompactViewport ? (
					<div className='relative min-w-0 space-y-5 xl:sticky xl:top-0'>
						<Card className={`overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
							<SectionInfo id={id} />
						</Card>

						{isPending && !section ? (
							<SectionGraphCardSkeleton
								surfaceCardClassName={surfaceCardClassName}
							/>
						) : (
							<GraphTaskCard
								title={t('section_graph')}
								description={t('section_graph_description')}
								badge={graphCardState.badge}
								hint={
									freshnessState.graphStale
										? t('section_graph_stale_hint')
										: undefined
								}
								tone={graphCardState.tone}
								action={
									<Dialog>
										<DialogTrigger asChild>
											<Button
												className='size-8 shrink-0 rounded-2xl border-border/70 bg-background/65 shadow-none hover:bg-background'
												size='icon'
												variant='outline'>
												<Expand size={4} className='text-muted-foreground' />
											</Button>
										</DialogTrigger>
										<DialogContent className='flex h-[82vh] w-[min(1440px,96vw)] max-w-[min(1440px,96vw)] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-[min(1440px,96vw)]'>
											<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
												<DialogTitle>{t('section_graph')}</DialogTitle>
												<DialogDescription>
													{t('section_graph_description')}
												</DialogDescription>
												{freshnessState.graphStale ? (
													<div className='flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-800 dark:text-amber-200'>
														<AlertCircle className='mt-0.5 size-4 shrink-0' />
														<span>{t('section_graph_stale_hint')}</span>
													</div>
												) : null}
											</DialogHeader>
											<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
												<div className='min-h-[360px] h-full overflow-hidden rounded-2xl border border-border/60 bg-background/45'>
												<SectionGraph
													section_id={id}
													showSearch
													showStaleHint={false}
												/>
												</div>
											</div>
										</DialogContent>
									</Dialog>
								}>
								<div className='h-[300px] overflow-hidden rounded-[20px] border border-border/60 bg-background/35'>
									<SectionGraph section_id={id} showStaleHint={false} />
								</div>
							</GraphTaskCard>
						)}

						<SectionMedia
							section_id={id}
							surfaceCardClassName={surfaceCardClassName}
						/>
					</div>
				) : null}
			</div>

			{section && isCompactViewport ? (
				<div className='pointer-events-none fixed bottom-4 right-4 z-40'>
					<div className='pointer-events-auto'>
						<SectionOperate id={id} />
					</div>
				</div>
			) : null}

			{section && !isCompactViewport && dockBounds.width > 0 ? (
				<div
					className='pointer-events-none fixed bottom-4 z-40 sm:bottom-8'
					style={{
						left: `${dockBounds.left}px`,
						width: `${dockBounds.width}px`,
					}}>
					<div className='px-4 sm:px-5 lg:px-6'>
						<div className='pointer-events-auto mx-auto w-full max-w-[880px]'>
							<SectionOperate id={id} />
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};

export default SectionContainer;
