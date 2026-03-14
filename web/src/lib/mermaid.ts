const MERMAID_LINE_BREAK_RE = /<br\s*\/?>/gi;
const MERMAID_HTML_TAG_RE = /<\/?[A-Za-z][^>\n]*>/g;
const MERMAID_GRAPH_RE = /^(\s*)graph(\s+(?:TB|TD|BT|RL|LR)\b)/i;
const MERMAID_RECT_NODE_RE = /(\b[A-Za-z_][\w-]*)\[([^\[\]\n"]+)\]/g;
const MERMAID_SKIP_PREFIXES = [
	'%%',
	'subgraph ',
	'classDef ',
	'class ',
	'style ',
	'linkStyle ',
	'click ',
	'accTitle:',
	'accDescr:',
	'direction ',
];

const shouldSkipMermaidLine = (line: string) => {
	return line === 'end' || MERMAID_SKIP_PREFIXES.some((prefix) => line.startsWith(prefix));
};

const normalizeMermaidLabel = (label: string) => {
	return label
		.replace(MERMAID_LINE_BREAK_RE, ' ')
		.replace(MERMAID_HTML_TAG_RE, ' ')
		.replaceAll('&nbsp;', ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replaceAll('\\', '\\\\')
		.replaceAll('"', '\\"');
};

export const normalizeMermaidDiagram = (diagram: string) => {
	let normalized = diagram.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

	normalized = normalized.replace(MERMAID_LINE_BREAK_RE, ' ');
	normalized = normalized.replaceAll('&nbsp;', ' ');
	normalized = normalized.replace(MERMAID_GRAPH_RE, '$1flowchart$2');

	return normalized
		.split('\n')
		.map((line) => {
			const trimmed = line.trimStart();
			if (shouldSkipMermaidLine(trimmed)) {
				return line.trimEnd();
			}

			return line.replace(MERMAID_RECT_NODE_RE, (_, id: string, label: string) => {
				return `${id}["${normalizeMermaidLabel(label)}"]`;
			}).trimEnd();
		})
		.join('\n')
		.trim();
};
