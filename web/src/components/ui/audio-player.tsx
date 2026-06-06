'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import {
	DEFAULT_AUDIO_COVER,
	cacheAudioDuration,
	formatAudioTime,
	getCachedAudioDuration,
	normalizeAudioTrack,
	resolveAudioDuration,
	type AudioTrackInfo,
} from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/provider/audio-player-provider';

interface AudioPlayerProps extends AudioTrackInfo {
	variant?: 'default' | 'compact';
	className?: string;
}

const PLAYBACK_RATE_OPTIONS = [0.8, 1, 1.25, 1.5, 2];

export default function AudioPlayer({
	src,
	title = 'Unknown Title',
	artist = 'Unknown Artist',
	cover = DEFAULT_AUDIO_COVER,
	scriptUrl,
	speakerMap,
	variant = 'default',
	className,
}: AudioPlayerProps) {
	const t = useTranslations();
	const {
		track,
		isPlaying,
		currentTime,
		duration,
		volume,
		playbackRate,
		toggleTrack,
		seek,
		setVolume,
		setPlaybackRate,
	} = useAudioPlayer();

	const normalizedTrack = normalizeAudioTrack({
		src,
		title,
		artist,
		cover,
		scriptUrl,
		speakerMap,
	});
	const [cachedDuration, setCachedDuration] = useState(
		getCachedAudioDuration(normalizedTrack.key)
	);
	const isActive = track?.key === normalizedTrack.key;
	const playing = isActive && isPlaying;
	const progress = isActive ? currentTime : 0;
	const durationValue =
		isActive && duration > 0 ? duration : cachedDuration;

	useEffect(() => {
		if (duration <= 0) {
			return;
		}
		cacheAudioDuration(normalizedTrack.key, duration);
		setCachedDuration((currentDuration) =>
			Math.abs(currentDuration - duration) < 0.01 ? currentDuration : duration
		);
	}, [duration, normalizedTrack.key]);

	useEffect(() => {
		const existingDuration = getCachedAudioDuration(normalizedTrack.key);
		if (existingDuration && existingDuration > 0) {
			setCachedDuration(existingDuration);
			return;
		}
		let cancelled = false;

		void resolveAudioDuration(normalizedTrack).then((resolvedDuration) => {
			if (!cancelled && resolvedDuration > 0) {
				setCachedDuration(resolvedDuration);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [normalizedTrack.key, normalizedTrack.src]);

	if (variant === 'compact') {
		return (
			<div
				className={cn(
					'flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3',
					className,
				)}>
				<Button
					type='button'
					variant='outline'
					size='icon-sm'
					className='rounded-full'
					onClick={(event) => {
						event.stopPropagation();
						void toggleTrack(normalizedTrack);
					}}
					onPointerDown={(event) => event.stopPropagation()}>
					{playing ? (
						<Pause className='size-4' />
					) : (
						<Play className='size-4' />
					)}
					<span className='sr-only'>
						{playing ? t('audio_player_pause') : t('audio_player_play')}
					</span>
				</Button>
				<div className='min-w-0 flex-1'>
					<div className='truncate text-sm font-medium'>{normalizedTrack.title}</div>
					<div className='truncate text-xs text-muted-foreground'>
						{isActive && durationValue > 0
							? `${formatAudioTime(progress)} / ${formatAudioTime(durationValue)}`
							: normalizedTrack.artist}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				'flex min-w-0 flex-col gap-3',
				className,
			)}>
			<div className='flex items-center gap-3'>
				<img
					src={normalizedTrack.cover}
					alt={normalizedTrack.title}
					className='size-12 flex-shrink-0 rounded-xl object-cover'
				/>
				<div className='min-w-0 flex-1'>
					<h3 className='truncate text-base font-semibold leading-tight'>
						{normalizedTrack.title}
					</h3>
					<p className='truncate text-sm text-muted-foreground'>
						{normalizedTrack.artist}
					</p>
				</div>

				<div className='ml-auto flex shrink-0 items-center gap-1.5'>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								type='button'
								variant='outline'
								size='icon'
								className='size-8 shrink-0 rounded-full border-border/70 shadow-none'
								onClick={(event) => event.stopPropagation()}
								onPointerDown={(event) => event.stopPropagation()}>
								<Volume2 className='size-4 text-muted-foreground' />
								<span className='sr-only'>{t('audio_player_volume')}</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent
							align='end'
							className='w-44 rounded-2xl p-3'
							onClick={(event) => event.stopPropagation()}
							onPointerDown={(event) => event.stopPropagation()}>
							<div className='space-y-2'>
								<div className='flex items-center justify-between text-xs text-muted-foreground'>
									<span>{t('audio_player_volume')}</span>
									<span>{Math.round(volume * 100)}%</span>
								</div>
								<Slider
									value={[volume]}
									max={1}
									step={0.01}
									onValueChange={(value) => setVolume(value[0])}
								/>
							</div>
						</PopoverContent>
					</Popover>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 shrink-0 rounded-full border-border/70 px-2.5 text-xs shadow-none'
								onClick={(event) => event.stopPropagation()}
								onPointerDown={(event) => event.stopPropagation()}>
								{playbackRate}x
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end' className='min-w-[8rem] rounded-2xl'>
							<DropdownMenuRadioGroup
								value={String(playbackRate)}
								onValueChange={(value) => setPlaybackRate(Number(value))}>
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

			<div className='flex min-w-0 items-center gap-2'>
				<Button
					type='button'
					variant='outline'
					size='icon'
					onClick={() => void toggleTrack(normalizedTrack)}
					className='size-9 shrink-0 rounded-full'>
					{playing ? (
						<Pause className='size-4' />
					) : (
						<Play className='size-4 fill-current' />
					)}
					<span className='sr-only'>
						{playing ? t('audio_player_pause') : t('audio_player_play')}
					</span>
				</Button>

				<span className='shrink-0 text-xs tabular-nums text-muted-foreground'>
					{formatAudioTime(progress)}
				</span>
				{durationValue > 0 ? (
					<div
						className='min-w-0 flex-1'
						onClick={(event) => event.stopPropagation()}
						onPointerDown={(event) => event.stopPropagation()}>
						<Slider
							value={[progress]}
							max={durationValue}
							step={0.1}
							onValueChange={(value) => {
								if (!isActive) return;
								seek(value[0]);
							}}
						/>
					</div>
				) : (
					<div className='h-2 min-w-0 flex-1 animate-pulse rounded-md bg-muted opacity-50' />
				)}
				<span className='shrink-0 text-xs tabular-nums text-muted-foreground'>
					{formatAudioTime(durationValue)}
				</span>
			</div>
		</div>
	);
}
