'use client';

import { createApiKey, deleteApiKeys, searchApiKey } from '@/service/api_key';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
	ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import { getQueryClient } from '@/lib/get-query-client';
import { Skeleton } from '@/components/ui/skeleton';
import { useCopyToClipboard } from 'react-use';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField } from '@/components/ui/form';
import { useTranslations } from 'next-intl';

const addApiKeyFormSchema = z.object({
	description: z.string().min(1).max(200),
});

const ApiKeyPage = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [deleting, setDeleting] = useState(false);
	const [copiedText, copy] = useCopyToClipboard();
	const [showDeleteApiKeyDialog, setShowDeleteApiKeyDialog] = useState(false);
	const [showAddApiKeyDialog, setShowAddApiKeyDialog] = useState(false);
	const [keyword, setKeyword] = useState('');
	const [pageNum, setPageNum] = useState(1);
	const [pageSize, setPageSize] = useState(5);

	const form = useForm({
		resolver: zodResolver(addApiKeyFormSchema),
		defaultValues: {
			description: '',
		},
	});

	const { data, isFetching, isRefetching, isError, error } = useQuery({
		queryKey: ['searchMyApiKey', keyword, pageNum, pageSize],
		queryFn: () =>
			searchApiKey({
				page_num: pageNum,
				page_size: pageSize,
				keyword: keyword,
			}),
	});

	const columns: ColumnDef<any>[] = [
		{
			accessorKey: 'api_key',
			header: () => {
				return <div className='w-full'>APIKEY</div>;
			},
			cell: ({ row }) => (
				<div className='flex flex-row gap-2 items-center'>
					{row.getValue('api_key')}
				</div>
			),
		},
		{
			accessorKey: 'description',
			header: t('account_api_key_table_row_description'),
			cell: ({ row }) => <div>{row.getValue('description')}</div>,
		},
		{
			id: 'actions',
			header: () => <div>{t('account_api_key_table_row_operate')}</div>,
			cell: ({ row }) => (
				<div className='flex flex-row gap-2'>
					<Button
						variant={'default'}
						onClick={() => {
							copy(row.original.api_key);
						}}>
						{t('copy')}
					</Button>
					<Dialog
						open={showDeleteApiKeyDialog}
						onOpenChange={setShowDeleteApiKeyDialog}>
						<DialogTrigger asChild>
							<Button variant={'destructive'}>{t('delete')}</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{t('account_api_key_delete')}</DialogTitle>
								<DialogDescription>
									{t('account_api_key_delete_description')}
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose asChild>
									<Button variant={'secondary'}>{t('cancel')}</Button>
								</DialogClose>
								<Button
									variant={'destructive'}
									disabled={deleting}
									onClick={async () => {
										setDeleting(true);
										const [res, err] = await utils.to(
											deleteApiKeys({ api_key_ids: [row.original.id] })
										);
										if (err) {
											toast.error(err.message);
											setDeleting(false);
											return;
										}
										toast.success(t('account_api_key_delete_success'));
										setDeleting(false);
										setShowDeleteApiKeyDialog(false);
										queryClient.invalidateQueries({
											queryKey: ['searchMyApiKey', keyword],
										});
									}}>
									{t('confirm')}
									{deleting && <Loader2 className='animate-spin' />}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			),
		},
	];

	const table = useReactTable({
		data: data?.elements || [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const mutateAdd = useMutation({
		mutationFn: (description: string) => {
			return createApiKey({
				description: description,
			});
		},
		onSuccess: () => {
			toast.success(t('account_api_key_add_success'));
			setShowAddApiKeyDialog(false);
			queryClient.invalidateQueries({ queryKey: ['searchMyApiKey', keyword] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSubmitAddApiKey = async (
		event: React.FormEvent<HTMLFormElement>
	) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onFormValidateSuccess, onFormValidateError)(event);
	};

	const onFormValidateSuccess = async (
		values: z.infer<typeof addApiKeyFormSchema>
	) => {
		await mutateAdd.mutateAsync(values.description);
		form.reset();
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<div className='px-5 pb-5'>
			<div className='w-full'>
				<div className='w-full flex flex-row justify-between items-center mb-4'>
					<h1 className='font-bold'>{t('account_api_key')}</h1>
					<Dialog
						open={showAddApiKeyDialog}
						onOpenChange={setShowAddApiKeyDialog}>
						<DialogTrigger asChild>
							<Button variant={'outline'}>{t('account_api_key_add')}</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{t('account_api_key_add')}</DialogTitle>
							</DialogHeader>
							<Form {...form}>
								<form onSubmit={handleSubmitAddApiKey}>
									<FormField
										name='description'
										control={form.control}
										render={({ field }) => {
											return (
												<Input
													className='w-full'
													placeholder={t('account_api_key_add_description')}
													{...field}
												/>
											);
										}}
									/>
									<DialogFooter className='mt-4'>
										<DialogClose asChild>
											<Button type='button' variant={'secondary'}>
												{t('account_api_key_add_cancel')}
											</Button>
										</DialogClose>
										<Button
											type='submit'
											variant={'outline'}
											disabled={mutateAdd.isPending}>
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
				<div className='rounded-md border'>
					{isFetching && <Skeleton className='w-full h-64' />}
					{!isFetching && (
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => {
											return (
												<TableHead key={header.id}>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext()
														  )}
												</TableHead>
											);
										})}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows?.length ? (
									table.getRowModel().rows.map((row) => (
										<TableRow
											key={row.id}
											data-state={row.getIsSelected() && 'selected'}>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext()
													)}
												</TableCell>
											))}
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className='h-24 text-center'>
											{t('account_api_key_empty')}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</div>
				<div className='flex flex-row items-center justify-between mt-4'>
					<div className='text-xs text-muted-foreground'>
						{t('account_api_key_summary', {
							total: data?.total_elements,
							pageNum: pageNum,
						})}
					</div>
					<div className='flex flex-row gap-2'>
						<Button
							variant={'outline'}
							onClick={() => setPageNum(pageNum - 1)}
							disabled={pageNum === 1}>
							{t('previous_page')}
						</Button>
						<Button
							variant={'outline'}
							onClick={() => setPageNum(pageNum + 1)}
							disabled={data && pageNum >= data?.total_pages}>
							{t('next_page')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ApiKeyPage;
