'use client';

import * as d3 from 'd3';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

interface Node {
	id: string;
	label: string;
	group: string;
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
}

interface Link {
	source: string | Node;
	target: string | Node;
}

const isNode = (obj: string | Node): obj is Node => {
	return typeof obj !== 'string';
};

const RelationGraph = () => {
	const { theme } = useTheme();
	const svgRef = useRef<SVGSVGElement | null>(null);

	const nodes: Node[] = [
		{ id: 'mammal', group: 'mammal', label: 'Mammals' },
		{ id: 'dog', group: 'mammal', label: 'Dogs' },
		{ id: 'cat', group: 'mammal', label: 'Cats' },
		{ id: 'fox', group: 'mammal', label: 'Foxes' },
		{ id: 'elk', group: 'mammal', label: 'Elk' },
		{ id: 'insect', group: 'insect', label: 'Insects' },
		{ id: 'ant', group: 'insect', label: 'Ants' },
		{ id: 'bee', group: 'insect', label: 'Bees' },
		{ id: 'fish', group: 'fish', label: 'Fish' },
		{ id: 'carp', group: 'fish', label: 'Carp' },
		{ id: 'pike', group: 'fish', label: 'Pikes' },
	];

	const links = [
		{ target: 'mammal', source: 'dog' },
		{ target: 'mammal', source: 'cat' },
		{ target: 'mammal', source: 'fox' },
		{ target: 'mammal', source: 'elk' },
		{ target: 'insect', source: 'ant' },
		{ target: 'insect', source: 'bee' },
		{ target: 'fish', source: 'carp' },
		{ target: 'fish', source: 'pike' },
		{ target: 'cat', source: 'elk' },
		{ target: 'carp', source: 'ant' },
		{ target: 'elk', source: 'bee' },
		{ target: 'dog', source: 'cat' },
		{ target: 'fox', source: 'ant' },
		{ target: 'pike', source: 'dog' },
	];

	useEffect(() => {
		const resize = () => {
			const svgElement = svgRef.current;
			if (!svgElement) return;

			const width = svgElement.parentElement?.clientWidth || 800;
			const height = svgElement.parentElement?.clientHeight || 400;

			d3.select(svgElement)
				.attr('width', width)
				.attr('height', height)
				.attr('viewBox', [0, 0, width, height])
				.attr('style', 'width: 100%; height: 100%;');

			const color = d3.scaleOrdinal(d3.schemeCategory10);

			const simulation = d3
				.forceSimulation<Node, Link>(nodes) // 明确类型
				.force('charge', d3.forceManyBody().strength(-200))
				.force('center', d3.forceCenter(width / 2, height / 2));

			const dragHandler = (simulation: d3.Simulation<Node, Link>) => {
				function dragstarted(
					event: d3.D3DragEvent<SVGCircleElement, Node, Node>
				) {
					if (!event.active) simulation.alphaTarget(0.3).restart();
					event.subject.fx = event.subject.x;
					event.subject.fy = event.subject.y;
				}
				function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
					event.subject.fx = event.x;
					event.subject.fy = event.y;
				}
				function dragended(
					event: d3.D3DragEvent<SVGCircleElement, Node, Node>
				) {
					if (!event.active) simulation.alphaTarget(0);
					event.subject.fx = null;
					event.subject.fy = null;
				}
				return d3
					.drag<SVGCircleElement, Node>()
					.on('start', dragstarted)
					.on('drag', dragged)
					.on('end', dragended);
			};

			const svg = d3.select(svgElement);
			svg.selectAll('*').remove();
			const linkElements = svg
				.append('g')
				.attr('stroke', '#999')
				.attr('stroke-opacity', 0.6)
				.attr('stroke-width', 1)
				.selectAll('line')
				.data(links)
				.join('line');

			const nodeElements = svg
				.append('g')
				.attr('stroke', '#fff')
				.attr('stroke-width', 1.5)
				.selectAll<SVGCircleElement, Node>('circle') // 添加类型¸
				.data(nodes)
				.join('circle')
				.attr('r', 10)
				.attr('fill', (d) => color(d.group))
				.call(dragHandler(simulation));

			const textElements = svg
				.append('g')
				.selectAll('text')
				.data(nodes)
				.join('text')
				.text((node) => node.label)
				.attr('font-size', 12)
				.attr('fill', '#000')
				.attr('dx', 15)
				.attr('dy', 4);

			// 启动模拟
			simulation.nodes(nodes).on('tick', () => {
				nodeElements
					.attr('cx', (node) => node.x!)
					.attr('cy', (node) => node.y!);
				textElements.attr('x', (node) => node.x!).attr('y', (node) => node.y!);
				linkElements
					.attr('x1', (link) => (isNode(link.source) ? link.source.x! : 0))
					.attr('y1', (link) => (isNode(link.source) ? link.source.y! : 0))
					.attr('x2', (link) => (isNode(link.target) ? link.target.x! : 0))
					.attr('y2', (link) => (isNode(link.target) ? link.target.y! : 0));
			});

			simulation.force(
				'link',
				d3.forceLink<Node, Link>(links).id((d) => d.id)
			);
		};
		resize();

		// Re-render graph on window resize
		window.addEventListener('resize', resize);
		return () => window.removeEventListener('resize', resize);
	}, [links, nodes]);

	return <svg ref={svgRef}></svg>;
};

export default RelationGraph;
