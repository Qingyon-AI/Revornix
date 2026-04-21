export const DEFAULT_AUDIO_COVER =
	'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png';

export interface AudioTrackInfo {
	src: string;
	title?: string;
	artist?: string;
	cover?: string;
	scriptUrl?: string;
}

export interface AudioTranscriptSegment {
	speaker?: string | null;
	text: string;
	start?: number | null;
	end?: number | null;
	audioDuration?: number | null;
}

export interface AudioTranscriptPayload {
	version?: number;
	title?: string | null;
	plain_text?: string | null;
	segments?: AudioTranscriptSegment[];
}

export interface AudioTrack {
	key: string;
	src: string;
	title: string;
	artist: string;
	cover: string;
	scriptUrl?: string;
}

const AUDIO_TRANSCRIPT_SPEAKER_LABELS: Record<string, string> = {
	zh_male_dayixiansheng_v2_saturn_bigtts: '黑猫侦探社大义',
	zh_female_mizaitongxue_v2_saturn_bigtts: '黑猫侦探社咪仔',
	zh_male_liufei_v2_saturn_bigtts: '刘飞',
	zh_male_xiaolei_v2_saturn_bigtts: '潇磊',
};

const audioDurationCache = new Map<string, number>();
const audioDurationRequestCache = new Map<string, Promise<number>>();

export const getAudioTrackKey = (src: string) => {
	const normalizedSrc = src.trim();
	if (!normalizedSrc) return '';

	try {
		const base =
			typeof window !== 'undefined' ? window.location.origin : 'https://revornix.local';
		const url = new URL(normalizedSrc, base);
		const resolvedPath = url.searchParams.get('path');
		const ownerId = url.searchParams.get('owner_id');

		if (resolvedPath) {
			return ownerId ? `${resolvedPath}::${ownerId}` : resolvedPath;
		}

		return `${url.origin}${url.pathname}`;
	} catch {
		return normalizedSrc.split('#')[0].split('?')[0];
	}
};

export const normalizeAudioTrack = (track: AudioTrackInfo): AudioTrack => ({
	key: getAudioTrackKey(track.src),
	src: track.src,
	title: track.title?.trim() || 'Unknown Title',
	artist: track.artist?.trim() || 'Unknown Artist',
	cover: track.cover || DEFAULT_AUDIO_COVER,
	scriptUrl: track.scriptUrl,
});

export const getCachedAudioDuration = (key: string) => {
	return audioDurationCache.get(key) ?? 0;
};

export const cacheAudioDuration = (key: string, duration: number) => {
	if (!key || !Number.isFinite(duration) || duration <= 0) {
		return;
	}
	audioDurationCache.set(key, duration);
};

export const resolveAudioDuration = async ({
	key,
	src,
}: Pick<AudioTrack, 'key' | 'src'>): Promise<number> => {
	const cachedDuration = getCachedAudioDuration(key);
	if (cachedDuration > 0) {
		return cachedDuration;
	}

	const inFlightRequest = audioDurationRequestCache.get(key);
	if (inFlightRequest) {
		return inFlightRequest;
	}

	if (typeof window === 'undefined' || !src) {
		return 0;
	}

	const audio = new Audio();
	audio.preload = 'metadata';

	const metadataRequest = new Promise<number>((resolve) => {
		const cleanup = () => {
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
			audio.removeEventListener('durationchange', handleLoadedMetadata);
			audio.removeEventListener('error', handleError);
			audio.src = '';
		};

		const finalize = (nextDuration: number) => {
			cleanup();
			resolve(nextDuration);
		};

		const handleLoadedMetadata = () => {
			const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
			finalize(nextDuration);
		};

		const handleError = () => {
			finalize(0);
		};

		audio.addEventListener('loadedmetadata', handleLoadedMetadata);
		audio.addEventListener('durationchange', handleLoadedMetadata);
		audio.addEventListener('error', handleError);
		audio.src = src;
		audio.load();
	}).then((resolvedDuration) => {
		audioDurationRequestCache.delete(key);
		cacheAudioDuration(key, resolvedDuration);
		return resolvedDuration;
	});

	audioDurationRequestCache.set(key, metadataRequest);
	return metadataRequest;
};

export const formatAudioTime = (time: number) => {
	if (!Number.isFinite(time) || time < 0) return '0:00';
	const minutes = Math.floor(time / 60);
	const seconds = Math.floor(time % 60);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const resolveTranscriptSpeakerLabel = (speaker?: string | null) => {
	if (!speaker?.trim()) {
		return '';
	}

	const normalizedSpeaker = speaker.trim();
	const mappedSpeaker = AUDIO_TRANSCRIPT_SPEAKER_LABELS[normalizedSpeaker];
	if (mappedSpeaker) {
		return mappedSpeaker;
	}

	return normalizedSpeaker
		.replace(/^zh_/i, '')
		.replace(/_v\d+.*$/i, '')
		.split('_')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
};
