'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as d3 from 'd3';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import NodeSourceDialog, { type GraphNodeWithSource } from './node-source-dialog';

export type GraphCanvasNode = GraphNodeWithSource & {
	group?: string;
	degree?: number;
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
	renderRadius?: number;
};

export type GraphCanvasLink = {
	source: string | GraphCanvasNode;
	target: string | GraphCanvasNode;
};

type SimulationNode = GraphCanvasNode & {
	group: string;
	renderRadius: number;
};

type SimulationLink = {
	source: string | SimulationNode;
	target: string | SimulationNode;
};

type EntityGraphCanvasProps = {
	nodes: GraphCanvasNode[];
	edges: GraphCanvasLink[];
	className?: string;
	statsText?: string;
	showSearch?: boolean;
};

const ZOOM_MIN = 0.68;
const ZOOM_MAX = 2.4;
const LARGE_GRAPH_NODE_THRESHOLD = 80;
const HUGE_GRAPH_NODE_THRESHOLD = 160;
const HOVER_HIGHLIGHT_NODE_THRESHOLD = 90;

const isNode = (
	value: string | GraphCanvasNode | SimulationNode
): value is GraphCanvasNode | SimulationNode => typeof value !== 'string';

const truncateLabel = (label: string, limit: number) => {
	if (label.length <= limit) {
		return label;
	}
	return `${label.slice(0, Math.max(0, limit - 1))}…`;
};

const getGraphTheme = (theme: string) => {
	if (theme === 'dark') {
		return {
			nodeStart: '#164e63',
			nodeEnd: '#67e8f9',
			nodeStroke: '#e2e8f0',
			nodeMutedStroke: '#0f172a',
			link: '#334155',
			linkActive: '#7dd3fc',
			labelText: '#f8fafc',
			labelFill: 'rgba(15, 23, 42, 0.82)',
			labelStroke: 'rgba(148, 163, 184, 0.18)',
		};
	}

	return {
		nodeStart: '#dbeafe',
		nodeEnd: '#0f766e',
		nodeStroke: '#f8fafc',
		nodeMutedStroke: '#cbd5e1',
		link: '#cbd5e1',
		linkActive: '#0f766e',
		labelText: '#0f172a',
		labelFill: 'rgba(255, 255, 255, 0.94)',
		labelStroke: 'rgba(148, 163, 184, 0.48)',
	};
};

const createBoundaryForce = (
	width: number,
	height: number,
	padding: number,
	strength: number
) => {
	let simulationNodes: SimulationNode[] = [];

	const force = (alpha: number) => {
		for (const node of simulationNodes) {
			if (node.x == null || node.y == null) {
				continue;
			}

			const radius = node.renderRadius ?? 12;
			const minX = padding + radius;
			const maxX = width - padding - radius;
			const minY = padding + radius;
			const maxY = height - padding - radius;

			if (node.x < minX) {
				node.vx = (node.vx ?? 0) + (minX - node.x) * strength * alpha;
			} else if (node.x > maxX) {
				node.vx = (node.vx ?? 0) - (node.x - maxX) * strength * alpha;
			}

			if (node.y < minY) {
				node.vy = (node.vy ?? 0) + (minY - node.y) * strength * alpha;
			} else if (node.y > maxY) {
				node.vy = (node.vy ?? 0) - (node.y - maxY) * strength * alpha;
			}
		}
	};

	force.initialize = (nodes: SimulationNode[]) => {
		simulationNodes = nodes;
	};

	return force;
};

const seedNodePositions = (
	nodes: SimulationNode[],
	width: number,
	height: number
) => {
	const centerX = width / 2;
	const centerY = height / 2;
	const minDimension = Math.min(width, height);
	const spread =
		nodes.length <= 2
			? minDimension * 0.14
			: nodes.length <= 8
				? minDimension * 0.24
				: nodes.length <= 24
					? minDimension * 0.31
					: minDimension * 0.36;
	const goldenAngle = Math.PI * (3 - Math.sqrt(5));
	const rankedNodes = [...nodes].sort(
		(left, right) => (right.degree ?? 1) - (left.degree ?? 1)
	);

	rankedNodes.forEach((node, index) => {
		if (index === 0) {
			node.x = centerX;
			node.y = centerY;
			return;
		}

		const ratio = Math.sqrt(index / Math.max(rankedNodes.length - 1, 1));
		const distance = Math.max(24, ratio * spread);
		const angle = index * goldenAngle;
		node.x = centerX + Math.cos(angle) * distance;
		node.y = centerY + Math.sin(angle) * distance;
	});
};

