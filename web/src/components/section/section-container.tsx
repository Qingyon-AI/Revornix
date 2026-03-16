'use client';

import { useEffect, useRef, useState } from 'react';
import { useInterval } from 'ahooks';
import { useQuery } from '@tanstack/react-query';
import { Expand } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionProcessStatus } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { getSectionDetail } from '@/service/section';

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
		'min-h-[calc(100dvh-6rem)] sm:min-h-[calc(100dvh-6.25rem)]';
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

	const [delay, setDelay] = useState<number | undefined>();
	useInterval(() => {
		queryClient.invalidateQueries({
			queryKey: ['getSectionDetail', id],
		});
	}, delay);

	useEffect(() => {
		if (
			section &&
			section.process_task &&
			section.process_task.status < SectionProcessStatus.SUCCESS
		) {
			setDelay(1000);
			return;
		}
		setDelay(undefined);
	}, [section?.process_task?.status]);

	useEffect(() => {
		let animationFrameId: number | null = null;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const updateDockBounds = () => {
			if (!mainColumnRef.current) {
				return;
			}

			const rect = mainColumnRef.current.getBoundingClientRect();
			setDockBounds({
				left: rect.left,
				width: rect.width,
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
		window.addEventListener('scroll', updateDockBounds, true);

		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateDockBounds);
			window.removeEventListener('scroll', updateDockBounds, true);
		};
	}, [isCompactViewport, sidebarState, section?.id]);

	return (
		<div className='relative'>
			<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pb-6 pt-0 sm:px-5 lg:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,392px)] xl:items-start'>
				<div ref={mainColumnRef} className='relative min-w-0'>
					<div className={mainSurfaceClassName}>
						<div className={mainContentClassName}>
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
							<Card className={`overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
								<div className='flex items-start justify-between gap-4 border-b border-border/60 px-4 pb-0 pt-4 sm:px-5 sm:pt-5'>
									<div className='space-y-1 pb-4'>
										<h3 className='text-base font-semibold'>{t('section_graph')}</h3>
										<p className='text-sm leading-6 text-muted-foreground'>
											{t('section_graph_description')}
										</p>
									</div>
									<Dialog>
										<DialogTrigger asChild>
											<Button
												className='size-10 shrink-0 rounded-2xl bg-background/70'
												size='icon'
												variant='outline'>
												<Expand size={4} className='text-muted-foreground' />
											</Button>
										</DialogTrigger>
										<DialogContent className='flex h-[82vh] w-[min(1440px,96vw)] max-w-[min(1440px,96vw)] flex-col sm:max-w-[min(1440px,96vw)]'>
											<DialogHeader>
												<DialogTitle>{t('section_graph')}</DialogTitle>
												<DialogDescription>
													{t('section_graph_description')}
												</DialogDescription>
											</DialogHeader>
											<div className='min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/45'>
												<SectionGraph section_id={id} showSearch />
											</div>
										</DialogContent>
									</Dialog>
								</div>

								<div className='px-4 pb-4 pt-4 sm:px-5 sm:pb-5'>
									<div className='h-[300px] overflow-hidden rounded-[24px] border border-border/60 bg-background/35'>
										<SectionGraph section_id={id} />
									</div>
								</div>
							</Card>
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
