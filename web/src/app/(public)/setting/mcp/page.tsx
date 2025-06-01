'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	createMCPServer,
	deleteMCPServer,
	searchMCPServer,
	updateMCPServer,
} from '@/service/mcp';
import { useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { MCPServerSearchRequest, MCPServerUpdateRequest } from '@/generated';

const mcpCreateFormSchema = z
	.object({
		name: z.string().min(1).max(20),
		category: z.number().min(0).max(1),
		args: z.string().optional(),
		cmd: z.string().optional(),
		address: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.category === 0) {
				return data.cmd && data.cmd.trim() !== '';
			}
			return true;
		},
		{
			message: '终端 MCP 模式下 cmd 为必填',
			path: ['cmd'],
		}
	)
	.refine(
		(data) => {
			if (data.category === 0) {
				return data.args && data.args.trim() !== '';
			}
			return true;
		},
		{
			message: '终端 MCP 模式下 args 为必填',
			path: ['args'],
		}
	)
	.refine(
		(data) => {
			if (data.category === 1) {
				return data.address && data.address.trim() !== '';
			}
			return true;
		},
		{
			message: '流式 MCP 模式下 address 为必填',
			path: ['address'],
		}
	);

const mcpUpdateFormSchema = z
	.object({
		id: z.number(),
		name: z.string().min(1).max(20).optional().nullable(),
		category: z.number().min(0).max(1).optional().nullable(),
		args: z.string().optional().nullable(),
		cmd: z.string().optional().nullable(),
		address: z.string().optional().nullable(),
	})
	.refine(
		(data) => {
			if (data.category === 0) {
				return data.cmd && data.cmd.trim() !== '';
			}
			return true;
		},
		{
			message: '终端 MCP 模式下 cmd 为必填',
			path: ['cmd'],
		}
	)
	.refine(
		(data) => {
			if (data.category === 0) {
				return data.args && data.args.trim() !== '';
			}
			return true;
		},
		{
			message: '终端 MCP 模式下 args 为必填',
			path: ['args'],
		}
	)
	.refine(
		(data) => {
			if (data.category === 1) {
				return data.address && data.address.trim() !== '';
			}
			return true;
		},
		{
			message: '流式 MCP 模式下 address 为必填',
			path: ['address'],
		}
	);