const EntityGraphCanvas = ({
	nodes: inputNodes,
	edges: inputEdges,
	className,
	statsText,
	showSearch = true,
}: EntityGraphCanvasProps) => {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const selectedNodeIdRef = useRef<string | null>(null);
	const highlightNodeRef = useRef<(nodeId: string | null) => void>(() => {});
	const searchHighlightRef = useRef<
		(matchNodeIds: string[], activeNodeId: string | null) => void
	>(() => {});
	const focusNodeRef = useRef<(nodeId: string | null) => void>(() => {});
	const zoomTransformRef = useRef(d3.zoomIdentity);
	const lastCenteredSearchNodeIdRef = useRef<string | null>(null);
	const [selectedNode, setSelectedNode] = useState<GraphCanvasNode | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [activeSearchIndex, setActiveSearchIndex] = useState(0);
	const { resolvedTheme } = useTheme();
	const normalizedSearchQuery = showSearch ? searchQuery.trim().toLowerCase() : '';
	const searchMatches = normalizedSearchQuery
		? [...inputNodes]
				.filter((node) => node.label.toLowerCase().includes(normalizedSearchQuery))
				.sort(
					(left, right) =>
						(right.degree ?? 0) - (left.degree ?? 0) ||
						left.label.localeCompare(right.label)
				)
		: [];
	const activeSearchMatch =
		searchMatches.length === 0
			? null
			: searchMatches[Math.min(activeSearchIndex, searchMatches.length - 1)] ?? null;

	useEffect(() => {
		if (searchMatches.length === 0) {
			if (activeSearchIndex !== 0) {
				setActiveSearchIndex(0);
			}
			return;
		}
		if (activeSearchIndex >= searchMatches.length) {
			setActiveSearchIndex(0);
		}
	}, [activeSearchIndex, searchMatches.length]);

	useEffect(() => {
		searchHighlightRef.current(
			searchMatches.map((node) => node.id),
			activeSearchMatch?.id ?? null
		);
		if (activeSearchMatch?.id) {
			if (lastCenteredSearchNodeIdRef.current !== activeSearchMatch.id) {
				lastCenteredSearchNodeIdRef.current = activeSearchMatch.id;
				focusNodeRef.current(activeSearchMatch.id);
			}
			return;
		}
		lastCenteredSearchNodeIdRef.current = null;
	}, [activeSearchMatch?.id, searchMatches]);

	const cycleSearchMatch = (direction: 1 | -1) => {
		if (searchMatches.length === 0) {
			return;
		}
		setActiveSearchIndex((currentIndex) => {
			const safeIndex = Math.min(currentIndex, searchMatches.length - 1);
			return (safeIndex + direction + searchMatches.length) % searchMatches.length;
		});
	};

	useEffect(() => {
		const svgElement = svgRef.current;
		if (!svgElement) {
			return;
		}

		const nodes: SimulationNode[] = inputNodes.map((node) => ({
			...node,
			group: node.group ?? 'entity',
			renderRadius: 12,
		}));
		const edges: SimulationLink[] = inputEdges.map((edge) => ({
			source: isNode(edge.source) ? edge.source.id : edge.source,
			target: isNode(edge.target) ? edge.target.id : edge.target,
		}));

		if (nodes.length === 0) {
			d3.select(svgElement).selectAll('*').remove();
			return;
		}

		const degreeExtent = d3.extent(nodes, (node) => node.degree ?? 1) as [
			number,
			number
		];
		const nodeCount = nodes.length;
		const nodeRadiusRange =
			nodeCount <= 10 ? [11, 20] : nodeCount <= 28 ? [9, 17] : [8, 14];
		const radiusScale = d3
			.scaleLinear()
			.domain(
				degreeExtent[0] === degreeExtent[1]
					? [degreeExtent[0], degreeExtent[0] + 1]
					: degreeExtent
			)
			.range(nodeRadiusRange);
		nodes.forEach((node) => {
			node.renderRadius = radiusScale(node.degree ?? 1);
		});

		const graphTheme = getGraphTheme(resolvedTheme ?? 'light');
		const fillScale = d3
			.scaleLinear<string>()
			.domain(
				degreeExtent[0] === degreeExtent[1]
					? [degreeExtent[0], degreeExtent[0] + 1]
					: degreeExtent
			)
			.range([graphTheme.nodeStart, graphTheme.nodeEnd])
			.interpolate(d3.interpolateLab);

			const resize = () => {
				const parent = svgElement.parentElement;
				const width = parent?.clientWidth || 880;
				const height = parent?.clientHeight || 520;
				const minDimension = Math.min(width, height);
				const isLargeGraph = nodeCount >= LARGE_GRAPH_NODE_THRESHOLD;
				const isHugeGraph = nodeCount >= HUGE_GRAPH_NODE_THRESHOLD;
				const enableHoverHighlight = nodeCount <= HOVER_HIGHLIGHT_NODE_THRESHOLD;
				const boundaryPadding = nodeCount <= 10 ? 76 : isHugeGraph ? 36 : 52;
				const baseLinkDistance =
					nodeCount <= 4
						? minDimension * 0.24
						: nodeCount <= 12
							? 114
							: nodeCount <= 30
								? 92
								: nodeCount <= 120
									? 72
									: 60;
				const chargeStrength =
					nodeCount <= 6
						? -280
						: nodeCount <= 20
							? -200
							: nodeCount <= 80
								? -135
								: nodeCount <= 160
									? -110
									: -88;
				const defaultVisibleLabelCount =
					nodeCount <= 14
						? nodeCount
						: nodeCount <= 30
							? 10
							: nodeCount <= LARGE_GRAPH_NODE_THRESHOLD
								? Math.min(8, Math.max(6, Math.round(Math.sqrt(nodeCount))))
								: 0;
				const maxFocusedLabelCount = isHugeGraph ? 14 : isLargeGraph ? 18 : 24;
				const labelCharLimit = nodeCount > 120 ? 14 : nodeCount > 30 ? 16 : 20;
				const simulationAlphaDecay = isHugeGraph ? 0.16 : isLargeGraph ? 0.1 : 0.06;
				const simulationAlphaMin = isHugeGraph ? 0.02 : isLargeGraph ? 0.012 : 0.001;
				const simulationVelocityDecay = isHugeGraph ? 0.5 : isLargeGraph ? 0.42 : 0.34;
				const centerStrength = nodeCount <= 12 ? 0.06 : isHugeGraph ? 0.028 : isLargeGraph ? 0.034 : 0.04;
				const collisionPadding = isHugeGraph ? 8 : isLargeGraph ? 10 : 12;
				const baseVisibleLabelIds = new Set(
					[...nodes]
						.sort((left, right) => (right.degree ?? 1) - (left.degree ?? 1))
						.slice(0, defaultVisibleLabelCount)
						.map((node) => node.id)
				);
				const adjacencyMap = new Map<string, Set<string>>();
				nodes.forEach((node) => {
					adjacencyMap.set(node.id, new Set());
				});
				edges.forEach((edge) => {
					const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
					const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
					adjacencyMap.get(sourceId)?.add(targetId);
					adjacencyMap.get(targetId)?.add(sourceId);
				});

				d3.select(svgElement)
					.attr('width', width)
					.attr('height', height)
					.attr('viewBox', [0, 0, width, height])
					.attr('style', 'width: 100%; height: 100%;');

				seedNodePositions(nodes, width, height);

				const svg = d3.select(svgElement);
				svg.selectAll('*').remove();
			svg.on('click', (event) => {
				if (event.target === svgElement) {
					selectedNodeIdRef.current = null;
					setSelectedNode(null);
					applyHighlight(null);
				}
			});

				const graphRoot = svg.append('g').attr('class', 'graph-root');

				const zoom = d3
					.zoom<SVGSVGElement, unknown>()
					.extent([
						[0, 0],
						[width, height],
					])
					.translateExtent([
						[-width * 1.35, -height * 1.35],
						[width * 2.35, height * 2.35],
					])
					.scaleExtent([ZOOM_MIN, ZOOM_MAX + 0.5])
					.on('zoom', (event) => {
						zoomTransformRef.current = event.transform;
						graphRoot.attr('transform', event.transform.toString());
					});

				svg.style('cursor', 'grab').style('touch-action', 'none');
				svg.call(zoom).on('dblclick.zoom', null);
				const preventWheelScroll = (event: WheelEvent) => {
					event.preventDefault();
				};
				svgElement.addEventListener('wheel', preventWheelScroll, {
					passive: false,
				});

					const chargeForce = d3.forceManyBody<SimulationNode>().strength(chargeStrength);
					if (isLargeGraph) {
						chargeForce.distanceMax(Math.max(160, minDimension * 0.55));
					}
					const dragActivationDistance = 3;
					const dragAlphaTarget = isHugeGraph ? 0.04 : isLargeGraph ? 0.06 : 0.1;
					let hasDraggedNode = false;
					let dragStartPointer: [number, number] | null = null;
					let dragPointerOffset: { x: number; y: number } | null = null;

					const simulation = d3
					.forceSimulation<SimulationNode, SimulationLink>(nodes)
					.force('center', d3.forceCenter(width / 2, height / 2))
					.force('charge', chargeForce)
					.force(
						'link',
						d3
							.forceLink<SimulationNode, SimulationLink>(edges)
							.id((node) => node.id)
						.distance((link) => {
							const sourceDegree = isNode(link.source)
								? link.source.degree ?? 1
								: 1;
							const targetDegree = isNode(link.target)
								? link.target.degree ?? 1
								: 1;
								return (
									baseLinkDistance +
									Math.min(30, (sourceDegree + targetDegree) * 1.8)
								);
							})
							.strength(isHugeGraph ? 0.16 : isLargeGraph ? 0.22 : 0.28)
					)
					.force(
						'collide',
						d3
							.forceCollide<SimulationNode>()
							.radius((node) => node.renderRadius + collisionPadding)
							.iterations(nodeCount > 40 && !isHugeGraph ? 2 : 1)
					)
					.force('x', d3.forceX(width / 2).strength(centerStrength))
					.force('y', d3.forceY(height / 2).strength(centerStrength))
					.force(
						'boundary',
						createBoundaryForce(width, height, boundaryPadding, 0.22)
					)
					.alpha(1)
					.alphaDecay(simulationAlphaDecay)
					.alphaMin(simulationAlphaMin)
					.velocityDecay(simulationVelocityDecay);

			const linkElements = graphRoot
				.append('g')
				.attr('fill', 'none')
				.selectAll('line')
				.data(edges)
				.join('line')
				.attr('stroke', graphTheme.link)
				.attr('stroke-linecap', 'round')
				.attr('stroke-opacity', 0.38)
				.attr('stroke-width', 1.15);

					const nodeElements = graphRoot
						.append('g')
						.selectAll<SVGCircleElement, SimulationNode>('circle')
						.data(nodes)
					.join('circle')
					.attr('r', (node) => node.renderRadius)
						.attr('fill', (node) => fillScale(node.degree ?? 1))
						.attr('stroke', graphTheme.nodeStroke)
						.attr('stroke-width', 1.8)
						.style('cursor', 'pointer')
						.on('pointerdown', (event) => {
							event.stopPropagation();
						})
						.on('mouseenter', (_event, node) => {
							if (enableHoverHighlight && selectedNodeIdRef.current == null) {
								applyHighlight(node);
							}
					})
					.on('mouseleave', () => {
						if (enableHoverHighlight && selectedNodeIdRef.current == null) {
							applyHighlight(null);
						}
					})
					.on('click', (event, node) => {
					event.stopPropagation();
					selectedNodeIdRef.current = node.id;
					setSelectedNode(node);
					applyHighlight(node);
				})
						.call(
							d3
									.drag<SVGCircleElement, SimulationNode>()
									.container(() => svgElement)
									.on('start', (event) => {
										event.sourceEvent?.stopPropagation?.();
										hasDraggedNode = false;
										dragStartPointer = [event.x, event.y];
										const radius = event.subject.renderRadius ?? 12;
										const pointerPosition = getPointerGraphPosition(
											event.sourceEvent,
											radius
										);
										dragPointerOffset =
											pointerPosition == null
												? { x: 0, y: 0 }
												: {
														x:
															(event.subject.x ?? pointerPosition.graphX) -
															pointerPosition.graphX,
														y:
															(event.subject.y ?? pointerPosition.graphY) -
															pointerPosition.graphY,
													};
										svg.style('cursor', 'grabbing');
										event.subject.fx = event.subject.x;
										event.subject.fy = event.subject.y;
										applyHighlight(event.subject);
									})
									.on('drag', (event) => {
										if (!hasDraggedNode && dragStartPointer != null) {
											const movedDistance = Math.hypot(
												event.x - dragStartPointer[0],
												event.y - dragStartPointer[1]
											);
											if (movedDistance < dragActivationDistance) {
												return;
											}
											if (movedDistance >= dragActivationDistance) {
												hasDraggedNode = true;
												simulation.alphaTarget(dragAlphaTarget).restart();
											}
										}
										const radius = event.subject.renderRadius ?? 12;
										const pointerPosition = getPointerGraphPosition(
											event.sourceEvent,
											radius
										);
										if (!pointerPosition) {
											return;
										}
										event.subject.fx =
											pointerPosition.graphX + (dragPointerOffset?.x ?? 0);
										event.subject.fy =
											pointerPosition.graphY + (dragPointerOffset?.y ?? 0);
										event.subject.x = event.subject.fx;
										event.subject.y = event.subject.fy;
										scheduleRender();
									})
									.on('end', (event) => {
										if (!event.active && hasDraggedNode) {
											simulation.alphaTarget(0);
										}
										hasDraggedNode = false;
										dragStartPointer = null;
										dragPointerOffset = null;
										svg.style('cursor', 'grab');
										event.subject.fx = null;
										event.subject.fy = null;
										if (selectedNodeIdRef.current == null) {
											applyHighlight(null);
										}
									})
						);
				if (!isLargeGraph) {
					nodeElements.style(
						'filter',
						'drop-shadow(0 10px 18px rgba(15, 23, 42, 0.12))'
					);
				}

					const labelLayer = graphRoot.append('g').attr('class', 'graph-labels');
					let labelSelection = labelLayer.selectAll<SVGGElement, SimulationNode>('g.graph-label');

						const clamp = (value: number, min: number, max: number) =>
							Math.max(min, Math.min(max, value));
						const getPointerClientPosition = (sourceEvent: unknown) => {
							if (
								sourceEvent &&
								typeof sourceEvent === 'object' &&
								'clientX' in sourceEvent &&
								'clientY' in sourceEvent &&
								typeof sourceEvent.clientX === 'number' &&
								typeof sourceEvent.clientY === 'number'
							) {
								return {
									x: sourceEvent.clientX,
									y: sourceEvent.clientY,
								};
							}
							if (
								sourceEvent &&
								typeof sourceEvent === 'object' &&
								'touches' in sourceEvent &&
								Array.isArray(sourceEvent.touches) &&
								sourceEvent.touches.length > 0
							) {
								const touch = sourceEvent.touches[0];
								return {
									x: touch.clientX,
									y: touch.clientY,
								};
							}
							if (
								sourceEvent &&
								typeof sourceEvent === 'object' &&
								'changedTouches' in sourceEvent &&
								Array.isArray(sourceEvent.changedTouches) &&
								sourceEvent.changedTouches.length > 0
							) {
								const touch = sourceEvent.changedTouches[0];
								return {
									x: touch.clientX,
									y: touch.clientY,
								};
							}
							return null;
						};
						const getPointerGraphPosition = (sourceEvent: unknown, radius: number) => {
							const clientPosition = getPointerClientPosition(sourceEvent);
							if (!clientPosition) {
								return null;
							}
							const rect = svgElement.getBoundingClientRect();
							const localX = clientPosition.x - rect.left;
							const localY = clientPosition.y - rect.top;
							const clampedLocalX = clamp(localX, radius, rect.width - radius);
							const clampedLocalY = clamp(localY, radius, rect.height - radius);
							const [graphX, graphY] = zoomTransformRef.current.invert([
								clampedLocalX,
								clampedLocalY,
							]);
							return {
								graphX,
								graphY,
								isOutside:
									clampedLocalX !== localX || clampedLocalY !== localY,
							};
						};
						const updateLabelPositions = () => {
						labelSelection.attr('transform', (node) => {
							const x = (node.x ?? width / 2) + (node.renderRadius ?? 12) + 8;
							const y = node.y ?? height / 2;
							return `translate(${x}, ${y})`;
						});
					};

					const syncVisibleLabels = (labelNodes: SimulationNode[]) => {
						labelSelection = labelLayer
							.selectAll<SVGGElement, SimulationNode>('g.graph-label')
						.data(labelNodes, (node) => node.id)
						.join(
							(enter) => {
								const group = enter
									.append('g')
									.attr('class', 'graph-label')
									.style('pointer-events', 'none');
								group
									.append('rect')
									.attr('rx', 999)
									.attr('ry', 999)
									.attr('fill', graphTheme.labelFill)
									.attr('stroke', graphTheme.labelStroke)
									.attr('stroke-width', 1);
								group.append('text');
								return group;
							},
							(update) => update,
							(exit) => exit.remove()
						);

					labelSelection
						.select<SVGTextElement>('text')
						.text((node) => truncateLabel(node.label, labelCharLimit))
						.attr('fill', graphTheme.labelText)
						.attr('font-size', nodeCount > 30 ? 10 : 11)
						.attr('font-weight', 600)
						.attr('dominant-baseline', 'middle');

					labelSelection.each(function () {
						const labelGroup = d3.select(this);
						const textNode = labelGroup.select('text').node() as SVGTextElement | null;
						if (!textNode) {
							return;
						}
						const bbox = textNode.getBBox();
							labelGroup
								.select('rect')
								.attr('x', bbox.x - 6)
								.attr('y', bbox.y - 3)
								.attr('width', bbox.width + 12)
								.attr('height', bbox.height + 6);
						});
						updateLabelPositions();
					};

				const getFocusedLabelNodes = (
					focusNode: SimulationNode,
					connectedIds: Set<string>
				) => {
					const focusNeighbors = nodes
						.filter((node) => connectedIds.has(node.id) && node.id !== focusNode.id)
						.sort((left, right) => (right.degree ?? 1) - (left.degree ?? 1))
						.slice(0, Math.max(0, maxFocusedLabelCount - 1));
					return [focusNode, ...focusNeighbors];
				};

					const baseLabelNodes =
						baseVisibleLabelIds.size === 0
							? []
							: nodes.filter((node) => baseVisibleLabelIds.has(node.id));
					let searchMatchedNodeIds = new Set<string>();
					let activeSearchNodeId: string | null = null;

					const getSearchLabelNodes = () => {
						if (searchMatchedNodeIds.size === 0) {
							return baseLabelNodes;
						}
						const rankedMatches = nodes
							.filter((node) => searchMatchedNodeIds.has(node.id))
							.sort((left, right) => {
								if (left.id === activeSearchNodeId) {
									return -1;
								}
								if (right.id === activeSearchNodeId) {
									return 1;
								}
								return (right.degree ?? 1) - (left.degree ?? 1);
							})
							.slice(0, maxFocusedLabelCount);
						if (
							activeSearchNodeId != null &&
							rankedMatches.every((node) => node.id !== activeSearchNodeId)
						) {
							const activeNode =
								nodes.find((node) => node.id === activeSearchNodeId) ?? null;
							if (activeNode != null) {
								return [activeNode, ...rankedMatches].slice(0, maxFocusedLabelCount);
							}
						}
						return rankedMatches;
					};

					const applyHighlight = (focusNode: GraphCanvasNode | null) => {
						if (focusNode == null) {
							if (searchMatchedNodeIds.size > 0) {
								nodeElements
									.attr('fill-opacity', (node) =>
										searchMatchedNodeIds.has(node.id) ? 1 : 0.18
									)
									.attr('stroke', (node) =>
										node.id === activeSearchNodeId
											? graphTheme.linkActive
											: searchMatchedNodeIds.has(node.id)
												? graphTheme.nodeStroke
												: graphTheme.nodeMutedStroke
									)
									.attr('stroke-width', (node) =>
										node.id === activeSearchNodeId
											? 3
											: searchMatchedNodeIds.has(node.id)
												? 2.1
												: 1.2
									);
								linkElements
									.attr('stroke', (link) => {
										const sourceId = isNode(link.source) ? link.source.id : link.source;
										const targetId = isNode(link.target) ? link.target.id : link.target;
										if (
											sourceId === activeSearchNodeId ||
											targetId === activeSearchNodeId
										) {
											return graphTheme.linkActive;
										}
										return searchMatchedNodeIds.has(sourceId) &&
											searchMatchedNodeIds.has(targetId)
											? graphTheme.nodeStroke
											: graphTheme.link;
									})
									.attr('stroke-opacity', (link) => {
										const sourceId = isNode(link.source) ? link.source.id : link.source;
										const targetId = isNode(link.target) ? link.target.id : link.target;
										if (
											sourceId === activeSearchNodeId ||
											targetId === activeSearchNodeId
										) {
											return 0.78;
										}
										return searchMatchedNodeIds.has(sourceId) &&
											searchMatchedNodeIds.has(targetId)
											? 0.26
											: 0.05;
									})
									.attr('stroke-width', (link) => {
										const sourceId = isNode(link.source) ? link.source.id : link.source;
										const targetId = isNode(link.target) ? link.target.id : link.target;
										return sourceId === activeSearchNodeId ||
											targetId === activeSearchNodeId
											? 1.8
											: 1;
									});
								syncVisibleLabels(getSearchLabelNodes());
								return;
							}
							nodeElements
								.attr('fill-opacity', 0.96)
								.attr('stroke', graphTheme.nodeStroke)
								.attr('stroke-width', 1.8);
							linkElements
								.attr('stroke', graphTheme.link)
								.attr('stroke-opacity', 0.38)
							.attr('stroke-width', 1.15);
						syncVisibleLabels(baseLabelNodes);
						return;
					}

					const connectedIds = new Set<string>([
						focusNode.id,
						...(adjacencyMap.get(focusNode.id) ?? []),
					]);

					nodeElements
						.attr('fill-opacity', (node) => (connectedIds.has(node.id) ? 1 : 0.2))
					.attr('stroke', (node) =>
						node.id === focusNode.id
							? graphTheme.linkActive
							: connectedIds.has(node.id)
								? graphTheme.nodeStroke
								: graphTheme.nodeMutedStroke
					)
					.attr('stroke-width', (node) => (node.id === focusNode.id ? 3 : 1.6));

				linkElements
					.attr('stroke', (link) => {
						const sourceId = isNode(link.source) ? link.source.id : link.source;
						const targetId = isNode(link.target) ? link.target.id : link.target;
						return sourceId === focusNode.id || targetId === focusNode.id
							? graphTheme.linkActive
							: graphTheme.link;
					})
					.attr('stroke-opacity', (link) => {
						const sourceId = isNode(link.source) ? link.source.id : link.source;
						const targetId = isNode(link.target) ? link.target.id : link.target;
						return sourceId === focusNode.id || targetId === focusNode.id
							? 0.82
							: 0.08;
					})
						.attr('stroke-width', (link) => {
							const sourceId = isNode(link.source) ? link.source.id : link.source;
							const targetId = isNode(link.target) ? link.target.id : link.target;
							return sourceId === focusNode.id || targetId === focusNode.id
								? 2
								: 1;
						});

					const simulationFocusNode =
						nodes.find((node) => node.id === focusNode.id) ?? null;
						syncVisibleLabels(
							simulationFocusNode == null
								? baseLabelNodes
								: getFocusedLabelNodes(simulationFocusNode, connectedIds)
						);
					};
					searchHighlightRef.current = (matchNodeIds, nextActiveNodeId) => {
						searchMatchedNodeIds = new Set(matchNodeIds);
						activeSearchNodeId =
							nextActiveNodeId != null && searchMatchedNodeIds.has(nextActiveNodeId)
								? nextActiveNodeId
								: matchNodeIds[0] ?? null;
						applyHighlight(null);
					};
					highlightNodeRef.current = (nodeId: string | null) => {
						const focusNode =
							nodeId == null ? null : nodes.find((node) => node.id === nodeId) ?? null;
						applyHighlight(focusNode);
					};

					const fitGraph = (duration: number) => {
				if (nodes.length === 0) {
					return;
				}
				let minX = Number.POSITIVE_INFINITY;
				let maxX = Number.NEGATIVE_INFINITY;
				let minY = Number.POSITIVE_INFINITY;
				let maxY = Number.NEGATIVE_INFINITY;

				for (const node of nodes) {
					const x = node.x ?? width / 2;
					const y = node.y ?? height / 2;
					const radius = node.renderRadius ?? 12;
					const labelAllowance = baseVisibleLabelIds.has(node.id)
						? Math.min(120, truncateLabel(node.label, labelCharLimit).length * 8 + 28)
						: 0;
					minX = Math.min(minX, x - radius - 16);
					maxX = Math.max(maxX, x + radius + labelAllowance);
					minY = Math.min(minY, y - radius - 16);
					maxY = Math.max(maxY, y + radius + 16);
				}

				const bounds = {
					x: minX,
					y: minY,
					width: Math.max(1, maxX - minX),
					height: Math.max(1, maxY - minY),
				};
				if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) {
					return;
				}
				const availableWidth = width - boundaryPadding * 2;
				const availableHeight = height - boundaryPadding * 2;
				const scale = Math.max(
					ZOOM_MIN,
					Math.min(
						ZOOM_MAX,
						0.94 /
							Math.max(
								bounds.width / Math.max(availableWidth, 1),
								bounds.height / Math.max(availableHeight, 1)
							)
					)
				);
				const translateX = width / 2 - scale * (bounds.x + bounds.width / 2);
				const translateY = height / 2 - scale * (bounds.y + bounds.height / 2);
				const targetTransform = d3.zoomIdentity
					.translate(translateX, translateY)
					.scale(scale);

					if (duration > 0) {
						svg.transition().duration(duration).call(zoom.transform, targetTransform);
					} else {
						svg.call(zoom.transform, targetTransform);
					}
					};
					focusNodeRef.current = (nodeId: string | null) => {
						if (nodeId == null) {
							return;
						}
						const targetNode = nodes.find((node) => node.id === nodeId);
						if (!targetNode) {
							return;
						}
						const targetScale = Math.max(
							zoomTransformRef.current.k,
							nodeCount > LARGE_GRAPH_NODE_THRESHOLD ? 1.12 : 1.22
						);
						const targetTransform = d3.zoomIdentity
							.translate(
								width / 2 - targetScale * (targetNode.x ?? width / 2),
								height / 2 - targetScale * (targetNode.y ?? height / 2)
							)
							.scale(targetScale);
						svg.transition().duration(260).call(zoom.transform, targetTransform);
					};

					let hasAutoFitted = false;
					let animationFrameId: number | null = null;

					const renderFrame = () => {
						animationFrameId = null;
						nodeElements
							.attr('cx', (node) => node.x ?? width / 2)
							.attr('cy', (node) => node.y ?? height / 2);

					linkElements
						.attr('x1', (link) =>
							isNode(link.source) ? link.source.x ?? width / 2 : width / 2
						)
						.attr('y1', (link) =>
							isNode(link.source) ? link.source.y ?? height / 2 : height / 2
						)
						.attr('x2', (link) =>
							isNode(link.target) ? link.target.x ?? width / 2 : width / 2
						)
							.attr('y2', (link) =>
								isNode(link.target) ? link.target.y ?? height / 2 : height / 2
							);
						updateLabelPositions();
					};

				const scheduleRender = () => {
					if (animationFrameId != null) {
						return;
					}
					animationFrameId = window.requestAnimationFrame(renderFrame);
				};

				simulation.on('tick', scheduleRender);

				simulation.on('end', () => {
					if (animationFrameId != null) {
						window.cancelAnimationFrame(animationFrameId);
						animationFrameId = null;
					}
					renderFrame();
					if (!hasAutoFitted) {
						hasAutoFitted = true;
						fitGraph(420);
					}
				});

					const fallbackFitDuration = nodeCount > LARGE_GRAPH_NODE_THRESHOLD ? 300 : 360;
					const autoFitTimerId = window.setTimeout(() => {
						if (!hasAutoFitted) {
							hasAutoFitted = true;
							fitGraph(fallbackFitDuration);
						}
					}, 700);

					const currentSelectedNode =
						selectedNodeIdRef.current == null
							? null
							: nodes.find((node) => node.id === selectedNodeIdRef.current) ?? null;
					searchHighlightRef.current(
						searchMatches.map((node) => node.id),
						activeSearchMatch?.id ?? null
					);
					applyHighlight(currentSelectedNode);
					renderFrame();
					if (activeSearchMatch?.id && currentSelectedNode == null) {
						window.requestAnimationFrame(() => {
							focusNodeRef.current(activeSearchMatch.id);
						});
					}

					return () => {
						window.clearTimeout(autoFitTimerId);
					if (animationFrameId != null) {
						window.cancelAnimationFrame(animationFrameId);
					}
					svgElement.removeEventListener('wheel', preventWheelScroll);
					simulation.stop();
				};
			};

		const cleanup = resize();
		window.addEventListener('resize', resize);

		return () => {
			window.removeEventListener('resize', resize);
			cleanup?.();
		};
	}, [inputEdges, inputNodes, resolvedTheme]);

	return (
		<div
			className={cn(
				'relative h-full min-h-[24rem] overflow-hidden rounded-2xl bg-card/80 shadow-sm',
				'after:pointer-events-none after:absolute after:inset-0 after:opacity-40 after:[background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] after:[background-size:36px_36px]',
				className
			)}>
				<svg ref={svgRef} className='relative z-10 block h-full w-full' />
				{showSearch ? (
					<div className='absolute left-4 top-4 z-20 flex w-[min(24rem,calc(100%-6rem))] max-w-full items-center gap-2 rounded-2xl border border-border/70 bg-background/92 p-2 shadow-sm backdrop-blur'>
						<div className='flex min-w-0 flex-1 items-center gap-2'>
							<Search className='size-4 shrink-0 text-muted-foreground' />
							<Input
								value={searchQuery}
								placeholder='Search nodes'
								className='h-8 min-w-0 border-0 bg-transparent! px-0 shadow-none focus-visible:ring-0'
								onChange={(event) => {
									setSearchQuery(event.target.value);
									setActiveSearchIndex(0);
								}}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										cycleSearchMatch(event.shiftKey ? -1 : 1);
									}
									if (event.key === 'Escape') {
										event.preventDefault();
										setSearchQuery('');
										setActiveSearchIndex(0);
									}
								}}
							/>
						</div>
						{searchQuery ? (
							<Button
								variant='ghost'
								size='icon-sm'
								type='button'
								className='shrink-0 rounded-xl'
								onClick={() => {
									setSearchQuery('');
									setActiveSearchIndex(0);
								}}>
								<X className='size-4' />
								<span className='sr-only'>Clear search</span>
							</Button>
						) : null}
						<div className='flex shrink-0 items-center gap-1'>
							<div className='min-w-0 w-fit text-right text-xs font-medium tabular-nums text-muted-foreground'>
								{searchQuery
									? `${searchMatches.length === 0 ? 0 : Math.min(activeSearchIndex + 1, searchMatches.length)}/${searchMatches.length}`
									: ' '}
							</div>
							<Button
								variant='ghost'
								size='icon-sm'
								type='button'
								className='rounded-xl'
								disabled={searchMatches.length <= 1}
								onClick={() => {
									cycleSearchMatch(-1);
								}}>
								<ChevronUp className='size-4' />
								<span className='sr-only'>Previous match</span>
							</Button>
							<Button
								variant='ghost'
								size='icon-sm'
								type='button'
								className='rounded-xl'
								disabled={searchMatches.length <= 1}
								onClick={() => {
									cycleSearchMatch(1);
								}}>
								<ChevronDown className='size-4' />
								<span className='sr-only'>Next match</span>
							</Button>
						</div>
					</div>
				) : null}
				{statsText ? (
					<div className='pointer-events-none absolute bottom-4 right-4 z-20 rounded-full border border-border/70 bg-background/88 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur'>
						{statsText}
					</div>
			) : null}
			<NodeSourceDialog
				node={selectedNode}
				open={selectedNode !== null}
				onOpenChange={(open) => {
					if (!open) {
						selectedNodeIdRef.current = null;
						setSelectedNode(null);
						highlightNodeRef.current(null);
					}
				}}
			/>
		</div>
	);
};

export default EntityGraphCanvas;
