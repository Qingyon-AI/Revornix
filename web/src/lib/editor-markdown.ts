const BLOCK_PATTERNS = [
	/<drawing-node\b[^>]*><\/drawing-node>/g,
	/<quick-table\b[^>]*><\/quick-table>/g,
	/<video-embed\b[^>]*><\/video-embed>/g,
	/\\\[\n[\s\S]*?\n\\\]/g,
	/^!\[[^\n]*\]\([^\n]+\)$/gm,
];

const normalizeBlockSpacing = (content: string, pattern: RegExp) => {
	const flags = Array.from(new Set(`${pattern.flags.replace(/g/g, '')}g`.split(''))).join('');
	const wrappedPattern = new RegExp(
		`(?:\\n{0,2})(${pattern.source})(?:\\n{0,2})`,
		flags,
	);

	return content.replace(wrappedPattern, (fullMatch, blockMatch, offset, source) => {
		const start = typeof offset === 'number' ? offset : source.indexOf(fullMatch);
		const end = start + fullMatch.length;
		const leadingSpacing = start === 0 ? '' : '\n\n';
		const trailingSpacing = end >= source.length ? '' : '\n\n';
		return `${leadingSpacing}${blockMatch}${trailingSpacing}`;
	});
};

export const normalizeEditorMarkdown = (markdown: string) => {
	const normalized = markdown
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+\n/g, '\n');

	const withNormalizedBlocks = BLOCK_PATTERNS.reduce((content, pattern) => {
		return normalizeBlockSpacing(content, pattern);
	}, normalized);

	return withNormalizedBlocks.replace(/\n{3,}/g, '\n\n').trimEnd();
};
