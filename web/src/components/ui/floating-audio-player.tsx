'use client';

import { Pause, Play, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { formatAudioTime } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/provider/audio-player-provider';

const FloatingAudioPlayer = () => {
	const t = useTranslations();
	const containerRef = useRef<HTMLDivElement>(null);
	const dragOffsetRef = useRef({ x: 0, y: 0 });
	const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
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

	useEffect(() => {
		if (!position) return;

		const handleResize = () => {
			const container = containerRef.current;
			if (!container) return;

			const { width, height } = container.getBoundingClientRect();
			const maxX = Math.max(16, window.innerWidth - width - 16);
			const maxY = Math.max(16, window.innerHeight - height - 16);

			setPosition((current) =>
				current
					? {
							x: Math.min(Math.max(16, current.x), maxX),
							y: Math.min(Math.max(16, current.y), maxY),
					  }
					: current,
			);
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [position]);

	if (!track) return null;

	const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
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
		setPosition({ x: rect.left, y: rect.top });
		setIsDragging(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!isDragging) return;
		const container = containerRef.current;
		if (!container) return;

		const { width, height } = container.getBoundingClientRect();
		const nextX = event.clientX - dragOffsetRef.current.x;
		const nextY = event.clientY - dragOffsetRef.current.y;
		const maxX = Math.max(16, window.innerWidth - width - 16);
		const maxY = Math.max(16, window.innerHeight - height - 16);

		setPosition({
			x: Math.min(Math.max(16, nextX), maxX),
			y: Math.min(Math.max(16, nextY), maxY),
		});
	};

	const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!isDragging) return;
		setIsDragging(false);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<div
			ref={containerRef}
			className={cn(
				'fixed z-50 w-[min(26rem,calc(100vw-2rem))]',
				!position ? 'right-4 bottom-4' : '',
				isDragging ? 'cursor-grabbing select-none' : 'cursor-move',
			)}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			style={position ? { left: position.x, top: position.y } : undefined}>
			<div className='overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-3 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl'>
				<div className='flex items-start gap-3'>
					<img
						src={track.cover}
						alt={track.title}
						className='size-14 rounded-xl object-cover ring-1 ring-black/10 dark:ring-white/10 p-2'
					/>
					<div className='min-w-0 flex-1'>
						<div className='flex items-start justify-between gap-2 rounded-xl'>
							<div className='min-w-0'>
								<p className='text-[11px] uppercase tracking-[0.22em] text-muted-foreground'>
									{t('audio_player_now_playing')}
								</p>
								<h3 className='truncate text-sm font-semibold'>{track.title}</h3>
								<p className='truncate text-xs text-muted-foreground'>
									{track.artist}
								</p>
							</div>
							<Button
								type='button'
								variant='ghost'
								size='icon-sm'
								className='cursor-pointer rounded-full'
								data-no-drag='true'
								onClick={clearTrack}>
								<X className='size-4' />
								<span className='sr-only'>{t('audio_player_close')}</span>
							</Button>
						</div>

						<div className='mt-3 flex items-center gap-2'>
							<Button
								type='button'
								variant='outline'
								size='icon-sm'
								className='cursor-pointer rounded-full'
								data-no-drag='true'
								onClick={() => {
									if (isPlaying) {
										pause();
										return;
									}
									void resume();
								}}>
								{isPlaying ? (
									<Pause className='size-4' />
								) : (
									<Play className='size-4' />
								)}
								<span className='sr-only'>
									{isPlaying ? t('audio_player_pause') : t('audio_player_play')}
								</span>
							</Button>
							<span className='w-10 text-right text-xs text-muted-foreground'>
								{formatAudioTime(currentTime)}
							</span>
							{duration > 0 ? (
								<Slider
									value={[currentTime]}
									max={duration}
									step={0.1}
									className='flex-1 cursor-pointer'
									data-no-drag='true'
									onValueChange={(value) => seek(value[0])}
								/>
							) : (
								<div className='h-2 flex-1 rounded-full bg-muted/80' />
							)}
							<span className='w-10 text-xs text-muted-foreground'>
								{formatAudioTime(duration)}
							</span>
						</div>

						<div className='mt-3 hidden items-center gap-2 sm:flex'>
							<Volume2 className='size-4 text-muted-foreground' />
							<Slider
								value={[volume]}
								max={1}
								step={0.01}
								className='cursor-pointer'
								data-no-drag='true'
								onValueChange={(value) => setVolume(value[0])}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FloatingAudioPlayer;
