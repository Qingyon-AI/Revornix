'use client';

import { Pause, Play, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
	DEFAULT_AUDIO_COVER,
	formatAudioTime,
	normalizeAudioTrack,
	type AudioTrackInfo,
} from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/provider/audio-player-provider';

interface AudioPlayerProps extends AudioTrackInfo {
	variant?: 'default' | 'compact';
	className?: string;
}

export default function AudioPlayer({
	src,
	title = 'Unknown Title',
	artist = 'Unknown Artist',
	cover = DEFAULT_AUDIO_COVER,
	variant = 'default',
	className,
}: AudioPlayerProps) {
	const t = useTranslations();
	const { track, isPlaying, currentTime, duration, volume, toggleTrack, seek, setVolume } =
		useAudioPlayer();

	const normalizedTrack = normalizeAudioTrack({
		src,
		title,
		artist,
		cover,
	});
	const isActive = track?.key === normalizedTrack.key;
	const playing = isActive && isPlaying;
	const progress = isActive ? currentTime : 0;
	const durationValue = isActive ? duration : 0;

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
					onClick={() => void toggleTrack(normalizedTrack)}>
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
		<div className={cn('flex items-center gap-4', className)}>
			<img
				src={normalizedTrack.cover}
				alt={normalizedTrack.title}
				className='size-20 flex-shrink-0 rounded-md object-cover ring-1 ring-black/10 ring-inset dark:ring-white/10 p-2'
			/>

			<div className='flex min-w-0 flex-1 flex-col'>
				<div className='mb-2 flex flex-col'>
					<h3 className='truncate text-sm font-medium'>{normalizedTrack.title}</h3>
					<p className='truncate text-xs text-muted-foreground'>
						{normalizedTrack.artist}
					</p>
				</div>

				<div className='flex items-center'>
					<Button
						type='button'
						variant='outline'
						size='icon'
						onClick={() => void toggleTrack(normalizedTrack)}
						className='h-9 w-9 rounded-full'>
						{playing ? (
							<Pause className='h-4 w-4' />
						) : (
							<Play className='h-4 w-4' />
						)}
						<span className='sr-only'>
							{playing ? t('audio_player_pause') : t('audio_player_play')}
						</span>
					</Button>

					<div className='flex w-full items-center gap-2'>
						<span className='w-10 text-right text-xs text-muted-foreground'>
							{formatAudioTime(progress)}
						</span>
						{durationValue > 0 ? (
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
						) : (
							<div className='h-2 flex-1 animate-pulse rounded-md bg-muted opacity-50' />
						)}
						<span className='w-10 text-xs text-muted-foreground'>
							{formatAudioTime(durationValue)}
						</span>
					</div>

					<div className='hidden w-28 items-center gap-2 md:flex'>
						<Volume2 className='h-4 w-4 text-muted-foreground' />
						<Slider
							value={[volume]}
							max={1}
							step={0.01}
							onValueChange={(value) => setVolume(value[0])}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
