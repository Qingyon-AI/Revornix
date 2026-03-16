export const toStableMarkdownSourceKey = (source?: string | null) => {
	if (!source) {
		return undefined;
	}

	try {
		const base =
			typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
		const parsed = new URL(source, base);
		return `${parsed.origin}${parsed.pathname}`;
	} catch {
		return source.split('?')[0]?.split('#')[0] || source;
	}
};
