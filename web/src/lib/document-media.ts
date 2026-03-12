export const AUDIO_DOCUMENT_MAX_DURATION_MS = 30 * 60 * 1000;

export const formatMediaDuration = (ms: number) => {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
			2,
			'0',
		)}:${String(seconds).padStart(2, '0')}`;
	}

	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
		2,
		'0',
	)}`;
};

export const formatLiveMediaDuration = (ms: number) => {
	const safeMs = Math.max(0, ms);
	if (safeMs >= 60 * 1000) {
		return formatMediaDuration(safeMs);
	}

	const totalSeconds = Math.floor(safeMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	const tenths = Math.floor((safeMs % 1000) / 100);

	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
		2,
		'0',
	)}.${tenths}`;
};
