const decodeHtmlAttribute = (value: string) =>
	value
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');

const parseHtmlAttributes = (input: string) => {
	const attributes: Record<string, string> = {};
	const pattern = /([a-zA-Z_:][\w:.-]*)="([^"]*)"/g;

	for (const match of input.matchAll(pattern)) {
		const [, key, value] = match;
		attributes[key] = decodeHtmlAttribute(value);
	}

	return attributes;
};

export const findCustomBlockTagStart = (tagName: string) => (src: string) =>
	src.indexOf(`<${tagName}`);

export const extractCustomBlockTag = (src: string, tagName: string) => {
	const pattern = new RegExp(
		`^<${tagName}\\b([^>]*)><\\/${tagName}>(?:\\r?\\n)?`,
	);
	const match = src.match(pattern);
	if (!match) {
		return null;
	}

	return {
		raw: match[0],
		attributes: parseHtmlAttributes(match[1] ?? ''),
	};
};
