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

const addApiKeyFormSchema = z.object({
	description: z.string().min(1).max(200),
});

const ApiKeyPage = () => {
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
			header: '描述',
			cell: ({ row }) => <div>{row.getValue('description')}</div>,
		},
		{
			id: 'actions',
			header: () => <div>操作</div>,
			cell: ({ row }) => (
				<div className='flex flex-row gap-2'>
					<Button
						variant={'default'}
						onClick={() => {
							copy(row.original.api_key);
						}}>
						复制
					</Button>
					<Dialog
						open={showDeleteApiKeyDialog}
						onOpenChange={setShowDeleteApiKeyDialog}>
						<DialogTrigger asChild>
							<Button variant={'destructive'}>删除</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>删除APIKEY</DialogTitle>
								<DialogDescription>
									你确定要删除这个APIKEY吗？注意一旦删除，所有原先基于该APIKEY的请求服务将会全部下线。
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose asChild>
									<Button variant={'secondary'}>取消</Button>
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
										toast.success('删除成功');
										setDeleting(false);
										setShowDeleteApiKeyDialog(false);
										queryClient.invalidateQueries({
											queryKey: ['searchMyApiKey', keyword],
										});
									}}>
									确认
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
			toast.success('创建成功');
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
		toast.error('表单校验失败');
	};

	return (
		<div className='px-5 pb-5'>
			<div className='w-full'>
				<div className='w-full flex flex-row justify-between items-center mb-4'>
					<h1 className='font-bold'>APIKey管理</h1>
					<Dialog
						open={showAddApiKeyDialog}
						onOpenChange={setShowAddApiKeyDialog}>
						<DialogTrigger asChild>
							<Button variant={'outline'}>增加ApiKey</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>增加APIKEY</DialogTitle>
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
													placeholder='请输入APIKEY的描述'
													{...field}
												/>
											);
										}}
									/>
									<DialogFooter className='mt-4'>
										<DialogClose asChild>
											<Button type='button' variant={'secondary'}>
												取消
											</Button>
										</DialogClose>
										<Button
											type='submit'
											variant={'outline'}
											disabled={mutateAdd.isPending}>
											{mutateAdd.isPending && (
												<Loader2 className='animate-spin' />
											)}
											确认增加
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
											暂无数据
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</div>
				<div className='flex flex-row items-center justify-between mt-4'>
					<div className='text-xs text-muted-foreground'>
						共计{data?.total_elements}条记录，当前第{pageNum}页
					</div>
					<div className='flex flex-row gap-2'>
						<Button
							variant={'outline'}
							onClick={() => setPageNum(pageNum - 1)}
							disabled={pageNum === 1}>
							上一页
						</Button>
						<Button
							variant={'outline'}
							onClick={() => setPageNum(pageNum + 1)}
							disabled={data && pageNum >= data?.total_pages}>
							下一页
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ApiKeyPage;
