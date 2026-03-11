'use client';

import {
	createContext,
	useContext,
	useEffect,
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
	toggleTrack: (track: AudioTrackInfo) => Promise<void>;
	pause: () => void;
	resume: () => Promise<void>;
	seek: (time: number) => void;
	setVolume: (volume: number) => void;
	clearTrack: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [track, setTrack] = useState<AudioTrack | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolumeState] = useState(0.8);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		audio.volume = 0.8;

		const syncProgress = () => {
			setCurrentTime(audio.currentTime || 0);
			setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
		};

		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);
		const handleVolumeChange = () => setVolumeState(audio.volume);
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
		audio.addEventListener('emptied', handleEmptied);

		return () => {
			audio.removeEventListener('timeupdate', syncProgress);
			audio.removeEventListener('loadedmetadata', syncProgress);
			audio.removeEventListener('durationchange', syncProgress);
			audio.removeEventListener('play', handlePlay);
			audio.removeEventListener('pause', handlePause);
			audio.removeEventListener('ended', handlePause);
			audio.removeEventListener('volumechange', handleVolumeChange);
			audio.removeEventListener('emptied', handleEmptied);
		};
	}, []);

	const pause = () => {
		audioRef.current?.pause();
	};

	const resume = async () => {
		const audio = audioRef.current;
		if (!audio || !track) return;
		try {
			await audio.play();
		} catch (error) {
			console.error('Failed to resume audio playback.', error);
		}
	};

	const toggleTrack = async (trackInfo: AudioTrackInfo) => {
		const audio = audioRef.current;
		if (!audio || !trackInfo.src) return;

		const nextTrack = normalizeAudioTrack(trackInfo);
		const isCurrentTrack = track?.key === nextTrack.key;

		setTrack(nextTrack);

		if (isCurrentTrack) {
			if (audio.paused) {
				try {
					await audio.play();
				} catch (error) {
					console.error('Failed to play audio.', error);
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
		} catch (error) {
			console.error('Failed to start audio playback.', error);
		}
	};

	const seek = (time: number) => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(time)) return;
		audio.currentTime = time;
		setCurrentTime(time);
	};

	const setVolume = (nextVolume: number) => {
		const audio = audioRef.current;
		if (!audio) return;
		const normalizedVolume = Math.min(1, Math.max(0, nextVolume));
		audio.volume = normalizedVolume;
		setVolumeState(normalizedVolume);
	};

	const clearTrack = () => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.pause();
		audio.removeAttribute('src');
		audio.load();
		setTrack(null);
		setCurrentTime(0);
		setDuration(0);
		setIsPlaying(false);
	};

	return (
		<AudioPlayerContext.Provider
			value={{
				track,
				isPlaying,
				currentTime,
				duration,
				volume,
				toggleTrack,
				pause,
				resume,
				seek,
				setVolume,
				clearTrack,
			}}>
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
