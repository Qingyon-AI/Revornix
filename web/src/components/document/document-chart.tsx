'use client';

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
const chartData = [
	{ month: 'January', desktop: 186, mobile: 80 },
	{ month: 'February', desktop: 305, mobile: 200 },
	{ month: 'March', desktop: 237, mobile: 120 },
	{ month: 'April', desktop: 73, mobile: 190 },
	{ month: 'May', desktop: 209, mobile: 130 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
	{ month: 'June', desktop: 214, mobile: 140 },
];

const chartConfig = {
	desktop: {
		label: 'Desktop',
		color: 'hsl(var(--chart-1))',
	},
	mobile: {
		label: 'Mobile',
		color: 'hsl(var(--chart-2))',
	},
} satisfies ChartConfig;

const DocumentChart = () => {
	return (
		<Card>
			<CardHeader>
				<CardTitle>文档推送记录</CardTitle>
				<CardDescription>这里会显示你近一个月的文档阅读情况</CardDescription>
			</CardHeader>
			<CardContent className='h-20'>
				<ChartContainer config={chartConfig}>
					<BarChart accessibilityLayer data={chartData}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey='month'
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={(value) => value.slice(0, 3)}
						/>
						<ChartTooltip content={<ChartTooltipContent hideLabel />} />
						<ChartLegend content={<ChartLegendContent />} />
						<Bar
							dataKey='desktop'
							stackId='a'
							fill='var(--chart-1)'
							radius={[0, 0, 4, 4]}
						/>
						<Bar
							dataKey='mobile'
							stackId='a'
							fill='var(--chart-2)'
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
};

export default DocumentChart;
