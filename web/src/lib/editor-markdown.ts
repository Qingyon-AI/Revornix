const BLOCK_PATTERNS = [
	/<drawing-node\b[^>]*><\/drawing-node>/g,
	/<quick-table\b[^>]*><\/quick-table>/g,
	/<video-embed\b[^>]*><\/video-embed>/g,
	/\\\[\n[\s\S]*?\n\\\]/g,
	/^!\[[^\n]*\]\([^\n]+\)$/gm,
];

const FENCED_CODE_BLOCK_PATTERN = /^(```|~~~)[^\n]*\n[\s\S]*?\n\1[ \t]*$/gm;
const FENCED_CODE_BLOCK_PLACEHOLDER_PREFIX =
	'__REVORNIX_FENCED_CODE_BLOCK__';
const TABLE_SEPARATOR_CELL_PATTERN = /^\s*:?-{3,}:?\s*$/;

const normalizeBlockSpacing = (content: string, pattern: RegExp) => {
	const flags = Array.from(new Set(`${pattern.flags.replace(/g/g, '')}g`.split(''))).join('');
	const wrappedPattern = new RegExp(
		`(?:\\n{0,2})(${pattern.source})(?:\\n{0,2})`,
		flags,
	);

	return content.replace(wrappedPattern, (fullMatch, blockMatch, ...args) => {
		const source = args.at(-1);
		const offset = args.at(-2);
		const start =
			typeof offset === 'number'
				? offset
				: typeof source === 'string'
					? source.indexOf(fullMatch)
					: 0;
		const end = start + fullMatch.length;
		const leadingSpacing = start === 0 ? '' : '\n\n';
		const trailingSpacing =
			typeof source === 'string' && end < source.length ? '\n\n' : '';
		return `${leadingSpacing}${blockMatch}${trailingSpacing}`;
	});
};

const normalizeOutsideFencedCodeBlocks = (
	content: string,
	normalizer: (segment: string) => string,
) => {
	let result = '';
	let lastIndex = 0;

	for (const match of content.matchAll(FENCED_CODE_BLOCK_PATTERN)) {
		const start = match.index ?? 0;
		result += normalizer(content.slice(lastIndex, start));
		result += match[0];
		lastIndex = start + match[0].length;
	}

	result += normalizer(content.slice(lastIndex));
	return result;
};

const normalizeFencedCodeBlocks = (content: string) =>
	content.replace(FENCED_CODE_BLOCK_PATTERN, (block) =>
		block.replace(/\n{2,}(```|~~~)[ \t]*$/g, '\n$1'),
	);

const extractFencedCodeBlocks = (content: string) => {
	const blocks: string[] = [];
	const contentWithPlaceholders = content.replace(
		FENCED_CODE_BLOCK_PATTERN,
		(block) => {
			const placeholder = `${FENCED_CODE_BLOCK_PLACEHOLDER_PREFIX}${blocks.length}__`;
			blocks.push(block);
			return placeholder;
		},
	);

	return {
		blocks,
		content: contentWithPlaceholders,
	};
};

const restoreFencedCodeBlocks = (content: string, blocks: string[]) =>
	blocks.reduce((currentContent, block, index) => {
		const placeholder = `${FENCED_CODE_BLOCK_PLACEHOLDER_PREFIX}${index}__`;
		return currentContent.replace(placeholder, block);
	}, content);

const splitMarkdownTableRow = (line: string) => {
	const trimmed = line.trim();
	const withoutOuterPipes = trimmed
		.replace(/^\|/, '')
		.replace(/\|$/, '');
	const cells: string[] = [];
	let current = '';
	let isInCode = false;

	for (let index = 0; index < withoutOuterPipes.length; index += 1) {
		const char = withoutOuterPipes[index];
		const previousChar = withoutOuterPipes[index - 1];

		if (char === '`' && previousChar !== '\\') {
			isInCode = !isInCode;
		}

		if (char === '|' && previousChar !== '\\' && !isInCode) {
			cells.push(current.trim().replace(/\\\|/g, '|'));
			current = '';
			continue;
		}

		current += char;
	}

	cells.push(current.trim().replace(/\\\|/g, '|'));
	return cells;
};

const isMarkdownTableSeparator = (line: string) => {
	const cells = splitMarkdownTableRow(line);
	return (
		cells.length >= 2 &&
		cells.every((cell) => TABLE_SEPARATOR_CELL_PATTERN.test(cell))
	);
};

const isPotentialMarkdownTableRow = (line: string) => {
	if (!line.trim() || !line.includes('|')) {
		return false;
	}
	return splitMarkdownTableRow(line).length >= 2;
};

const encodeTableContent = (content: string[][]) =>
	encodeURIComponent(JSON.stringify(content));

const normalizeTableRows = (rows: string[][]) => {
	const columnCount = Math.max(...rows.map((row) => row.length), 0);
	return rows.map((row) =>
		Array.from({ length: columnCount }, (_, index) => row[index] ?? ''),
	);
};

const convertMarkdownTablesToQuickTables = (content: string) => {
	const lines = content.split('\n');
	const output: string[] = [];
	let index = 0;

	while (index < lines.length) {
		const headerLine = lines[index];
		const separatorLine = lines[index + 1];

		if (
			separatorLine !== undefined &&
			isPotentialMarkdownTableRow(headerLine) &&
			isMarkdownTableSeparator(separatorLine)
		) {
			const rows = [splitMarkdownTableRow(headerLine)];
			index += 2;

			while (
				index < lines.length &&
				isPotentialMarkdownTableRow(lines[index]) &&
				!isMarkdownTableSeparator(lines[index])
			) {
				rows.push(splitMarkdownTableRow(lines[index]));
				index += 1;
			}

			const normalizedRows = normalizeTableRows(rows);
			output.push(
				`<quick-table data-content="${encodeTableContent(normalizedRows)}"></quick-table>`,
			);
			continue;
		}

		output.push(headerLine);
		index += 1;
	}

	return output.join('\n');
};

export const normalizeEditorMarkdown = (markdown: string) => {
	const withNormalizedCodeBlocks = normalizeFencedCodeBlocks(
		markdown.replace(/\r\n/g, '\n'),
	);
	const { blocks, content } = extractFencedCodeBlocks(withNormalizedCodeBlocks);
	const normalized = content.replace(/[ \t]+\n/g, '\n');
	const withTables = convertMarkdownTablesToQuickTables(normalized);
	const fencedCodeBlockPlaceholderPattern = new RegExp(
		`^${FENCED_CODE_BLOCK_PLACEHOLDER_PREFIX}\\d+__$`,
		'gm',
	);
	const withNormalizedBlocks = [
		...BLOCK_PATTERNS,
		fencedCodeBlockPlaceholderPattern,
	].reduce((currentContent, pattern) => {
		return normalizeBlockSpacing(currentContent, pattern);
	}, withTables);
	const collapsed = withNormalizedBlocks.replace(/\n{3,}/g, '\n\n').trimEnd();

	return restoreFencedCodeBlocks(collapsed, blocks);
};
