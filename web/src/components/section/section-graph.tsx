'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { searchSectionGraph } from '@/service/graph';
import { getSectionDetail } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

interface Node {
	id: string;
	label: string;
	group: string;
	degree?: number;
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

const getColorVars = (theme: string) => {
	if (theme === 'dark') {
		return {
			bgColor: '#111827',
			linkColor: '#94a3b8',
			nodeStroke: '#1e293b',
			textColor: '#f8fafc',
		};
	} else {
		return {
			bgColor: '#ffffff',
			linkColor: '#999999',
			nodeStroke: '#ffffff',
			textColor: '#000000',
		};
	}
};

const SectionGraph = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const svgRef = useRef<SVGSVGElement | null>(null);

	const { resolvedTheme } = useTheme();

	const { data, isLoading, isError, error, isFetched, refetch } = useQuery({
		queryKey: ['searchDocumentGraph', section_id],
		queryFn: async () =>
			searchSectionGraph({
				section_id: section_id,
			}),
	});

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: () => getSectionDetail({ section_id: section_id }),
	});

	useEffect(() => {
		const graphData = {
			nodes: data?.nodes.map((node) => {
				return {
					id: node.id,
					group: '',
					label: node.text,
					degree: node.degree,
				};
			}),
			edges: data?.edges.map((edge) => {
				return {
					source: edge.src_node,
					target: edge.tgt_node,
				};
			}),
		};
		const nodes: Node[] = graphData.nodes || [];
		const edges: Link[] = graphData.edges || [];

		const degreeExtent = d3.extent(nodes, (d) => d.degree ?? 1) as [
			number,
			number
		];
		const radiusScale = d3.scaleLinear().domain(degreeExtent).range([5, 12]);

		const { bgColor, linkColor, nodeStroke, textColor } = getColorVars(
			resolvedTheme ?? 'light'
		);

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
				.attr('stroke', linkColor)
				.attr('stroke-opacity', 0.6)
				.attr('stroke-width', 1)
				.selectAll('line')
				.data(edges)
				.join('line');

			const nodeElements = svg
				.append('g')
				.attr('stroke', nodeStroke)
				.attr('stroke-width', 1.5)
				.selectAll<SVGCircleElement, Node>('circle') // 添加类型¸
				.data(nodes)
				.join('circle')
				.attr('r', (d) => radiusScale(d.degree ?? 1)) // ✅ 根据 degree 调整大小
				.attr('fill', (d) => color(d.group))
				.call(dragHandler(simulation));

			const textElements = svg
				.append('g')
				.selectAll('text')
				.data(nodes)
				.join('text')
				.text((node) => node.label)
				.attr('fill', textColor)
				.attr('font-size', 12)
				.attr('dx', 15)
				.attr('dy', 4);

			const clamp = (val: number, min: number, max: number) =>
				Math.max(min, Math.min(max, val));

			simulation.nodes(nodes).on('tick', () => {
				nodeElements
					.attr('cx', (d) => clamp(d.x!, 0, width))
					.attr('cy', (d) => clamp(d.y!, 0, height));

				textElements
					.attr('x', (d) => clamp(d.x!, 0, width))
					.attr('y', (d) => clamp(d.y!, 0, height));

				linkElements
					.attr('x1', (d) =>
						isNode(d.source) ? clamp(d.source.x!, 0, width) : 0
					)
					.attr('y1', (d) =>
						isNode(d.source) ? clamp(d.source.y!, 0, height) : 0
					)
					.attr('x2', (d) =>
						isNode(d.target) ? clamp(d.target.x!, 0, width) : 0
					)
					.attr('y2', (d) =>
						isNode(d.target) ? clamp(d.target.y!, 0, height) : 0
					);
			});

			simulation
				.force('x', d3.forceX(width / 2).strength(0.1))
				.force('y', d3.forceY(height / 2).strength(0.1));

			simulation.force(
				'link',
				d3
					.forceLink<Node, Link>(edges)
					.id((d) => d.id)
					.distance(80) // 距离设小一点
					.strength(0.5) // 增强边的吸引力
			);
		};
		resize();

		// Re-render graph on window resize
		window.addEventListener('resize', resize);
		return () => window.removeEventListener('resize', resize);
	}, [data, resolvedTheme]);

	return (
		<div className='w-full h-full flex justify-center items-center relative'>
			{isError && <div className='text-red-500'>Error: {error.message}</div>}
			{isLoading && <Skeleton className='w-full h-full' />}
			{isFetched && (
				<>{data?.nodes && data?.nodes.length > 0 && <svg ref={svgRef}></svg>}</>
			)}
		</div>
	);
};

export default SectionGraph;
