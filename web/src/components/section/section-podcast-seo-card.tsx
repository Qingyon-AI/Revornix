'use client';

import { useEffect, useRef, useState } from 'react';
import { AudioLines, Loader2, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionPodcastStatus } from '@/enums/section';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import AudioStatusCard from '@/components/ui/audio-status-card';
import TaskStateCard from '@/components/ui/task-state-card';
import { formatAudioTime } from '@/lib/audio';

type SectionPodcastSeoCardProps = {
	status?: SectionPodcastStatus | number | null;
	podcastFileName?: string | null;
	title?: string | null;
	cover?: string | null;
	className?: string;
};

const SECTION_PODCAST_FALLBACK_COVER =
	'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png';

const SectionPodcastSeoCard = ({
	status,
	podcastFileName,
	title,
	cover,
	className,
}: SectionPodcastSeoCardProps) => {
	const t = useTranslations();
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const sync = () => {
			setCurrentTime(audio.currentTime || 0);
			setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
		};
		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);

		audio.addEventListener('timeupdate', sync);
		audio.addEventListener('loadedmetadata', sync);
		audio.addEventListener('durationchange', sync);
		audio.addEventListener('play', handlePlay);
		audio.addEventListener('pause', handlePause);
		audio.addEventListener('ended', handlePause);

		return () => {
			audio.removeEventListener('timeupdate', sync);
			audio.removeEventListener('loadedmetadata', sync);
			audio.removeEventListener('durationchange', sync);
			audio.removeEventListener('play', handlePlay);
			audio.removeEventListener('pause', handlePause);
			audio.removeEventListener('ended', handlePause);
		};
	}, [podcastFileName]);

	const togglePlayback = async () => {
		const audio = audioRef.current;
		if (!audio) return;

		if (audio.paused) {
			try {
				await audio.play();
			} catch {
				// Ignore playback failures to avoid noisy dev overlays.
			}
			return;
		}

		audio.pause();
	};

	const handleSeek = (value: number[]) => {
		const audio = audioRef.current;
		const nextTime = value[0];
		if (!audio || !Number.isFinite(nextTime)) return;
		audio.currentTime = nextTime;
		setCurrentTime(nextTime);
	};

	if (status == null) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_todo')}
				title={t('section_podcast_unset')}
				description={t('section_podcast_placeholder_description')}
				className={className}
			/>
		);
	}

	if (status === SectionPodcastStatus.GENERATING) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_doing')}
				title={t('section_podcast_processing')}
				description={t('section_podcast_processing_description')}
				icon={Loader2}
				tone='default'
				actionLoading
				className={className}
				spinning
			/>
		);
	}

	if (status === SectionPodcastStatus.WAIT_TO) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_todo')}
				title={t('section_podcast_wait_to')}
				description={t('section_podcast_wait_to_description')}
				tone='warning'
				className={className}
			/>
		);
	}

	if (status === SectionPodcastStatus.SUCCESS && podcastFileName) {
		const resolvedTitle = title ?? 'Unknown Title';
		const resolvedCover = cover ?? SECTION_PODCAST_FALLBACK_COVER;

		return (
			<TaskStateCard
				icon={AudioLines}
				badge={t('document_podcast_status_success')}
				title={t('section_podcast_ready')}
				tone='success'
				className={className}>
				<div className='space-y-3 rounded-[20px] border border-border/60 bg-background/40 p-3 sm:p-4'>
					<div className='flex items-center gap-3'>
						<img
							src={resolvedCover}
							alt={resolvedTitle}
							className='size-16 shrink-0 rounded-2xl object-cover ring-1 ring-black/10 ring-inset dark:ring-white/10'
						/>
						<div className='min-w-0'>
							<div className='line-clamp-2 text-sm font-medium text-foreground'>
								{resolvedTitle}
							</div>
							<div className='text-xs text-muted-foreground'>
								AI Generated
							</div>
						</div>
					</div>
					<div className='flex items-center gap-3 rounded-2xl border border-border/60 bg-background/65 px-3 py-3'>
						<Button
							type='button'
							variant='outline'
							size='icon'
							className='size-10 shrink-0 rounded-full'
							onClick={(event) => {
								event.stopPropagation();
								void togglePlayback();
							}}
							onPointerDown={(event) => event.stopPropagation()}>
							{isPlaying ? (
								<Pause className='size-4' />
							) : (
								<Play className='size-4' />
							)}
							<span className='sr-only'>
								{isPlaying ? t('audio_player_pause') : t('audio_player_play')}
							</span>
						</Button>
						<div className='min-w-0 flex-1'>
							<div className='mb-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground'>
								<span>{formatAudioTime(currentTime)}</span>
								<span>{formatAudioTime(duration)}</span>
							</div>
							<div
								onClick={(event) => event.stopPropagation()}
								onPointerDown={(event) => event.stopPropagation()}>
								<Slider
									value={[currentTime]}
									max={duration > 0 ? duration : 1}
									step={0.1}
									className='w-full'
									onValueChange={handleSeek}
								/>
							</div>
						</div>
					</div>
					<audio ref={audioRef} preload='metadata' src={podcastFileName} />
				</div>
			</TaskStateCard>
		);
	}

	if (status === SectionPodcastStatus.FAILED) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_failed')}
				title={t('section_podcast_failed')}
				description={t('section_podcast_failed_description')}
				tone='danger'
				className={className}
			/>
		);
	}

	return (
		<AudioStatusCard
			badge={t('document_podcast_status_todo')}
			title={t('section_podcast_unset')}
			description={t('section_podcast_placeholder_description')}
			className={className}
		/>
	);
};

export default SectionPodcastSeoCard;
