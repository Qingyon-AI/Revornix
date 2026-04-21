'use client';

import {
	useCallback,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import {
	normalizeAudioTrack,
	type AudioTrack,
	type AudioTrackInfo,
} from '@/lib/audio';

interface AudioPlayerContextValue {
	track: AudioTrack | null;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	playbackRate: number;
	toggleTrack: (track: AudioTrackInfo) => Promise<void>;
	registerTrack: (
		track: AudioTrackInfo,
		options?: { force?: boolean },
	) => void;
	pause: () => void;
	resume: () => Promise<void>;
	seek: (time: number) => void;
	setVolume: (volume: number) => void;
	setPlaybackRate: (rate: number) => void;
	clearTrack: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
	const audioRef = useRef<HTMLAudioElement>(null);
	const trackRef = useRef<AudioTrack | null>(null);
	const isPlayingRef = useRef(false);
	const dismissedTrackKeyRef = useRef<string | null>(null);
	const [track, setTrack] = useState<AudioTrack | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolumeState] = useState(0.8);
	const [playbackRate, setPlaybackRateState] = useState(1);

	useEffect(() => {
		trackRef.current = track;
	}, [track]);

	useEffect(() => {
		isPlayingRef.current = isPlaying;
	}, [isPlaying]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		audio.volume = 0.8;
		audio.playbackRate = 1;

		const syncProgress = () => {
			setCurrentTime(audio.currentTime || 0);
			setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
		};

		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);
		const handleVolumeChange = () => setVolumeState(audio.volume);
		const handleRateChange = () => setPlaybackRateState(audio.playbackRate || 1);
		const handleEmptied = () => {
			setCurrentTime(0);
			setDuration(0);
			setIsPlaying(false);
		};

		audio.addEventListener('timeupdate', syncProgress);
		audio.addEventListener('loadedmetadata', syncProgress);
		audio.addEventListener('durationchange', syncProgress);
		audio.addEventListener('play', handlePlay);
		audio.addEventListener('pause', handlePause);
		audio.addEventListener('ended', handlePause);
		audio.addEventListener('volumechange', handleVolumeChange);
		audio.addEventListener('ratechange', handleRateChange);
		audio.addEventListener('emptied', handleEmptied);

		return () => {
			audio.removeEventListener('timeupdate', syncProgress);
			audio.removeEventListener('loadedmetadata', syncProgress);
			audio.removeEventListener('durationchange', syncProgress);
			audio.removeEventListener('play', handlePlay);
			audio.removeEventListener('pause', handlePause);
			audio.removeEventListener('ended', handlePause);
			audio.removeEventListener('volumechange', handleVolumeChange);
			audio.removeEventListener('ratechange', handleRateChange);
			audio.removeEventListener('emptied', handleEmptied);
		};
	}, []);

	const pause = useCallback(() => {
		audioRef.current?.pause();
	}, []);

	const resume = useCallback(async () => {
		const audio = audioRef.current;
		if (!audio || !trackRef.current) return;
		try {
			await audio.play();
		} catch {
			// Ignore playback failures to avoid surfacing noisy dev overlays for
			// transient browser/media policy issues.
		}
	}, []);

	const toggleTrack = useCallback(async (trackInfo: AudioTrackInfo) => {
		const audio = audioRef.current;
		if (!audio || !trackInfo.src) return;

		const nextTrack = normalizeAudioTrack(trackInfo);
		const isCurrentTrack = trackRef.current?.key === nextTrack.key;
		dismissedTrackKeyRef.current = null;

		setTrack(nextTrack);

		if (isCurrentTrack) {
			if (audio.paused) {
				try {
					await audio.play();
				} catch {
					// Ignore playback failures to keep the UI stable.
				}
				return;
			}
			audio.pause();
			return;
		}

		audio.src = nextTrack.src;
		audio.load();
		setCurrentTime(0);
		setDuration(0);

		try {
			await audio.play();
		} catch {
			// Ignore playback failures to keep the UI stable.
		}
	}, []);

	const registerTrack = useCallback((
		trackInfo: AudioTrackInfo,
		options?: { force?: boolean },
	) => {
		const audio = audioRef.current;
		if (!audio || !trackInfo.src) return;

		const nextTrack = normalizeAudioTrack(trackInfo);
		const isCurrentTrack = trackRef.current?.key === nextTrack.key;

		if (
			!options?.force &&
			dismissedTrackKeyRef.current === nextTrack.key
		) {
			return;
		}

		if (isPlayingRef.current && !options?.force && !isCurrentTrack) {
			return;
		}

		setTrack(nextTrack);

		if (isCurrentTrack) {
			if (!audio.getAttribute('src')) {
				audio.src = nextTrack.src;
				audio.load();
			}
			return;
		}

		audio.pause();
		audio.src = nextTrack.src;
		audio.load();
		setCurrentTime(0);
		setDuration(0);
		setIsPlaying(false);
	}, []);

	const seek = useCallback((time: number) => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(time)) return;
		audio.currentTime = time;
		setCurrentTime(time);
	}, []);

	const setVolume = useCallback((nextVolume: number) => {
		const audio = audioRef.current;
		if (!audio) return;
		const normalizedVolume = Math.min(1, Math.max(0, nextVolume));
		audio.volume = normalizedVolume;
		setVolumeState(normalizedVolume);
	}, []);

	const setPlaybackRate = useCallback((nextRate: number) => {
		const audio = audioRef.current;
		if (!audio) return;
		const normalizedRate = Math.min(2, Math.max(0.5, nextRate));
		audio.playbackRate = normalizedRate;
		setPlaybackRateState(normalizedRate);
	}, []);

	const clearTrack = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		dismissedTrackKeyRef.current = trackRef.current?.key ?? null;
		audio.pause();
		audio.removeAttribute('src');
		audio.load();
		setTrack(null);
		setCurrentTime(0);
		setDuration(0);
		setIsPlaying(false);
	}, []);

	const value = useMemo(
		() => ({
			track,
			isPlaying,
			currentTime,
			duration,
			volume,
			playbackRate,
			toggleTrack,
			registerTrack,
			pause,
			resume,
			seek,
			setVolume,
			setPlaybackRate,
			clearTrack,
		}),
		[
			clearTrack,
			currentTime,
			duration,
			isPlaying,
			pause,
			playbackRate,
			registerTrack,
			resume,
			seek,
			setVolume,
			setPlaybackRate,
			toggleTrack,
			track,
			volume,
		],
	);

	return (
		<AudioPlayerContext.Provider value={value}>
			{children}
			<audio ref={audioRef} preload='metadata' className='hidden' />
		</AudioPlayerContext.Provider>
	);
};

export const useAudioPlayer = () => {
	const context = useContext(AudioPlayerContext);
	if (!context) {
		throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
	}
	return context;
};
