'use client';

import { Minimize2, Pause, Play, Volume2, X } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Slider } from '@/components/ui/slider';
import { formatAudioTime } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/provider/audio-player-provider';

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
	const {
		track,
		isPlaying,
		currentTime,
		duration,
		volume,
		pause,
		resume,
		seek,
		setVolume,
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
						'sm:w-[16.5rem]',
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
						className='size-6 shrink-0 rounded-full border-border/70 bg-background/85 shadow-none'
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
						<div className='truncate text-xs font-semibold text-foreground sm:text-[13px]'>
							{track.title}
						</div>
					</div>
					<Button
						type='button'
						size='icon'
						variant='ghost'
						className='size-7 shrink-0 rounded-full text-muted-foreground'
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
					<div className='flex items-center justify-between border-b border-border/60 px-5 py-4 sm:px-8'>
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

					<div className='flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 sm:px-10'>
						<div className='flex w-full max-w-3xl flex-col items-center gap-8'>
							<img
								src={track.cover}
								alt={track.title}
								className='aspect-square w-full max-w-[min(70vw,24rem)] rounded-[2rem] object-cover shadow-[0_32px_80px_-36px_rgba(15,23,42,0.5)] ring-1 ring-black/10 dark:ring-white/10'
							/>

							<div className='w-full space-y-3 text-center'>
								<h2 className='text-2xl font-semibold tracking-tight sm:text-4xl'>
									{track.title}
								</h2>
								<p className='text-sm text-muted-foreground sm:text-lg'>
									{track.artist}
								</p>
							</div>

							<div className='w-full max-w-2xl space-y-4'>
								<div className='flex items-center gap-3 text-sm text-muted-foreground'>
									<span className='w-12 text-right'>
										{formatAudioTime(currentTime)}
									</span>
									{duration > 0 ? (
										<Slider
											value={[currentTime]}
											max={duration}
											step={0.1}
											className='flex-1 cursor-pointer'
											onValueChange={(value) => seek(value[0])}
										/>
									) : (
										<div className='h-2 flex-1 rounded-full bg-muted/80' />
									)}
									<span className='w-12'>{formatAudioTime(duration)}</span>
								</div>

								<div className='flex items-center justify-center gap-4'>
									<Button
										type='button'
										size='icon'
										variant='outline'
										className='size-14 rounded-full'
										onClick={togglePlayback}>
										{isPlaying ? (
											<Pause className='size-6' />
										) : (
											<Play className='size-6 fill-current' />
										)}
										<span className='sr-only'>
											{isPlaying
												? t('audio_player_pause')
												: t('audio_player_play')}
										</span>
									</Button>
								</div>

								<div className='mx-auto flex w-full max-w-sm items-center gap-3'>
									<Volume2 className='size-4 text-muted-foreground' />
									<Slider
										value={[volume]}
										max={1}
										step={0.01}
										className='cursor-pointer'
										onValueChange={(value) => setVolume(value[0])}
									/>
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
