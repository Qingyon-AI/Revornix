'use client';

import { ChevronDown, Minimize2, Pause, Play, Volume2, X } from 'lucide-react';
import {
	useEffect,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { Slider } from '@/components/ui/slider';
import type { AudioTranscriptPayload } from '@/lib/audio';
import { formatAudioTime, resolveTranscriptSpeakerLabel } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/provider/audio-player-provider';

const PLAYBACK_RATE_OPTIONS = [0.8, 1, 1.25, 1.5, 2];

const FloatingAudioPlayer = () => {
	const DRAG_THRESHOLD = 8;
	const t = useTranslations();
	const isMobile = useIsMobile();
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const dragOffsetRef = useRef({ x: 0, y: 0 });
	const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
	const [position, setPosition] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [isDragging, setIsDragging] = useState(false);
	const [transcript, setTranscript] = useState<AudioTranscriptPayload | null>(null);
	const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
	const [transcriptError, setTranscriptError] = useState<string | null>(null);
	const {
		track,
		isPlaying,
		currentTime,
		duration,
		volume,
		playbackRate,
		pause,
		resume,
		seek,
		setVolume,
		setPlaybackRate,
		clearTrack,
	} = useAudioPlayer();

	const togglePlayback = () => {
		if (!track) {
			return;
		}
		if (isPlaying) {
			pause();
			return;
		}
		void resume();
	};

	useEffect(() => {
		if (!track?.scriptUrl) {
			setTranscript(null);
			setIsTranscriptLoading(false);
			setTranscriptError(null);
			return;
		}

		const controller = new AbortController();
		setIsTranscriptLoading(true);
		setTranscriptError(null);

		void fetch(track.scriptUrl, { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(`Failed to load transcript: ${response.status}`);
				}
				return response.json();
			})
			.then((payload: AudioTranscriptPayload) => {
				setTranscript(payload);
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) {
					return;
				}
				setTranscript(null);
				setTranscriptError(
					error instanceof Error ? error.message : 'Failed to load transcript.',
				);
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsTranscriptLoading(false);
				}
			});

		return () => controller.abort();
	}, [track?.scriptUrl]);

	useEffect(() => {
		if (!position) {
			return;
		}

		const handleResize = () => {
			const container = containerRef.current;
			if (!container) return;

			const { width, height } = container.getBoundingClientRect();
			const maxX = Math.max(0, window.innerWidth - width);
			const maxY = Math.max(12, window.innerHeight - height - 12);

			setPosition((current) =>
				current
					? {
							x: Math.min(Math.max(0, current.x), maxX),
							y: Math.min(Math.max(12, current.y), maxY),
					  }
					: current,
			);
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [position]);

	const snapToSide = (pointerX: number, nextY: number) => {
		const container = containerRef.current;
		if (!container) return;

		const { width, height } = container.getBoundingClientRect();
		const maxX = Math.max(0, window.innerWidth - width);
		const maxY = Math.max(12, window.innerHeight - height - 12);
		const clampedY = Math.min(Math.max(12, nextY), maxY);
		const snappedX = pointerX < window.innerWidth / 2 ? 0 : maxX;

		setPosition({
			x: snappedX,
			y: clampedY,
		});
	};

	const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (isMobile) {
			return;
		}
		const container = containerRef.current;
		if (!container) return;
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			target.closest('[data-no-drag="true"]')
		) {
			return;
		}

		const rect = container.getBoundingClientRect();
		dragOffsetRef.current = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		pointerStartRef.current = {
			x: event.clientX,
			y: event.clientY,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (isMobile) {
			return;
		}
		const container = containerRef.current;
		if (!container) return;
		const pointerStart = pointerStartRef.current;
		if (!pointerStart) return;

		const deltaX = event.clientX - pointerStart.x;
		const deltaY = event.clientY - pointerStart.y;

		if (!isDragging) {
			if (
				Math.abs(deltaX) < DRAG_THRESHOLD &&
				Math.abs(deltaY) < DRAG_THRESHOLD
			) {
				return;
			}
			const rect = container.getBoundingClientRect();
			setPosition({ x: rect.left, y: rect.top });
			setIsDragging(true);
		}

		const { width, height } = container.getBoundingClientRect();
		const nextX = event.clientX - dragOffsetRef.current.x;
		const nextY = event.clientY - dragOffsetRef.current.y;
		const maxX = Math.max(0, window.innerWidth - width);
		const maxY = Math.max(12, window.innerHeight - height - 12);

		setPosition({
			x: Math.min(Math.max(0, nextX), maxX),
			y: Math.min(Math.max(12, nextY), maxY),
		});
	};

	const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (isMobile) {
			return;
		}
		if (isDragging) {
			const container = containerRef.current;
			if (container) {
				const rect = container.getBoundingClientRect();
				snapToSide(event.clientX, rect.top);
			}
			setIsDragging(false);
		} else {
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				target.closest('[data-no-drag="true"]')
			) {
				pointerStartRef.current = null;
				if (event.currentTarget.hasPointerCapture(event.pointerId)) {
					event.currentTarget.releasePointerCapture(event.pointerId);
				}
				return;
			}
			setIsExpanded(true);
		}
		pointerStartRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	if (!track) {
		return null;
	}

	const transcriptSegments = (transcript?.segments ?? []).filter(
		(segment) => Boolean(segment?.text?.trim()),
	);
	const transcriptText = transcript?.plain_text?.trim() ?? '';
	const activeTranscriptSegmentIndex = transcriptSegments.findIndex(
		(segment, index) => {
			if (typeof segment.start !== 'number') {
				return false;
			}

			const nextSegment = transcriptSegments[index + 1];
			const resolvedEnd =
				typeof segment.end === 'number'
					? segment.end
					: typeof segment.audioDuration === 'number'
						? segment.start + segment.audioDuration
						: typeof nextSegment?.start === 'number'
							? nextSegment.start
							: Number.POSITIVE_INFINITY;

			return currentTime >= segment.start && currentTime < resolvedEnd;
		},
	);

	return (
		<>
			<div
				ref={containerRef}
				className={cn(
					'fixed z-50',
					isMobile
						? 'select-none'
						: isDragging
							? 'cursor-grabbing select-none'
							: 'cursor-grab',
				)}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				style={
					position
						? {
								left: position.x,
								top: position.y,
								right: 'auto',
								bottom: 'auto',
						  }
						: {
								right: 0,
								bottom: 20,
						  }
				}>
				<div
					role='button'
					tabIndex={0}
					className={cn(
						'flex h-9 w-[min(10rem,calc(100vw-1rem))] items-center gap-2 rounded-l-full border border-r-0 border-border/60 bg-card/96 px-1.5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.38)] backdrop-blur-xl transition-all hover:bg-card',
						'sm:h-11 sm:w-[18.5rem] sm:gap-2.5 sm:px-2',
						position?.x === 0
							? 'rounded-l-none rounded-r-[1.35rem] border-l-0 border-r'
							: 'rounded-r-none',
					)}
					onClick={(event) => {
						if (!isMobile) {
							event.preventDefault();
							return;
						}
						const target = event.target;
						if (
							target instanceof HTMLElement &&
							target.closest('[data-no-drag="true"]')
						) {
							return;
						}
						setIsExpanded(true);
					}}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							setIsExpanded(true);
						}
					}}>
					<Button
						type='button'
						size='icon'
						variant='outline'
						className='size-6 shrink-0 rounded-full border-border/70 bg-background/85 shadow-none sm:size-7'
						data-no-drag='true'
						onClick={(event) => {
							event.stopPropagation();
							togglePlayback();
						}}>
						{isPlaying ? (
							<Pause className='size-3.5' />
						) : (
							<Play className='size-3.5 fill-current' />
						)}
						<span className='sr-only'>
							{isPlaying ? t('audio_player_pause') : t('audio_player_play')}
						</span>
					</Button>
					<div className='min-w-0 flex-1 text-left'>
						<div className='truncate text-xs font-semibold text-foreground sm:text-sm'>
							{track.title}
						</div>
					</div>
					<Button
						type='button'
						size='icon'
						variant='ghost'
						className='size-7 shrink-0 rounded-full text-muted-foreground sm:size-8'
						data-no-drag='true'
						onClick={(event) => {
							event.stopPropagation();
							clearTrack();
						}}>
						<X className='size-3.5' />
						<span className='sr-only'>{t('audio_player_close')}</span>
					</Button>
				</div>
			</div>

			<Dialog open={isExpanded} onOpenChange={setIsExpanded}>
				<DialogContent className='[&>button]:hidden flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-background/98 p-0 shadow-none sm:h-[100dvh] sm:max-w-none'>
					<div className='flex items-center justify-between border-b border-border/50 px-5 py-4 sm:px-8'>
						<div className='min-w-0'>
							<DialogTitle className='truncate text-lg font-semibold'>
								{track.title}
							</DialogTitle>
							<DialogDescription className='truncate text-sm text-muted-foreground'>
								{track.artist}
							</DialogDescription>
						</div>
						<div className='flex items-center gap-2'>
							<Button
								type='button'
								size='icon'
								variant='outline'
								className='rounded-full'
								onClick={() => {
									setIsExpanded(false);
								}}>
								<Minimize2 className='size-4' />
								<span className='sr-only'>Minimize</span>
							</Button>
						</div>
					</div>

					<div className='relative flex min-h-0 flex-1 overflow-hidden'>
						<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.05),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(132,204,22,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_65%)] dark:bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.04),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(34,197,94,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_65%)]' />
						<div className='grid w-full min-h-0 gap-0 lg:grid-cols-[minmax(22rem,1.05fr)_minmax(24rem,0.95fr)]'>
							<div className='flex min-h-0 items-center justify-center px-6 py-8 sm:px-10 lg:px-14'>
								<div className='flex h-full w-full max-w-2xl flex-col gap-6 pt-8 lg:pt-14'>
									<div className='mx-auto w-full max-w-[25rem] lg:max-w-[22rem]'>
										<img
											src={track.cover}
											alt={track.title}
											className='aspect-square w-full rounded-[2.25rem] object-cover shadow-[0_36px_80px_-40px_rgba(15,23,42,0.6)] ring-1 ring-black/10 dark:ring-white/10'
										/>
									</div>

									<div className='mx-auto flex w-full max-w-[48rem] flex-1 flex-col justify-end gap-8 pb-2'>
										<div className='space-y-4 text-left'>
											<div className='inline-flex rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground'>
												Now Playing
											</div>
											<div className='space-y-2'>
												<h2 className='max-w-[12ch] text-4xl font-semibold tracking-tight sm:text-5xl'>
													{track.title}
												</h2>
												<p className='text-lg text-muted-foreground sm:text-xl'>
													{track.artist}
												</p>
											</div>
										</div>

										<div className='space-y-6'>
											<div className='space-y-2'>
												{duration > 0 ? (
													<Slider
														value={[currentTime]}
														max={duration}
														step={0.1}
														className='cursor-pointer'
														onValueChange={(value) => seek(value[0])}
													/>
												) : (
													<div className='h-2 rounded-full bg-muted/80' />
												)}
												<div className='flex items-center justify-between text-sm text-muted-foreground tabular-nums'>
													<span>{formatAudioTime(currentTime)}</span>
													<span>{formatAudioTime(duration)}</span>
												</div>
											</div>

											<div className='grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]'>
												<div className='flex min-w-0 items-center gap-2 rounded-full border border-border/55 bg-background/35 px-3 py-2 sm:max-w-[15rem]'>
													<Volume2 className='size-4 shrink-0 text-muted-foreground' />
													<Slider
														value={[volume]}
														max={1}
														step={0.01}
														className='cursor-pointer'
														onValueChange={(value) => setVolume(value[0])}
													/>
												</div>

												<div className='flex items-center justify-center'>
													<Button
														type='button'
														size='icon'
														variant='outline'
														className='size-16 rounded-full border-border/70 bg-background/70 shadow-none'
														onClick={togglePlayback}>
														{isPlaying ? (
															<Pause className='size-7' />
														) : (
															<Play className='size-7 fill-current' />
														)}
														<span className='sr-only'>
															{isPlaying
																? t('audio_player_pause')
																: t('audio_player_play')}
														</span>
													</Button>
												</div>

												<div className='flex justify-start sm:justify-end'>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																type='button'
																variant='outline'
																size='sm'
																className='h-11 min-w-[5rem] rounded-full border-border/70 bg-background/70 px-4 text-sm shadow-none'>
																{playbackRate}x
																<ChevronDown className='size-3.5 opacity-70' />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent
															align='end'
															className='min-w-[8rem] rounded-2xl'>
															<DropdownMenuRadioGroup
																value={String(playbackRate)}
																onValueChange={(value) =>
																	setPlaybackRate(Number(value))
																}>
																{PLAYBACK_RATE_OPTIONS.map((rate) => (
																	<DropdownMenuRadioItem
																		key={rate}
																		value={String(rate)}
																		className='rounded-xl'>
																		{rate}x
																	</DropdownMenuRadioItem>
																))}
															</DropdownMenuRadioGroup>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className='flex min-h-0 flex-col border-t border-border/40 bg-background/42 backdrop-blur-md lg:border-l lg:border-t-0'>
								<div className='flex items-center justify-between px-6 py-5 sm:px-8'>
									<div>
										<div className='text-base font-semibold text-foreground sm:text-lg'>
											Transcript
										</div>
										<div className='text-sm text-muted-foreground'>
											Podcast script for the current session
										</div>
									</div>
								</div>
								<div className='min-h-0 flex-1 overflow-auto px-6 pb-8 sm:px-8'>
									<div className='space-y-4 text-sm leading-7 text-muted-foreground'>
										{isTranscriptLoading ? (
											<div className='rounded-3xl border border-border/40 bg-background/50 px-5 py-4'>
												Loading transcript...
											</div>
										) : transcriptError ? (
											<div className='rounded-3xl border border-border/40 bg-background/50 px-5 py-4'>
												{transcriptError}
											</div>
										) : transcriptSegments.length > 0 ? (
											<div className='space-y-4'>
												{transcriptSegments.map((segment, index) => (
													<div
														key={`${segment.speaker ?? 'speaker'}-${index}`}
														role={
															typeof segment.start === 'number'
																? 'button'
																: undefined
														}
														tabIndex={
															typeof segment.start === 'number' ? 0 : undefined
														}
														className={cn(
															'rounded-[1.75rem] border px-5 py-4 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)] transition-colors',
															index === activeTranscriptSegmentIndex
																? 'border-foreground/20 bg-foreground/[0.06] text-foreground'
																: 'border-border/40 bg-background/50',
															typeof segment.start === 'number'
																? 'cursor-pointer hover:border-foreground/20 hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20'
																: '',
														)}
														onClick={() => {
															if (typeof segment.start === 'number') {
																seek(segment.start);
															}
														}}
														onKeyDown={(event) => {
															if (typeof segment.start !== 'number') {
																return;
															}
															if (event.key === 'Enter' || event.key === ' ') {
																event.preventDefault();
																seek(segment.start);
															}
														}}>
														<div className='mb-2 flex flex-wrap items-center gap-2'>
															{resolveTranscriptSpeakerLabel(segment.speaker) ? (
																<div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80'>
																	{resolveTranscriptSpeakerLabel(segment.speaker)}
																</div>
															) : null}
															{typeof segment.start === 'number' &&
															typeof segment.end === 'number' ? (
																<div className='rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground'>
																	{formatAudioTime(segment.start)} -{' '}
																	{formatAudioTime(segment.end)}
																</div>
															) : null}
															{typeof segment.audioDuration === 'number' ? (
																<div className='rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground'>
																	{formatAudioTime(segment.audioDuration)}
																</div>
															) : null}
														</div>
														<div>{segment.text}</div>
													</div>
												))}
											</div>
										) : transcriptText ? (
											<div className='whitespace-pre-wrap rounded-[1.75rem] border border-border/40 bg-background/50 px-5 py-4 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]'>
												{transcriptText}
											</div>
										) : (
											<div className='rounded-3xl border border-border/40 bg-background/50 px-5 py-4'>
												No transcript available.
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default FloatingAudioPlayer;
