'use client';

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
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
import { useQuery } from '@tanstack/react-query';
import { summaryMonthDocumentCount } from '@/service/document';
import { format, subDays } from 'date-fns';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const DocumentMonthSummary = ({ className }: { className?: string }) => {
	const t = useTranslations();

	const chartConfig = {
		total: {
			label: t('month_summary_total_label'),
			color: 'var(--chart-2)',
		},
	} satisfies ChartConfig;
	const { data, isFetching } = useQuery({
		queryKey: ['document-month-summary'],
		queryFn: async () => {
			return summaryMonthDocumentCount();
		},
	});

	// 生成过去 30 天的完整日期列表
	const generateDateList = (): string[] => {
		const today = new Date();
		return Array.from({ length: 31 }, (_, i) =>
			format(subDays(today, i), 'yyyy-MM-dd')
		).reverse();
	};

	// 填充缺失日期
	const fillMissingDates = useMemo(() => {
		const fullDateList = generateDateList();
		const dataMap = new Map(data?.data.map((item) => [item.date, item.total]));
		const res = fullDateList.map((date) => ({
			date,
			total: dataMap.get(date) || 0, // 如果 dataMap 里有这个日期，就用它的 total，否则设为 0
		}));
		return res;
	}, [data]);

	return (
		<Card className={cn(className)}>
			<CardHeader>
				<CardTitle>{t('month_summary_title')}</CardTitle>
				<CardDescription>{t('month_summary_description')}</CardDescription>
			</CardHeader>
			<CardContent>
				{isFetching && <Skeleton className='w-full h-[250px]' />}
				{!isFetching && data && (
					<ChartContainer config={chartConfig} className='mx-auto max-h-[250px] w-full'>
						<BarChart accessibilityLayer data={fillMissingDates}>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey='date'
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								tickFormatter={(value) => format(new Date(value), 'MM/dd')}
							/>
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent hideLabel />}
							/>
							<Bar dataKey='total' fill='var(--color-total)' radius={6} />
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
};

export default DocumentMonthSummary;
