'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUserComputeLedgerForPaySystem } from '@/service/user';
import { cn } from '@/lib/utils';

type LedgerFilter = 'all' | 'income' | 'expense';

const ComputeLedgerTable = () => {
	const t = useTranslations();
	const [filter, setFilter] = useState<LedgerFilter>('all');
	const [page, setPage] = useState(0);
	const pageSize = 20;
	const { data, isLoading, isFetching } = useQuery({
		queryKey: ['paySystemUserComputeLedger', filter, page],
		queryFn: () =>
			getUserComputeLedgerForPaySystem({
				direction: filter,
				page,
				page_size: pageSize,
			}),
	});
	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const startIndex = total === 0 ? 0 : page * pageSize + 1;
	const endIndex = total === 0 ? 0 : Math.min((page + 1) * pageSize, total);
	const filteredItems = useMemo(() => items, [items]);

	if (isLoading) {
		return (
			<div className='rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground'>
				{t('account_compute_ledger_loading')}
			</div>
		);
	}

	const resolveLedgerType = (source?: string | null, deltaPoints?: number) => {
		if ((source ?? '').startsWith('plan-')) {
			return {
				label: t('account_compute_ledger_type_plan'),
				className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
			};
		}
		if ((source ?? '').includes('compute-pack')) {
			return {
				label: t('account_compute_ledger_type_pack'),
				className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
			};
		}
		if ((source ?? '').includes('consume')) {
			return {
				label: t('account_compute_ledger_type_consume'),
				className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
			};
		}
		if ((source ?? '').includes('expire')) {
			return {
				label: t('account_compute_ledger_type_expired'),
				className: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300',
			};
		}
		if ((source ?? '').includes('order')) {
			return {
				label: deltaPoints && deltaPoints > 0
					? t('account_compute_ledger_type_pack')
					: t('account_compute_ledger_type_consume'),
				className: deltaPoints && deltaPoints > 0
					? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
					: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
			};
		}
		return {
			label: deltaPoints && deltaPoints > 0
				? t('account_compute_ledger_type_income')
				: t('account_compute_ledger_type_expense'),
			className: 'border-border/70 bg-background/80 text-foreground',
		};
	};

	return (
		<div className='rounded-2xl border border-border/70 bg-muted/20 px-2 py-2'>
			<div className='flex flex-col gap-3 px-2 pb-3 pt-2 md:flex-row md:items-center md:justify-between'>
				<Tabs
					value={filter}
					onValueChange={(value) => {
						setFilter(value as LedgerFilter);
						setPage(0);
					}}
					className='gap-0'>
					<TabsList>
						<TabsTrigger value='all'>{t('account_compute_ledger_filter_all')}</TabsTrigger>
						<TabsTrigger value='income'>{t('account_compute_ledger_filter_income')}</TabsTrigger>
						<TabsTrigger value='expense'>{t('account_compute_ledger_filter_expense')}</TabsTrigger>
					</TabsList>
				</Tabs>
				<div className='text-right text-xs text-muted-foreground'>
					<p>{t('account_compute_ledger_total', { total: total.toLocaleString() })}</p>
					<p>{t('account_compute_ledger_page_range', { start: startIndex.toLocaleString(), end: endIndex.toLocaleString() })}</p>
				</div>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t('account_compute_ledger_time')}</TableHead>
						<TableHead>{t('account_compute_ledger_change')}</TableHead>
						<TableHead>{t('account_compute_ledger_reason')}</TableHead>
						<TableHead>{t('account_compute_ledger_expire_time')}</TableHead>
						<TableHead className='text-right'>{t('account_compute_ledger_balance_after')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredItems.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={5}
								className='py-6 text-center text-sm text-muted-foreground'>
								{filter === 'all'
									? t('account_compute_ledger_empty')
									: t('account_compute_ledger_empty_filtered')}
							</TableCell>
						</TableRow>
					)}
					{filteredItems.map((item) => {
						const ledgerType = resolveLedgerType(item.source, item.delta_points);
						return (
							<TableRow key={item.id}>
								<TableCell className='text-xs text-muted-foreground'>
									{item.create_time
										? format(new Date(item.create_time), 'yyyy-MM-dd HH:mm')
										: '--'}
								</TableCell>
								<TableCell
									className={cn('font-semibold', {
										'text-emerald-600': item.delta_points > 0,
										'text-rose-600': item.delta_points < 0,
									})}>
									{item.delta_points > 0 ? '+' : ''}
									{item.delta_points.toLocaleString()}
								</TableCell>
								<TableCell className='max-w-[320px]'>
									<div className='flex flex-col gap-1'>
										<Badge variant='outline' className={cn('w-fit', ledgerType.className)}>
											{ledgerType.label}
										</Badge>
										<p className='truncate text-sm'>
											{item.reason || item.source || '--'}
										</p>
									</div>
								</TableCell>
								<TableCell className='text-xs text-muted-foreground'>
									{item.expire_time
										? format(new Date(item.expire_time), 'yyyy-MM-dd HH:mm')
										: '--'}
								</TableCell>
								<TableCell className='text-right font-medium'>
									{item.balance_after.toLocaleString()}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
			<div className='flex flex-col gap-3 px-2 pb-2 pt-4 md:flex-row md:items-center md:justify-between'>
				<p className='text-xs text-muted-foreground'>
					{t('account_compute_ledger_browse_hint')}
				</p>
				<div className='flex items-center justify-end gap-2'>
					<Button
						type='button'
						variant='outline'
						size='sm'
						disabled={page === 0 || isFetching}
						onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}>
						{t('account_compute_ledger_prev_page')}
					</Button>
					<span className='min-w-24 text-center text-xs text-muted-foreground'>
						{t('account_compute_ledger_page_status', { page: page + 1, total: totalPages })}
					</span>
					<Button
						type='button'
						variant='outline'
						size='sm'
						disabled={!data?.has_more || isFetching}
						onClick={() => setPage((currentPage) => currentPage + 1)}>
						{t('account_compute_ledger_next_page')}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ComputeLedgerTable;
