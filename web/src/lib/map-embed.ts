export type MapEmbedAttrs = {
	query?: string | null;
	lat?: string | null;
	lng?: string | null;
	zoom?: string | number | null;
};

const DEFAULT_MAP_QUERY = 'Shanghai';
const DEFAULT_MAP_ZOOM = 13;

export const normalizeMapZoom = (value?: string | number | null) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return DEFAULT_MAP_ZOOM;
	}
	return Math.min(20, Math.max(1, Math.round(parsed)));
};

export const hasMapEmbedTarget = ({ query, lat, lng }: MapEmbedAttrs) =>
	Boolean(query?.trim()) || Boolean(lat?.trim() && lng?.trim());

export const buildMapEmbedUrl = ({ query, lat, lng, zoom }: MapEmbedAttrs) => {
	const normalizedZoom = normalizeMapZoom(zoom);
	const trimmedQuery = query?.trim();
	const trimmedLat = lat?.trim();
	const trimmedLng = lng?.trim();
	const target =
		trimmedLat && trimmedLng
			? `${trimmedLat},${trimmedLng}`
			: trimmedQuery || DEFAULT_MAP_QUERY;

	const searchParams = new URLSearchParams({
		q: target,
		z: String(normalizedZoom),
		output: 'embed',
	});

	return `https://www.google.com/maps?${searchParams.toString()}`;
};
