import { useTranslations } from 'next-intl';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import z from 'zod';
import { useEffect, useRef, useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { Loader2, Pencil, XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getMCPServerDetail, updateMCPServer } from '@/service/mcp';
import { Textarea } from '../ui/textarea';
import { MCPCategory } from '@/enums/mcp';
import { diffValues } from '@/lib/utils';
import { Spinner } from '../ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '../ui/empty';

const UpdateMcp = ({ mcp_id }: { mcp_id: number }) => {
	const t = useTranslations();

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);

	const formSchema = z
		.object({
			id: z.number(),
			name: z.string().min(1).max(20).optional(),
			category: z.number().min(0).max(1).optional(),
			cmd: z.string().optional(),
			args: z.string().optional(),
			env: z.string().optional(),
			url: z.string().optional(),
			headers: z.string().optional(),
			enable: z.boolean().optional(),
		})
		.refine(
			(data) => {
				if (data.category === MCPCategory.STD) {
					return data.cmd && data.cmd.trim() !== '';
				}
				return true;
			},
			{
				message: t('mcp_server_cmd_needed'),
				path: ['cmd'],
			},
		)
		.refine(
			(data) => {
				if (data.category === MCPCategory.STD) {
					return data.args && data.args.trim() !== '';
				}
				return true;
			},
			{
				message: t('mcp_server_args_needed'),
				path: ['args'],
			},
		)
		.refine(
			(data) => {
				if (data.category === MCPCategory.HTTP) {
					return data.url && data.url.trim() !== '';
				}
				return true;
			},
			{
				message: t('mcp_server_url_needed'),
				path: ['url'],
			},
		);

	const queryClient = getQueryClient();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: mcp_id,
		},
	});

	const initialValuesRef = useRef<z.infer<typeof formSchema> | null>(null);

	const mutateUpdateMCPServer = useMutation({
		mutationFn: updateMCPServer,
		onSuccess: () => {
			toast.success(t('mcp_server_update_success'));
			setShowUpdateDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['mcp-server-search'],
			});
			queryClient.invalidateQueries({
				queryKey: ['mcp-server-detail', mcp_id],
			});
		},
		onError: (error) => {
			console.error(error);
			toast.error(error.message);
		},
	});

	const handleMCPUpdateFormSubmit = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(
			onUpdateFormValidateSuccess,
			onUpdateFormValidateError,
		)(event);
	};

	const onUpdateFormValidateSuccess = async (
		values: z.infer<typeof formSchema>,
	) => {
		if (!initialValuesRef.current) return;

		const patch = diffValues(values, initialValuesRef.current);

		// 如果啥都没改
		if (Object.keys(patch).length === 0) {
			toast.info(t('form_no_change'));
			return;
		}

		mutateUpdateMCPServer.mutate({
			...values,
			id: mcp_id,
		});
	};

	const onUpdateFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const { data, isFetching, isError, error, isSuccess, refetch } = useQuery({
		queryKey: ['mcp-server-detail', mcp_id],
		queryFn: () => getMCPServerDetail({ id: mcp_id }),
		enabled: showUpdateDialog,
	});

	useEffect(() => {
		if (!data) return;

		const initialFormValues: z.infer<typeof formSchema> = {
			id: mcp_id,
			name: data.name,
			category: data.category,
			cmd: data.cmd ?? '',
			args: data.args ?? '',
			env: data.env ?? '',
			url: data.url ?? '',
			headers: data.headers ?? '',
			enable: data.enable,
		};

		form.reset(initialFormValues);
		initialValuesRef.current = initialFormValues; // ✅ 存表单结构
	}, [data, mcp_id, showUpdateDialog]);

	return (
		<>
			<Dialog
				open={showUpdateDialog}
				onOpenChange={(open) => {
					setShowUpdateDialog(open);
					if (open) {
						refetch(); // ✅ 每次打开都拉最新
					}
				}}>
				<DialogTrigger asChild>
					<Button size={'icon'}>
						<Pencil />
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('mcp_server_update_form_title')}</DialogTitle>
					</DialogHeader>

					{!data && isFetching && (
						<div className='bg-muted text-xs text-muted-foreground p-5 rounded flex flex-row items-center justify-center gap-2'>
							<span>{t('loading')}</span>
							<Spinner />
						</div>
					)}

					{!data && isError && error && (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<XCircleIcon />
								</EmptyMedia>
								<EmptyDescription>{error.message}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}

					{isSuccess && data && (
						<Form {...form}>
							<form onSubmit={handleMCPUpdateFormSubmit} className='space-y-4'>
								<FormField
									name='category'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>
													{t('mcp_server_update_form_category_label')}
												</FormLabel>
												<Select
													value={
														field.value === undefined
															? undefined
															: String(field.value)
													}
													disabled>
													<SelectTrigger className='w-full'>
														<SelectValue
															placeholder={t(
																'mcp_server_update_form_category_placeholder',
															)}
														/>
													</SelectTrigger>
													<SelectContent className='w-full'>
														<SelectGroup>
															<SelectItem value='0'>
																{t('mcp_server_update_form_category_std')}
															</SelectItem>
															<SelectItem value='1'>
																{t('mcp_server_update_form_category_http')}
															</SelectItem>
														</SelectGroup>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
								<FormField
									name='name'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>
													{t('mcp_server_update_form_name_label')}
												</FormLabel>
												<Input
													{...field}
													value={field.value ?? ''}
													placeholder={t(
														'mcp_server_update_form_name_placeholder',
													)}
												/>

												<FormMessage />
											</FormItem>
										);
									}}
								/>
								{Number(form.watch('category')) === 1 && (
									<>
										<FormField
											name='url'
											control={form.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>
															{t('mcp_server_update_form_url')}
														</FormLabel>
														<Input
															{...field}
															value={field.value ?? ''}
															placeholder={t(
																'mcp_server_update_form_url_placeholder',
															)}
														/>
														<FormMessage />
													</FormItem>
												);
											}}
										/>
										<FormField
											name='headers'
											control={form.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>
															{t('mcp_server_update_form_headers')}
														</FormLabel>
														<Textarea
															{...field}
															value={field.value ?? ''}
															placeholder={t(
																'mcp_server_update_form_headers_placeholder',
															)}
														/>
														<FormMessage />
													</FormItem>
												);
											}}
										/>
									</>
								)}
								{Number(form.watch('category')) === 0 && (
									<>
										<FormField
											name='cmd'
											control={form.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>
															{t('mcp_server_update_form_script')}
														</FormLabel>
														<Input
															{...field}
															value={field.value ?? ''}
															placeholder={t(
																'mcp_server_update_form_script_placeholder',
															)}
														/>
														<FormMessage />
													</FormItem>
												);
											}}
										/>
										<FormField
											name='args'
											control={form.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>
															{t('mcp_server_update_form_args')}
														</FormLabel>
														<Input
															{...field}
															value={field.value ?? ''}
															placeholder={t(
																'mcp_server_update_form_args_placeholder',
															)}
														/>
														<FormMessage />
													</FormItem>
												);
											}}
										/>
										<FormField
											name='env'
											control={form.control}
											render={({ field }) => {
												return (
													<FormItem>
														<FormLabel>
															{t('mcp_server_update_form_env')}
														</FormLabel>
														<Textarea
															{...field}
															value={field.value ?? ''}
															placeholder={t(
																'mcp_server_update_form_env_placeholder',
															)}
														/>
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
											{t('mcp_server_update_form_cancel')}
										</Button>
									</DialogClose>
									<Button
										type='submit'
										disabled={mutateUpdateMCPServer.isPending}>
										{t('mcp_server_update_form_submit')}
										{mutateUpdateMCPServer.isPending && (
											<Loader2 className='h-4 w-4 animate-spin' />
										)}
									</Button>
								</DialogFooter>
							</form>
						</Form>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
};

export default UpdateMcp;
