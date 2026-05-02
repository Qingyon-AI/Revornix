'use client';

import { useEffect, useState } from 'react';

import type { DocumentInfo } from '@/generated';
import { DocumentPodcastStatus } from '@/enums/document';
import {
	cacheAudioDuration,
	formatAudioTime,
	getCachedAudioDuration,
	normalizeAudioTrack,
	resolveAudioDuration,
} from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/provider/audio-player-provider';
import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

const DocumentCardPodcast = ({ document }: { document: DocumentInfo }) => {
	const t = useTranslations();
	const { track, isPlaying, duration, toggleTrack } = useAudioPlayer();
	const podcastFileName =
		document.podcast_task?.status === DocumentPodcastStatus.SUCCESS
			? document.podcast_task.podcast_file_name
			: null;

	const normalizedTrack = normalizeAudioTrack({
		src: podcastFileName ?? '',
		title: document.title,
		artist: document.creator?.nickname || 'AI Generated',
		scriptUrl: document.podcast_task?.podcast_script_file_name ?? undefined,
	});
	const [cachedDuration, setCachedDuration] = useState(
		getCachedAudioDuration(normalizedTrack.key),
	);
	const isActive = track?.key === normalizedTrack.key;
	const playing = isActive && isPlaying;
	const durationValue = isActive && duration > 0 ? duration : cachedDuration;

	useEffect(() => {
		if (!isActive || duration <= 0) {
			return;
		}
		cacheAudioDuration(normalizedTrack.key, duration);
		setCachedDuration((currentDuration) =>
			Math.abs(currentDuration - duration) < 0.01 ? currentDuration : duration,
		);
	}, [duration, isActive, normalizedTrack.key]);

	useEffect(() => {
		if (!podcastFileName) {
			return;
		}

		const existingDuration = getCachedAudioDuration(normalizedTrack.key);
		if (existingDuration > 0) {
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
	}, [normalizedTrack.key, normalizedTrack.src, podcastFileName]);

	if (!podcastFileName) {
		return null;
	}

	return (
		<div className='flex items-center'>
			<div className='inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/55 px-1 py-1 text-[11px] font-medium text-muted-foreground'>
				<button
					type='button'
					className={cn(
						'flex size-6 items-center justify-center rounded-full border border-border/60 bg-card/85 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
						playing ? 'bg-accent text-accent-foreground' : undefined,
					)}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void toggleTrack(normalizedTrack);
					}}>
					{playing ? (
						<Pause className='size-3.5' />
					) : (
						<Play className='size-3.5' />
					)}
					<span className='sr-only'>
						{playing ? t('audio_player_pause') : t('audio_player_play')}
					</span>
				</button>
				<span className='pr-1'>{formatAudioTime(durationValue)}</span>
			</div>
		</div>
	);
};

export default DocumentCardPodcast;
