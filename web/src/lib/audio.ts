export const DEFAULT_AUDIO_COVER =
	'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png';

export interface AudioTrackInfo {
	src: string;
	title?: string;
	artist?: string;
	cover?: string;
}

export interface AudioTrack {
	key: string;
	src: string;
	title: string;
	artist: string;
	cover: string;
}

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
});

export const formatAudioTime = (time: number) => {
	if (!Number.isFinite(time) || time < 0) return '0:00';
	const minutes = Math.floor(time / 60);
	const seconds = Math.floor(time % 60);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
