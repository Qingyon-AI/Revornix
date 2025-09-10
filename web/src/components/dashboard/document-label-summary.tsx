'use client';

import { Label, Pie, PieChart } from 'recharts';

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { getDocumentLabelSummary } from '@/service/document';
import { useQuery } from '@tanstack/react-query';
import { cn, getRandomColor } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

const DocumentLabelSummary = ({ className }: { className?: string }) => {
	const t = useTranslations();
	const { data, isFetching } = useQuery({
		queryKey: ['document-label-summary'],
		queryFn: getDocumentLabelSummary,
	});

	const chartConfig: ChartConfig = {};

	// ✅ 使用 useMemo 生成稳定的颜色映射 + 加入 fill
	const colorizedData = useMemo(() => {
		if (!data?.data) return [];

		const colorMap: Record<string, string> = {};

		return data.data.map((item) => {
			const labelName = item.label_info.name;
			if (!colorMap[labelName]) {
				colorMap[labelName] = getRandomColor();
			}
			return {
				...item,
				fill: colorMap[labelName],
			};
		});
	}, [data]);

	const totalDocuments = useMemo(() => {
		if (!data?.data) return 0;

		return data.data.reduce((acc, curr) => acc + curr.count, 0);
	}, [data]);

	return (
		<Card className={cn(className)}>
			<CardHeader className='items-center pb-0'>
				<CardTitle>{t('dashboard_document_label_summary')}</CardTitle>
				<CardDescription>
					{t('dashboard_document_label_summary_tips')}
				</CardDescription>
			</CardHeader>
			<CardContent className='flex-1 pb-0'>
				{isFetching && <Skeleton className='w-full h-[250px]' />}
				{!isFetching && data && (
					<ChartContainer
						config={chartConfig}
						className='mx-auto aspect-square h-[250px]'>
						<PieChart>
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent hideLabel />}
							/>
							<Pie
								data={colorizedData}
								dataKey='count'
								nameKey='label_info.name'
								innerRadius={50}
								strokeWidth={5}></Pie>
						</PieChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
};

export default DocumentLabelSummary;
