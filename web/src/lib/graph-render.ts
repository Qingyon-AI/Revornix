import type { Edge, GraphResponse, Node, NodeSource } from '@/generated';

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const normalizeNodeSource = (
	source: NodeSource | null | undefined,
): NodeSource | null => {
	if (!source || !Number.isFinite(source.doc_id)) {
		return null;
	}

	return {
		doc_id: source.doc_id,
		doc_title: isNonEmptyString(source.doc_title)
			? source.doc_title.trim()
			: null,
		chunk_id: isNonEmptyString(source.chunk_id)
			? source.chunk_id.trim()
			: null,
	};
};

const normalizeNode = (node: Node | null | undefined): Node | null => {
	if (
		!node ||
		!isNonEmptyString(node.id) ||
		!isNonEmptyString(node.text) ||
		!Number.isFinite(node.degree)
	) {
		return null;
	}

	return {
		id: node.id.trim(),
		text: node.text.trim(),
		degree: node.degree,
		sources: node.sources
			?.map((source) => normalizeNodeSource(source))
			.filter((source): source is NodeSource => Boolean(source)),
	};
};

const normalizeEdge = (
	edge: Edge | null | undefined,
	nodeIds: Set<string>,
): Edge | null => {
	if (!edge) {
		return null;
	}

	const source = isNonEmptyString(edge.src_node) ? edge.src_node.trim() : '';
	const target = isNonEmptyString(edge.tgt_node) ? edge.tgt_node.trim() : '';

	if (!source || !target || source === target) {
		return null;
	}

	if (!nodeIds.has(source) || !nodeIds.has(target)) {
		return null;
	}

	return {
		src_node: source,
		tgt_node: target,
	};
};

export const getRenderableGraphData = (graph?: GraphResponse | null) => {
	const nodes =
		graph?.nodes
			?.map((node) => normalizeNode(node))
			.filter((node): node is Node => Boolean(node)) ?? [];
	const nodeIds = new Set(nodes.map((node) => node.id));
	const edges =
		graph?.edges
			?.map((edge) => normalizeEdge(edge, nodeIds))
			.filter((edge): edge is Edge => Boolean(edge)) ?? [];

	return {
		nodes,
		edges,
		hasRenderableGraph: nodes.length > 0,
	};
};
