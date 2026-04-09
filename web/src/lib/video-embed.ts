export type VideoEmbedProvider = 'youtube' | 'bilibili';

export type ParsedVideoEmbed = {
	provider: VideoEmbedProvider;
	videoId: string;
	url: string;
	embedUrl: string;
	label: string;
};

export const ensureVideoEmbedDefaults = (value: string, provider?: VideoEmbedProvider) => {
	if (!value) {
		return '';
	}

	try {
		const url = new URL(value);
		url.searchParams.set('autoplay', '0');
		if (provider === 'youtube') {
			url.searchParams.set('mute', '0');
		}
		return url.toString();
	} catch {
		return value;
	}
};

const YOUTUBE_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'youtu.be',
]);

const BILIBILI_HOSTS = new Set([
	'bilibili.com',
	'www.bilibili.com',
	'm.bilibili.com',
	'player.bilibili.com',
]);

const normalizeUrl = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}

	return `https://${trimmed}`;
};

const parseYouTubeUrl = (url: URL): ParsedVideoEmbed | null => {
	if (!YOUTUBE_HOSTS.has(url.hostname)) {
		return null;
	}

	let videoId = '';

	if (url.hostname === 'youtu.be') {
		videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
	} else if (url.pathname === '/watch') {
		videoId = url.searchParams.get('v') ?? '';
	} else if (url.pathname.startsWith('/embed/')) {
		videoId = url.pathname.split('/').filter(Boolean)[1] ?? '';
	} else if (url.pathname.startsWith('/shorts/')) {
		videoId = url.pathname.split('/').filter(Boolean)[1] ?? '';
	}

	if (!videoId) {
		return null;
	}

	const embedUrl = ensureVideoEmbedDefaults(
		`https://www.youtube.com/embed/${videoId}`,
		'youtube',
	);

	return {
		provider: 'youtube',
		videoId,
		url: url.toString(),
		embedUrl,
		label: 'YouTube',
	};
};

const parseBilibiliUrl = (url: URL): ParsedVideoEmbed | null => {
	if (!BILIBILI_HOSTS.has(url.hostname)) {
		return null;
	}

	let videoId = '';
	let embedUrl = '';

	if (url.hostname === 'player.bilibili.com' && url.pathname.includes('/player.html')) {
		const bvid = url.searchParams.get('bvid') ?? '';
		const aid = url.searchParams.get('aid') ?? '';
		videoId = bvid || aid;
		embedUrl = ensureVideoEmbedDefaults(url.toString(), 'bilibili');
	} else {
		const match = url.pathname.match(/\/video\/((?:BV[\w]+)|(?:av\d+))/i);
		videoId = match?.[1] ?? '';
		if (videoId) {
			const page = url.searchParams.get('p') ?? '1';
			if (/^av\d+$/i.test(videoId)) {
				embedUrl = ensureVideoEmbedDefaults(
					`https://player.bilibili.com/player.html?aid=${videoId.slice(2)}&page=${page}`,
					'bilibili',
				);
			} else {
				embedUrl = ensureVideoEmbedDefaults(
					`https://player.bilibili.com/player.html?bvid=${videoId}&page=${page}`,
					'bilibili',
				);
			}
		}
	}

	if (!videoId || !embedUrl) {
		return null;
	}

	return {
		provider: 'bilibili',
		videoId,
		url: url.toString(),
		embedUrl,
		label: 'Bilibili',
	};
};

export const parseVideoEmbedUrl = (value: string): ParsedVideoEmbed | null => {
	const normalized = normalizeUrl(value);
	if (!normalized) {
		return null;
	}

	try {
		const url = new URL(normalized);
		return parseYouTubeUrl(url) ?? parseBilibiliUrl(url);
	} catch {
		return null;
	}
};
