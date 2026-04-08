'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Shield, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getAdminAntiScrapeStats } from '@/service/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

const AdminSecurityPage = () => {
	const t = useTranslations();

	const antiScrapeQuery = useQuery({
		queryKey: ['admin-anti-scrape-stats'],
		queryFn: () => getAdminAntiScrapeStats(),
		refetchInterval: 30_000,
	});

	const summaryRows = useMemo(() => {
		const windows = antiScrapeQuery.data?.summary ?? [];
		const keys = Array.from(
			new Set(
				windows.flatMap((window) => Object.keys(window.counts ?? {})),
			),
		).sort();
		return { windows, keys };
	}, [antiScrapeQuery.data]);

	return (
		<div className='p-6 sm:p-7'>
			<Card className='rounded-[28px] border-border/60 py-0'>
				<CardHeader className='px-6 pt-6'>
					<CardTitle className='flex items-center gap-2 text-2xl tracking-tight'>
						<Shield className='size-5 text-emerald-600 dark:text-emerald-300' />
						{t('admin_security_title')}
					</CardTitle>
					<CardDescription className='leading-6'>
						{t('admin_security_description')}
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-6 px-6 pb-6'>
					<div className='flex items-center justify-end'>
						<Button
							variant='outline'
							className='rounded-xl'
							onClick={() => antiScrapeQuery.refetch()}
							disabled={antiScrapeQuery.isFetching}>
							<Activity className='size-4' />
							{t('refresh')}
						</Button>
					</div>

					<div className='grid gap-4 xl:grid-cols-[1.1fr_1fr]'>
						<Card className='h-full rounded-[24px] border-border/60'>
							<CardHeader>
								<CardTitle className='text-base'>
									{t('admin_security_summary_title')}
								</CardTitle>
								<CardDescription>
									{t('admin_security_summary_description')}
								</CardDescription>
							</CardHeader>
							<CardContent className='min-h-[360px]'>
								{antiScrapeQuery.isLoading ? (
									<Skeleton className='h-[360px] rounded-[20px]' />
								) : antiScrapeQuery.isError ? (
									<Empty className='flex min-h-[360px] items-center justify-center rounded-[20px]'>
										<EmptyHeader>
											<EmptyMedia variant='icon'>
												<ShieldAlert />
											</EmptyMedia>
											<EmptyTitle>{t('something_wrong')}</EmptyTitle>
											<EmptyDescription>
												{antiScrapeQuery.error.message}
											</EmptyDescription>
										</EmptyHeader>
									</Empty>
								) : summaryRows.keys.length === 0 ? (
									<Empty className='flex min-h-[360px] items-center justify-center rounded-[20px]'>
										<EmptyHeader>
											<EmptyMedia variant='icon'>
												<Shield />
											</EmptyMedia>
											<EmptyTitle>{t('admin_empty_title')}</EmptyTitle>
											<EmptyDescription>
												{t('admin_security_summary_empty')}
											</EmptyDescription>
										</EmptyHeader>
									</Empty>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t('admin_security_summary_key')}</TableHead>
												{summaryRows.windows.map((window) => (
													<TableHead key={window.minutes}>
														{t('admin_security_summary_window', {
															minutes: window.minutes,
														})}
													</TableHead>
												))}
											</TableRow>
										</TableHeader>
										<TableBody>
											{summaryRows.keys.map((key) => (
												<TableRow key={key}>
													<TableCell className='font-mono text-xs'>{key}</TableCell>
													{summaryRows.windows.map((window) => (
														<TableCell key={`${key}-${window.minutes}`}>
															{window.counts[key] ?? 0}
														</TableCell>
													))}
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>

						<Card className='h-full rounded-[24px] border-border/60'>
							<CardHeader>
								<CardTitle className='text-base'>
									{t('admin_security_recent_title')}
								</CardTitle>
								<CardDescription>
									{t('admin_security_recent_description')}
								</CardDescription>
							</CardHeader>
							<CardContent className='min-h-[360px] space-y-3'>
								{antiScrapeQuery.isLoading ? (
									<Skeleton className='h-[360px] rounded-[20px]' />
								) : antiScrapeQuery.isError ? (
									<Empty className='flex min-h-[360px] items-center justify-center rounded-[20px]'>
										<EmptyHeader>
											<EmptyMedia variant='icon'>
												<ShieldAlert />
											</EmptyMedia>
											<EmptyTitle>{t('something_wrong')}</EmptyTitle>
											<EmptyDescription>
												{antiScrapeQuery.error.message}
											</EmptyDescription>
										</EmptyHeader>
									</Empty>
								) : (antiScrapeQuery.data?.recentEvents?.length ?? 0) === 0 ? (
									<Empty className='flex min-h-[360px] items-center justify-center rounded-[20px]'>
										<EmptyHeader>
											<EmptyMedia variant='icon'>
												<Shield />
											</EmptyMedia>
											<EmptyTitle>{t('admin_empty_title')}</EmptyTitle>
											<EmptyDescription>
												{t('admin_security_recent_empty')}
											</EmptyDescription>
										</EmptyHeader>
									</Empty>
								) : (
									<div className='space-y-3'>
										{antiScrapeQuery.data?.recentEvents.slice(0, 50).map((event) => (
											<div
												key={`${event.timestamp}-${event.event}-${event.path}-${event.clientIp}`}
												className='rounded-2xl border border-border/60 bg-background/60 p-4'>
												<div className='flex flex-wrap items-center gap-2'>
													<Badge variant='outline' className='rounded-full'>
														{event.event}
													</Badge>
													<Badge variant='outline' className='rounded-full'>
														{event.policy}
													</Badge>
													<Badge variant='outline' className='rounded-full'>
														{event.rule}
													</Badge>
												</div>
												<div className='mt-3 grid gap-2 text-sm text-muted-foreground'>
													<div>{event.method} {event.path}</div>
													<div>{t('admin_security_event_meta', {
														host: event.host,
														service: event.service,
														ip: event.clientIp,
													})}</div>
													<div>{t('admin_security_event_quota', {
														limit: event.limit ?? 0,
														remaining: event.remaining ?? 0,
														reset: event.resetSeconds ?? 0,
													})}</div>
													<div className='font-mono text-xs'>ua:{event.userAgentHash}</div>
													<div className='text-xs'>{new Date(event.timestamp).toLocaleString()}</div>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default AdminSecurityPage;
