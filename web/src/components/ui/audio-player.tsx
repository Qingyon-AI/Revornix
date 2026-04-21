'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Pause, Play, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
				'flex min-w-0 flex-col gap-4',
				className,
			)}>
			<div className='flex items-center gap-3'>
				<img
					src={normalizedTrack.cover}
					alt={normalizedTrack.title}
					className='size-16 flex-shrink-0 rounded-2xl object-cover'
				/>
				<div className='min-w-0 flex-1'>
					<h3 className='truncate text-lg font-semibold leading-tight'>
						{normalizedTrack.title}
					</h3>
					<p className='truncate text-sm text-muted-foreground'>
						{normalizedTrack.artist}
					</p>
				</div>
			</div>

			<div className='flex min-w-0 flex-1 flex-col gap-4'>
				<div className='flex items-center gap-3'>
					<Button
						type='button'
						variant='outline'
						size='icon'
						onClick={() => void toggleTrack(normalizedTrack)}
						className='h-10 w-10 rounded-full'>
						{playing ? (
							<Pause className='h-4 w-4' />
						) : (
							<Play className='h-4 w-4 fill-current' />
						)}
						<span className='sr-only'>
							{playing ? t('audio_player_pause') : t('audio_player_play')}
						</span>
					</Button>

					<div className='flex min-w-0 flex-1 items-center gap-2'>
						<span className='w-10 text-right text-xs text-muted-foreground tabular-nums'>
							{formatAudioTime(progress)}
						</span>
						{durationValue > 0 ? (
							<div
								className='flex-1'
								onClick={(event) => event.stopPropagation()}
								onPointerDown={(event) => event.stopPropagation()}>
								<Slider
									value={[progress]}
									max={durationValue}
									step={0.1}
									className='flex-1'
									onValueChange={(value) => {
										if (!isActive) return;
										seek(value[0]);
									}}
								/>
							</div>
						) : (
							<div className='h-2 flex-1 animate-pulse rounded-md bg-muted opacity-50' />
						)}
						<span className='w-10 text-xs text-muted-foreground tabular-nums'>
							{formatAudioTime(durationValue)}
						</span>
					</div>
				</div>

				<div className='flex flex-wrap items-center gap-4'>
					<div className='flex min-w-0 flex-1 items-center gap-2'>
						<Volume2 className='h-4 w-4 shrink-0 text-muted-foreground' />
						<div
							className='flex-1'
							onClick={(event) => event.stopPropagation()}
							onPointerDown={(event) => event.stopPropagation()}>
							<Slider
								value={[volume]}
								max={1}
								step={0.01}
								onValueChange={(value) => setVolume(value[0])}
							/>
						</div>
					</div>

					<div className='ml-auto flex items-center gap-2'>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='h-8 min-w-[4rem] rounded-full border-border/70 px-3 text-xs shadow-none'>
									{playbackRate}x
									<ChevronDown className='size-3.5 opacity-70' />
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
			</div>
		</div>
	);
}
