'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	ArrowRight,
	ChevronLeft,
	ChevronRight,
	Database,
	Loader2,
	RefreshCcw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	getMineFileSystems,
	migrateStoredFiles,
	searchStoredFiles,
	syncStoredFiles,
	type StoredFileInfo,
} from '@/service/file-system';

const formatBytes = (value?: number | null) => {
	if (!value || value <= 0) return '-';
	const units = ['B', 'KB', 'MB', 'GB'];
	let size = value;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}
	return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const STORED_FILE_PAGE_SIZE_OPTIONS = [15, 30, 50] as const;
const DEFAULT_STORED_FILE_PAGE_SIZE = 15;

const FileSystemMigrationPage = () => {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [keyword, setKeyword] = useState('');
	const [sourceFileSystemId, setSourceFileSystemId] = useState<number | null>(null);
	const [targetFileSystemId, setTargetFileSystemId] = useState<number | null>(null);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [pageStarts, setPageStarts] = useState<(number | null)[]>([null]);
	const [pageIndex, setPageIndex] = useState(0);
	const [pageSize, setPageSize] = useState<number>(DEFAULT_STORED_FILE_PAGE_SIZE);
	const currentPageStart = pageStarts[pageIndex] ?? null;

	const mineFileSystemsQuery = useQuery({
		queryKey: ['mine-file-system'],
		queryFn: async () => getMineFileSystems({ keyword: '' }),
	});

	const storedFilesQuery = useQuery({
		queryKey: ['stored-files', sourceFileSystemId, keyword, currentPageStart, pageSize],
		queryFn: async () =>
			searchStoredFiles({
				keyword: keyword || undefined,
				user_file_system_id: sourceFileSystemId,
				start: currentPageStart,
				limit: pageSize,
			}),
	});

	const fileSystemTitleById = useMemo(() => {
		return new Map(
			(mineFileSystemsQuery.data?.data ?? []).map((fileSystem) => [
				fileSystem.id,
				fileSystem.title,
			]),
		);
	}, [mineFileSystemsQuery.data?.data]);

	const rows = storedFilesQuery.data?.data ?? [];
	const totalRows = storedFilesQuery.data?.total ?? 0;
	const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
	const selectedSourceFileSystemIds = Array.from(
		new Set(selectedRows.map((row) => row.user_file_system_id)),
	);
	const targetDisabledSourceFileSystemId =
		sourceFileSystemId ??
		(selectedSourceFileSystemIds.length === 1
			? selectedSourceFileSystemIds[0]
			: null);
	const allVisibleSelected =
		rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));
	const canMigrate =
		selectedRows.length > 0 &&
		targetFileSystemId !== null &&
		selectedRows.some((row) => row.user_file_system_id !== targetFileSystemId);

	const migrateMutation = useMutation({
		mutationFn: async () => {
			if (!targetFileSystemId) {
				throw new Error(t('something_wrong'));
			}
			const rowsBySource = new Map<number, number[]>();
			let skipped = 0;
			for (const row of selectedRows) {
				if (row.user_file_system_id === targetFileSystemId) {
					skipped += 1;
					continue;
				}
				const sourceRows = rowsBySource.get(row.user_file_system_id) ?? [];
				sourceRows.push(row.id);
				rowsBySource.set(row.user_file_system_id, sourceRows);
			}

			let migrated = 0;
			let failed = 0;
			for (const [sourceUserFileSystemId, storedFileIds] of rowsBySource) {
				try {
					const result = await migrateStoredFiles({
						source_user_file_system_id: sourceUserFileSystemId,
						target_user_file_system_id: targetFileSystemId,
						stored_file_ids: storedFileIds,
					});
					migrated += result.migrated;
					failed += result.failed;
					skipped += result.skipped;
				} catch {
					failed += storedFileIds.length;
				}
			}
			return { migrated, failed, skipped };
		},
		onSuccess: (result) => {
			toast.success(
				t('setting_file_system_files_migrate_success', {
					count: result.migrated,
				}),
			);
			setSelectedIds([]);
			queryClient.invalidateQueries({ queryKey: ['stored-files'] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const syncMutation = useMutation({
		mutationFn: () =>
			syncStoredFiles({
				user_file_system_id: sourceFileSystemId,
			}),
		onSuccess: async (result) => {
			if (result.candidates === 0) {
				toast.info(t('setting_file_system_files_sync_empty'));
			} else {
				toast.success(
					t('setting_file_system_files_sync_success', {
						count: result.synced,
						candidates: result.candidates,
						total: result.total,
					}),
				);
			}
			setSelectedIds([]);
			await queryClient.invalidateQueries({ queryKey: ['stored-files'] });
			await storedFilesQuery.refetch();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const resetPagination = () => {
		setPageStarts([null]);
		setPageIndex(0);
		setSelectedIds([]);
	};

	const goToPreviousPage = () => {
		if (pageIndex <= 0) return;
		setPageIndex((current) => current - 1);
		setSelectedIds([]);
	};

	const goToNextPage = () => {
		const nextStart = storedFilesQuery.data?.next_start ?? null;
		if (!storedFilesQuery.data?.has_more || nextStart === null) return;
		setPageStarts((current) => {
			const nextPageIndex = pageIndex + 1;
			if (current[nextPageIndex] === nextStart) {
				return current;
			}
			return [...current.slice(0, nextPageIndex), nextStart];
		});
		setPageIndex((current) => current + 1);
		setSelectedIds([]);
	};

	const updatePageSize = (value: string) => {
		setPageSize(Number(value));
		resetPagination();
	};

	const toggleRow = (row: StoredFileInfo) => {
		setSelectedIds((current) =>
			current.includes(row.id)
				? current.filter((id) => id !== row.id)
				: [...current, row.id],
		);
	};

	const toggleAllVisible = () => {
		if (allVisibleSelected) {
			setSelectedIds((current) =>
				current.filter((id) => !rows.some((row) => row.id === id)),
			);
			return;
		}
		setSelectedIds((current) =>
			Array.from(new Set([...current, ...rows.map((row) => row.id)])),
		);
	};

	return (
		<div className='px-5 pb-5'>
			<div className='mb-4 border-b border-border/60 pb-4'>
				<div className='min-w-0'>
					<h2 className='text-lg font-semibold'>
						{t('setting_file_system_files_title')}
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						{t('setting_file_system_files_description')}
					</p>
				</div>
			</div>

			<div className='mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-2'>
				<Select
					value={sourceFileSystemId ? String(sourceFileSystemId) : 'all'}
					onValueChange={(value) => {
						setSourceFileSystemId(value === 'all' ? null : Number(value));
						resetPagination();
					}}>
					<SelectTrigger className='h-9 w-full sm:w-[240px]'>
						<SelectValue placeholder={t('setting_file_system_files_source')} />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value='all'>
								{t('setting_file_system_files_all_sources')}
							</SelectItem>
							{mineFileSystemsQuery.data?.data.map((fileSystem) => (
								<SelectItem key={fileSystem.id} value={String(fileSystem.id)}>
									{fileSystem.title}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<ArrowRight className='hidden size-4 text-muted-foreground sm:block' />

				<Select
					value={targetFileSystemId ? String(targetFileSystemId) : undefined}
					onValueChange={(value) => setTargetFileSystemId(Number(value))}>
					<SelectTrigger className='h-9 w-full sm:w-[240px]'>
						<SelectValue placeholder={t('setting_file_system_files_target')} />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{mineFileSystemsQuery.data?.data.map((fileSystem) => (
								<SelectItem
									key={fileSystem.id}
									value={String(fileSystem.id)}
									disabled={fileSystem.id === targetDisabledSourceFileSystemId}>
									{fileSystem.title}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<Input
					className='h-9 min-w-[220px] flex-1'
					value={keyword}
					onChange={(event) => {
						setKeyword(event.target.value);
						resetPagination();
					}}
					placeholder={t('setting_file_system_files_search_placeholder')}
				/>

				<div className='flex flex-wrap items-center gap-2'>
					{selectedIds.length > 0 ? (
						<span className='text-sm text-muted-foreground'>
							{t('setting_file_system_files_selected_count', {
								count: selectedIds.length,
							})}
						</span>
					) : null}
					<Button
						variant='outline'
						size='sm'
						onClick={() => storedFilesQuery.refetch()}
						disabled={storedFilesQuery.isFetching}>
						<RefreshCcw className='size-4' />
						{t('refresh')}
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => syncMutation.mutate()}
						disabled={syncMutation.isPending}>
						{syncMutation.isPending ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<Database className='size-4' />
						)}
						{t('setting_file_system_files_sync')}
					</Button>
					<Button
						size='sm'
						disabled={!canMigrate || migrateMutation.isPending}
						onClick={() => migrateMutation.mutate()}>
						{migrateMutation.isPending ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<ArrowRight className='size-4' />
						)}
						{t('setting_file_system_files_migrate_selected')}
					</Button>
				</div>
			</div>

			<div className='rounded-lg border border-border/60'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className='w-10'>
								<Checkbox
									checked={allVisibleSelected}
									onCheckedChange={toggleAllVisible}
								/>
							</TableHead>
							<TableHead>{t('setting_file_system_files_path')}</TableHead>
							<TableHead>{t('setting_file_system_files_resource_source')}</TableHead>
							<TableHead>{t('setting_file_system_files_file_system')}</TableHead>
							<TableHead>{t('setting_file_system_files_size')}</TableHead>
							<TableHead>{t('setting_file_system_files_created')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{storedFilesQuery.isFetching && rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className='h-24 text-center text-muted-foreground'>
									<Loader2 className='mx-auto size-5 animate-spin' />
								</TableCell>
							</TableRow>
						) : null}
						{!storedFilesQuery.isFetching && rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className='h-24 text-center text-muted-foreground'>
									<Database className='mx-auto mb-2 size-5' />
									<div>{t('setting_file_system_files_empty')}</div>
									<div className='mt-1 text-xs'>
										{t('setting_file_system_files_empty_hint')}
									</div>
								</TableCell>
							</TableRow>
						) : null}
						{rows.map((row) => (
							<TableRow key={row.id} data-state={selectedIds.includes(row.id) ? 'selected' : undefined}>
								<TableCell>
									<Checkbox
										checked={selectedIds.includes(row.id)}
										onCheckedChange={() => toggleRow(row)}
									/>
								</TableCell>
								<TableCell className='max-w-[420px] truncate font-mono text-xs'>
									{row.path}
								</TableCell>
								<TableCell>
									<Badge variant='outline' className='rounded-full'>
										{row.source ?? '-'}
									</Badge>
								</TableCell>
								<TableCell>
									{fileSystemTitleById.get(row.user_file_system_id) ??
										`#${row.user_file_system_id}`}
								</TableCell>
								<TableCell>{formatBytes(row.size_bytes)}</TableCell>
								<TableCell className='text-muted-foreground'>
									{new Date(row.create_time).toLocaleString()}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<div className='flex flex-col gap-2 border-t border-border/60 px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
					<div>
						{t('setting_file_system_files_pagination_summary', {
							page: pageIndex + 1,
							total: totalRows,
							count: rows.length,
						})}
					</div>
					<div className='flex flex-wrap items-center gap-2'>
						<div className='flex items-center gap-2'>
							<span>{t('setting_file_system_files_page_size')}</span>
							<Select value={String(pageSize)} onValueChange={updatePageSize}>
								<SelectTrigger className='h-8 w-[84px]'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{STORED_FILE_PAGE_SIZE_OPTIONS.map((option) => (
											<SelectItem key={option} value={String(option)}>
												{option}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<Button
							variant='outline'
							size='sm'
							onClick={goToPreviousPage}
							disabled={pageIndex === 0 || storedFilesQuery.isFetching}>
							<ChevronLeft className='size-4' />
							{t('previous_page')}
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={goToNextPage}
							disabled={!storedFilesQuery.data?.has_more || storedFilesQuery.isFetching}>
							{t('next_page')}
							<ChevronRight className='size-4' />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FileSystemMigrationPage;
