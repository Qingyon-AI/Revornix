export type MapEmbedProvider = 'google' | 'amap';

export type MapEmbedAttrs = {
	provider?: string | null;
	query?: string | null;
	lat?: string | null;
	lng?: string | null;
	zoom?: string | number | null;
};

const DEFAULT_MAP_QUERY = 'Shanghai';
const DEFAULT_MAP_ZOOM = 13;
export const DEFAULT_MAP_PROVIDER: MapEmbedProvider = 'google';
export const DEFAULT_NEW_MAP_PROVIDER: MapEmbedProvider = 'amap';

export const normalizeMapProvider = (
	value?: string | null,
): MapEmbedProvider =>
	value === 'amap' || value === 'google' ? value : DEFAULT_MAP_PROVIDER;

export const normalizeMapZoom = (value?: string | number | null) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return DEFAULT_MAP_ZOOM;
	}
	return Math.min(20, Math.max(1, Math.round(parsed)));
};

export const hasMapEmbedTarget = ({ query, lat, lng }: MapEmbedAttrs) =>
	Boolean(query?.trim()) || Boolean(lat?.trim() && lng?.trim());

export const buildMapEmbedUrl = ({
	provider,
	query,
	lat,
	lng,
	zoom,
}: MapEmbedAttrs) => {
	const normalizedProvider = normalizeMapProvider(provider);
	const normalizedZoom = normalizeMapZoom(zoom);
	const trimmedQuery = query?.trim();
	const trimmedLat = lat?.trim();
	const trimmedLng = lng?.trim();
	const target =
		trimmedLat && trimmedLng
			? `${trimmedLat},${trimmedLng}`
			: trimmedQuery || DEFAULT_MAP_QUERY;

	if (normalizedProvider === 'amap') {
		if (trimmedLat && trimmedLng) {
			const searchParams = new URLSearchParams({
				position: `${trimmedLng},${trimmedLat}`,
				name: trimmedQuery || target,
				zoom: String(normalizedZoom),
				src: 'revornix',
				callnative: '0',
			});
			return `https://uri.amap.com/marker?${searchParams.toString()}`;
		}

		const searchParams = new URLSearchParams({
			keyword: target,
			src: 'revornix',
			callnative: '0',
		});
		return `https://uri.amap.com/search?${searchParams.toString()}`;
	}

	const searchParams = new URLSearchParams({
		q: target,
		z: String(normalizedZoom),
		output: 'embed',
	});
	return `https://www.google.com/maps?${searchParams.toString()}`;
};
