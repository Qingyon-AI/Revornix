'use client';

import {
	createApiKey,
	deleteApiKeys,
	searchApiKey,
	updateApiKey,
} from '@/service/api-key';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import * as React from 'react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import {
	Copy,
	KeyRound,
	Loader2,
	Pencil,
	Plus,
	Search,
	ShieldAlert,
	Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import { getQueryClient } from '@/lib/get-query-client';
import { TablePanelSkeleton } from '@/components/ui/skeleton';
import { useCopyToClipboard } from 'react-use';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField } from '@/components/ui/form';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import type { ApiKeyInfo } from '@/generated';

const apiKeyFormSchema = z.object({
	description: z.string().min(1).max(200),
});

const maskApiKey = (key: string) => {
	if (!key) return '';
	if (key.length <= 12) return '•'.repeat(key.length);
	return `${key.slice(0, 6)}${'•'.repeat(8)}${key.slice(-4)}`;
};

const ApiKeyPage = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [, copy] = useCopyToClipboard();

	const [searchInput, setSearchInput] = useState('');
	const [keyword, setKeyword] = useState('');
	const [pageNum, setPageNum] = useState(1);
	const [pageSize] = useState(10);

	const [showAddDialog, setShowAddDialog] = useState(false);
	const [revealKey, setRevealKey] = useState<string | null>(null);

	const [editTarget, setEditTarget] = useState<ApiKeyInfo | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<ApiKeyInfo | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		const handle = setTimeout(() => {
			setKeyword(searchInput.trim());
			setPageNum(1);
		}, 300);
		return () => clearTimeout(handle);
	}, [searchInput]);

	const addForm = useForm({
		resolver: zodResolver(apiKeyFormSchema),
		defaultValues: { description: '' },
	});

	const editForm = useForm({
		resolver: zodResolver(apiKeyFormSchema),
		defaultValues: { description: '' },
	});

	useEffect(() => {
		if (editTarget) {
			editForm.reset({ description: editTarget.description ?? '' });
		}
	}, [editTarget, editForm]);

	const { data, isFetching } = useQuery({
		queryKey: ['searchMyApiKey', keyword, pageNum, pageSize],
		queryFn: () =>
			searchApiKey({
				page_num: pageNum,
				page_size: pageSize,
				keyword,
			}),
	});

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ['searchMyApiKey'] });
	};

	const mutateAdd = useMutation({
		mutationFn: (description: string) => createApiKey({ description }),
		onSuccess: (res) => {
			toast.success(t('account_api_key_add_success'));
			setShowAddDialog(false);
			addForm.reset();
			invalidate();
			setRevealKey(res.api_key);
		},
		onError: (error) => toast.error(error.message),
	});

	const mutateUpdate = useMutation({
		mutationFn: updateApiKey,
		onSuccess: () => {
			toast.success(t('account_api_key_edit_success'));
			setEditTarget(null);
			invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const handleCopy = (raw: string) => {
		try {
			copy(raw);
			toast.success(t('account_api_key_copied'));
		} catch {
			toast.error(t('copy_failed'));
		}
	};

	const formatDateCell = (value: Date | string | null | undefined) =>
		value ? format(new Date(value), 'yyyy-MM-dd HH:mm') : null;

	const columns: ColumnDef<ApiKeyInfo>[] = useMemo(
		() => [
			{
				accessorKey: 'description',
				header: () => (
					<div>{t('account_api_key_table_row_description')}</div>
				),
				cell: ({ row }) => (
					<div className='max-w-[220px] truncate font-medium'>
						{row.original.description || '-'}
					</div>
				),
			},
			{
				accessorKey: 'api_key',
				header: () => <div>{t('account_api_key_table_row_key')}</div>,
				cell: ({ row }) => (
					<div className='flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums'>
						<KeyRound className='size-3.5 shrink-0' />
						<span>{maskApiKey(row.original.api_key)}</span>
					</div>
				),
			},
			{
				accessorKey: 'create_time',
				header: () => (
					<div>{t('account_api_key_table_row_create_time')}</div>
				),
				cell: ({ row }) => (
					<div className='whitespace-nowrap text-sm text-muted-foreground tabular-nums'>
						{formatDateCell(row.original.create_time) ?? '-'}
					</div>
				),
			},
			{
				accessorKey: 'last_used_time',
				header: () => (
					<div>{t('account_api_key_table_row_last_used')}</div>
				),
				cell: ({ row }) => {
					const value = formatDateCell(row.original.last_used_time);
					return (
						<div className='whitespace-nowrap text-sm text-muted-foreground tabular-nums'>
							{value ?? (
								<span className='italic'>
									{t('account_api_key_last_used_never')}
								</span>
							)}
						</div>
					);
				},
			},
			{
				id: 'actions',
				header: () => (
					<div className='text-right'>
						{t('account_api_key_table_row_operate')}
					</div>
				),
				cell: ({ row }) => (
					<div className='flex justify-end gap-1'>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant='ghost'
									size='icon'
									onClick={() => handleCopy(row.original.api_key)}>
									<Copy className='size-4' />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t('copy')}</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant='ghost'
									size='icon'
									onClick={() => setEditTarget(row.original)}>
									<Pencil className='size-4' />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t('account_api_key_edit')}</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant='ghost'
									size='icon'
									className='text-destructive hover:text-destructive'
									onClick={() => setDeleteTarget(row.original)}>
									<Trash2 className='size-4' />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t('delete')}</TooltipContent>
						</Tooltip>
					</div>
				),
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[t],
	);

	const table = useReactTable({
		data: data?.elements || [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const handleAddSubmit = addForm.handleSubmit(
		(values) => mutateAdd.mutateAsync(values.description),
		() => toast.error(t('form_validate_failed')),
	);

	const handleEditSubmit = editForm.handleSubmit(
		(values) => {
			if (!editTarget) return;
			return mutateUpdate.mutateAsync({
				api_key_id: editTarget.id,
				description: values.description,
			});
		},
		() => toast.error(t('form_validate_failed')),
	);

	const handleDeleteConfirm = async () => {
		if (!deleteTarget) return;
		setDeleting(true);
		const [, err] = await utils.to(
			deleteApiKeys({ api_key_ids: [deleteTarget.id] }),
		);
		setDeleting(false);
		if (err) {
			toast.error(err.message);
			return;
		}
		toast.success(t('account_api_key_delete_success'));
		setDeleteTarget(null);
		invalidate();
	};

	return (
		<div className='px-5 pb-5'>
			<div className='flex flex-col gap-4'>
				<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<h1 className='font-bold'>{t('account_api_key')}</h1>
						<p className='text-xs text-muted-foreground'>
							{t('account_api_key_description')}
						</p>
					</div>
					<Dialog
						open={showAddDialog}
						onOpenChange={(open) => {
							setShowAddDialog(open);
							if (!open) addForm.reset();
						}}>
						<DialogTrigger asChild>
							<Button>
								<Plus />
								{t('account_api_key_add')}
							</Button>
						</DialogTrigger>
						<DialogContent className='rounded-[28px] sm:max-w-md'>
							<DialogHeader>
								<DialogTitle>{t('account_api_key_add')}</DialogTitle>
								<DialogDescription>
									{t('account_api_key_add_description')}
								</DialogDescription>
							</DialogHeader>
							<Form {...addForm}>
								<form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleAddSubmit();
									}}
									className='space-y-4'>
									<FormField
										name='description'
										control={addForm.control}
										render={({ field }) => (
											<Input
												className='w-full'
												placeholder={t('account_api_key_add_description')}
												autoFocus
												{...field}
											/>
										)}
									/>
									<DialogFooter>
										<DialogClose asChild>
											<Button type='button' variant='secondary'>
												{t('account_api_key_add_cancel')}
											</Button>
										</DialogClose>
										<Button type='submit' disabled={mutateAdd.isPending}>
											{mutateAdd.isPending && (
												<Loader2 className='animate-spin' />
											)}
											{t('account_api_key_add_confirm')}
										</Button>
									</DialogFooter>
								</form>
							</Form>
						</DialogContent>
					</Dialog>
				</div>

				<div className='relative w-full sm:max-w-xs'>
					<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						placeholder={t('account_api_key_search_placeholder')}
						className='pl-9'
					/>
				</div>

				<div className='rounded-md border'>
					{isFetching && <TablePanelSkeleton className='border-0 shadow-none' />}
					{!isFetching && (
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<TableHead key={header.id}>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows?.length ? (
									table.getRowModel().rows.map((row) => (
										<TableRow key={row.id}>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))}
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className='h-24 text-center text-sm text-muted-foreground'>
											{t('account_api_key_empty')}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</div>

				<div className='flex flex-row items-center justify-between'>
					<div className='text-xs text-muted-foreground'>
						{t('account_api_key_summary', {
							total: data?.total_elements || 0,
							pageNum,
						})}
					</div>
					<div className='flex flex-row gap-2'>
						<Button
							variant='outline'
							onClick={() => setPageNum(pageNum - 1)}
							disabled={pageNum === 1}>
							{t('previous_page')}
						</Button>
						<Button
							variant='outline'
							onClick={() => setPageNum(pageNum + 1)}
							disabled={data ? pageNum >= data.total_pages : true}>
							{t('next_page')}
						</Button>
					</div>
				</div>
			</div>

			<Dialog
				open={!!editTarget}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}>
				<DialogContent className='rounded-[28px] sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>{t('account_api_key_edit')}</DialogTitle>
						<DialogDescription>
							{t('account_api_key_add_description')}
						</DialogDescription>
					</DialogHeader>
					<Form {...editForm}>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								handleEditSubmit();
							}}
							className='space-y-4'>
							<FormField
								name='description'
								control={editForm.control}
								render={({ field }) => (
									<Input
										className='w-full'
										placeholder={t('account_api_key_add_description')}
										autoFocus
										{...field}
									/>
								)}
							/>
							<DialogFooter>
								<DialogClose asChild>
									<Button type='button' variant='secondary'>
										{t('account_api_key_add_cancel')}
									</Button>
								</DialogClose>
								<Button type='submit' disabled={mutateUpdate.isPending}>
									{mutateUpdate.isPending && (
										<Loader2 className='animate-spin' />
									)}
									{t('account_api_key_add_confirm')}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}>
				<AlertDialogContent className='rounded-[28px] sm:max-w-md'>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('account_api_key_delete')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('account_api_key_delete_description')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>
							{t('cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							className='bg-destructive text-white hover:bg-destructive/90'
							disabled={deleting}
							onClick={(e) => {
								e.preventDefault();
								handleDeleteConfirm();
							}}>
							{deleting && <Loader2 className='animate-spin' />}
							{t('confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog
				open={!!revealKey}
				onOpenChange={(open) => {
					if (!open) setRevealKey(null);
				}}>
				<DialogContent className='rounded-[28px] sm:max-w-md'>
					<DialogHeader>
						<DialogTitle className='flex items-center gap-2'>
							<ShieldAlert className='size-5 text-amber-500' />
							{t('account_api_key_reveal_title')}
						</DialogTitle>
						<DialogDescription>
							{t('account_api_key_reveal_warning')}
						</DialogDescription>
					</DialogHeader>
					<div className='flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3 py-3'>
						<code className='flex-1 break-all font-mono text-xs'>
							{revealKey}
						</code>
						<Button
							variant='outline'
							size='icon'
							onClick={() => revealKey && handleCopy(revealKey)}>
							<Copy className='size-4' />
						</Button>
					</div>
					<DialogFooter>
						<Button onClick={() => setRevealKey(null)}>
							{t('account_api_key_reveal_done')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default ApiKeyPage;