const MCPPage = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const mcpCreateForm = useForm({
		resolver: zodResolver(mcpCreateFormSchema),
		defaultValues: {
			name: '',
			category: 0,
			address: '',
			cmd: '',
			args: '',
		},
	});
	const mcpUpdateForm = useForm({
		resolver: zodResolver(mcpUpdateFormSchema),
	});
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [showUpdateDialog, setShowUpdateDialog] = useState(false);

	const { data, isFetching, isRefetching } = useQuery({
		queryKey: ['mcp-server-search'],
		queryFn: async () => {
			return await searchMCPServer({
				keyword: '',
			});
		},
	});

	const mutateCreateMCPServer = useMutation({
		mutationFn: (values: {
			name: string;
			category: number;
			args?: string;
			cmd?: string;
			address?: string;
		}) => {
			return createMCPServer(values);
		},
		onSuccess: () => {
			toast.success('创建成功');
			setShowCreateDialog(false);
			queryClient.invalidateQueries({ queryKey: ['mcp-server-search'] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const mutateDeleteMCPServer = useMutation({
		mutationFn: async (id: number) => {
			return await deleteMCPServer({
				id: id,
			});
		},
		onSuccess: () => {
			toast.success('删除成功');
			queryClient.invalidateQueries({
				queryKey: ['mcp-server-search'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const activeMutateUpdateMCPServer = useMutation({
		mutationFn: async (values: MCPServerUpdateRequest) =>
			updateMCPServer(values),
		onMutate(variables) {
			queryClient.cancelQueries({
				queryKey: ['mcp-server-search'],
			});
			const previousData = queryClient.getQueryData<MCPServerSearchRequest>([
				'mcp-server-search',
			]);
			return { previousData };
		},
		onSettled: () => {
			setShowUpdateDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['mcp-server-search'],
			});
		},
		onError(error, variables, context) {
			toast.error(error.message);
			context &&
				queryClient.setQueryData(['mcp-server-search'], context.previousData);
		},
	});

	const mutateUpdateMCPServer = useMutation({
		mutationFn: async (values: MCPServerUpdateRequest) => {
			return await updateMCPServer(values);
		},
		onSuccess: () => {
			toast.success('更新成功');
			setShowUpdateDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['mcp-server-search'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleMCPCreateFormSubmit = async (
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
		return mcpCreateForm.handleSubmit(
			onCreateFormValidateSuccess,
			onCreateFormValidateError
		)(event);
	};

	const onCreateFormValidateSuccess = async (
		values: z.infer<typeof mcpCreateFormSchema>
	) => {
		await mutateCreateMCPServer.mutateAsync(values);
		mcpCreateForm.reset();
	};

	const onCreateFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const handleMCPUpdateFormSubmit = async (
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
		return mcpUpdateForm.handleSubmit(
			// @ts-expect-error
			onUpdateFormValidateSuccess,
			onUpdateFormValidateError
		)(event);
	};

	const onUpdateFormValidateSuccess = async (
		values: z.infer<typeof mcpUpdateFormSchema>
	) => {
		await mutateUpdateMCPServer.mutateAsync(values);
		mcpUpdateForm.reset();
	};

	const onUpdateFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>更新MCPServer</DialogTitle>
					</DialogHeader>
					<div>
						<Form {...mcpUpdateForm}>
							<form onSubmit={handleMCPUpdateFormSubmit} className='space-y-4'>
								<FormField
									name='name'
									control={mcpUpdateForm.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>MCP名称</FormLabel>
												<Input {...field} placeholder='请输入MCP名称' />
												<FormMessage />
											</FormItem>
										);
									}}
								/>
								<FormField
									name='category'
									control={mcpUpdateForm.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>MCP类型</FormLabel>
												<Select
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
													defaultValue={String(field.value)}>
													<SelectTrigger className='w-full'>
														<SelectValue placeholder='Select a fruit' />
													</SelectTrigger>
													<SelectContent className='w-full'>
														<SelectGroup>
															<SelectItem value='0'>终端 (std)</SelectItem>
															<SelectItem value='1'>流式 (stream)</SelectItem>
														</SelectGroup>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
								{Number(mcpUpdateForm.watch('category')) === 1 && (
									<FormField
										name='address'
										control={mcpUpdateForm.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>MCP服务地址</FormLabel>
													<Input {...field} placeholder='请输入MCP服务地址' />
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								)}
								{Number(mcpUpdateForm.watch('category')) === 0 && (
									<>
										<FormField
											name='cmd'
											control={mcpUpdateForm.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>MCP脚本</FormLabel>
														<Input {...field} placeholder='请输入MCP脚本' />
														<FormMessage />
													</FormItem>
												);
											}}
										/>
										<FormField
											name='args'
											control={mcpUpdateForm.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>MCP脚本参数</FormLabel>
														<Input {...field} placeholder='请输入MCP脚本参数' />
														<FormMessage />
													</FormItem>
												);
											}}
										/>
									</>
								)}
								<DialogFooter>
									<DialogClose asChild>
										<Button type='button' variant={'secondary'}>
											取消
										</Button>
									</DialogClose>
									<Button
										type='submit'
										disabled={mutateUpdateMCPServer.isPending}>
										确认更新
										{mutateUpdateMCPServer.isPending && (
											<Loader2 className='h-4 w-4 animate-spin' />
										)}
									</Button>
								</DialogFooter>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>创建MCPServer</DialogTitle>
					</DialogHeader>
					<div>
						<Form {...mcpCreateForm}>
							<form onSubmit={handleMCPCreateFormSubmit} className='space-y-4'>
								<FormField
									name='name'
									control={mcpCreateForm.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>MCP名称</FormLabel>
												<Input {...field} placeholder='请输入MCP名称' />
												<FormMessage />
											</FormItem>
										);
									}}
								/>
								<FormField
									name='category'
									control={mcpCreateForm.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>MCP类型</FormLabel>
												<Select
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
													defaultValue={String(field.value)}>
													<SelectTrigger className='w-full'>
														<SelectValue placeholder='Select a fruit' />
													</SelectTrigger>
													<SelectContent className='w-full'>
														<SelectGroup>
															<SelectItem value='0'>终端 (std)</SelectItem>
															<SelectItem value='1'>流式 (stream)</SelectItem>
														</SelectGroup>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
								{mcpCreateForm.watch('category') === 1 && (
									<FormField
										name='address'
										control={mcpCreateForm.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>MCP服务地址</FormLabel>
													<Input {...field} placeholder='请输入MCP服务地址' />
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								)}
								{mcpCreateForm.watch('category') === 0 && (
									<>
										<FormField
											name='cmd'
											control={mcpCreateForm.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>MCP脚本</FormLabel>
														<Input {...field} placeholder='请输入MCP脚本' />
														<FormMessage />
													</FormItem>
												);
											}}
										/>
										<FormField
											name='args'
											control={mcpCreateForm.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>MCP脚本参数</FormLabel>
														<Input {...field} placeholder='请输入MCP脚本参数' />
														<FormMessage />
													</FormItem>
												);
											}}
										/>
									</>
								)}
								<DialogFooter>
									<DialogClose asChild>
										<Button type='button' variant={'secondary'}>
											取消
										</Button>
									</DialogClose>
									<Button
										type='submit'
										disabled={mutateCreateMCPServer.isPending}>
										提交
										{mutateCreateMCPServer.isPending && (
											<Loader2 className='h-4 w-4 animate-spin' />
										)}
									</Button>
								</DialogFooter>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>
			<div className='px-5'>
				<Alert className='mb-4'>
					<Info className='h-4 w-4' />
					<AlertDescription>
						在这里你可以配置MCP服务端，配置完成并且启用之后，RevornixAI将具备MCP工具链调用能力。
					</AlertDescription>
				</Alert>
				<div className='flex flex-row w-full justify-end mb-4'>
					<Button
						className='shadow-none'
						onClick={() => setShowCreateDialog(true)}>
						增加MCP服务
						<PlusCircle />
					</Button>
				</div>
				<div>
					<Table className='mb-4'>
						<TableHeader>
							<TableRow>
								<TableHead>MCP名称</TableHead>
								<TableHead>MCP类型</TableHead>
								<TableHead>MCP服务器地址</TableHead>
								<TableHead>MCP脚本</TableHead>
								<TableHead>MCP脚本参数</TableHead>
								<TableHead>状态</TableHead>
								<TableHead>操作</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data &&
								data.data &&
								data.data.length > 0 &&
								data.data.map((mcp_server, index) => {
									return (
										<TableRow key={index}>
											<TableCell className='font-bold'>
												{mcp_server.name}
											</TableCell>
											<TableCell>
												<Badge>
													{mcp_server.category === 0 ? 'std' : 'stream'}
												</Badge>
											</TableCell>
											<TableCell>
												{mcp_server.category === 1 ? mcp_server.address : '-'}
											</TableCell>
											<TableCell>
												{mcp_server.category === 0 ? mcp_server.cmd : '-'}
											</TableCell>
											<TableCell>
												{mcp_server.category === 0 ? mcp_server.args : '-'}
											</TableCell>
											<TableCell>
												<Switch
													checked={mcp_server.enable}
													onCheckedChange={(value) => {
														activeMutateUpdateMCPServer.mutate({
															id: mcp_server.id,
															enable: value,
														});
													}}
												/>
											</TableCell>
											<TableCell className='flex flex-row gap-2'>
												<Button
													onClick={() => {
														mutateDeleteMCPServer.mutateAsync(mcp_server.id);
													}}
													disabled={mutateDeleteMCPServer.isPending}>
													<Trash2 />
													{mutateDeleteMCPServer.isPending && (
														<Loader2 className='h-4 w-4 animate-spin' />
													)}
												</Button>
												<Button
													size={'icon'}
													onClick={() => {
														mcpUpdateForm.reset({
															id: mcp_server.id,
															name: mcp_server.name,
															category: mcp_server.category,
															address: mcp_server.address,
															cmd: mcp_server.cmd,
															args: mcp_server.args,
															enable: mcp_server.enable,
														});
														setShowUpdateDialog(true);
													}}>
													<Pencil />
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
						</TableBody>
					</Table>
					{isFetching && !isRefetching && <Skeleton className='w-full h-52' />}
					{data && data.data && data.data.length === 0 && (
						<div className='text-center p-5 text-xs text-muted-foreground rounded bg-muted'>
							暂无MCP服务
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default MCPPage;
