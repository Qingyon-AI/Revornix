import { useTranslations } from 'next-intl';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { MCPServerInfo } from '@/generated';
import { updateMCPServer } from '@/service/mcp';

const UpdateMcp = ({ mcp_server }: { mcp_server: MCPServerInfo }) => {
	const t = useTranslations();

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);

	const mcpUpdateFormSchema = z
		.object({
			id: z.number(),
			name: z.string().min(1).max(20).optional().nullable(),
			category: z.number().min(0).max(1).optional().nullable(),
			args: z.string().optional().nullable(),
			cmd: z.string().optional().nullable(),
			address: z.string().optional().nullable(),
			enable: z.boolean().optional().nullable(),
		})
		.refine(
			(data) => {
				if (data.category === 0) {
					return data.cmd && data.cmd.trim() !== '';
				}
				return true;
			},
			{
				message: t('mcp_server_cmd_needed'),
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
				message: t('mcp_server_args_needed'),
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
				message: t('mcp_server_address_needed'),
				path: ['address'],
			}
		);

	const queryClient = getQueryClient();

	const mcpUpdateForm = useForm({
		resolver: zodResolver(mcpUpdateFormSchema),
	});

	const mutateUpdateMCPServer = useMutation({
		mutationFn: updateMCPServer,
		onSuccess: () => {
			toast.success(t('mcp_server_update_success'));
			setShowUpdateDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['mcp-server-search'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

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
			<Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('mcp_server_update_form_title')}</DialogTitle>
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
												<FormLabel>
													{t('mcp_server_update_form_name_label')}
												</FormLabel>
												<Input
													{...field}
													value={field.value ?? ''}
													placeholder={t(
														'mcp_server_update_form_name_placeholder'
													)}
												/>

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
												<FormLabel>
													{t('mcp_server_update_form_category_label')}
												</FormLabel>
												<Select
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
													defaultValue={String(field.value)}>
													<SelectTrigger className='w-full'>
														<SelectValue
															placeholder={t(
																'mcp_server_update_form_category_placeholder'
															)}
														/>
													</SelectTrigger>
													<SelectContent className='w-full'>
														<SelectGroup>
															<SelectItem value='0'>
																{t('mcp_server_update_form_category_std')}
															</SelectItem>
															<SelectItem value='1'>
																{t('mcp_server_update_form_category_stream')}
															</SelectItem>
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
													<FormLabel>
														{t('mcp_server_update_form_address')}
													</FormLabel>
													<Input
														{...field}
														value={field.value ?? ''}
														placeholder={t(
															'mcp_server_update_form_address_placeholder'
														)}
													/>
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
														<FormLabel>
															{t('mcp_server_update_form_script')}
														</FormLabel>
														<Input
															{...field}
															value={field.value ?? ''}
															placeholder={t(
																'mcp_server_update_form_script_placeholder'
															)}
														/>
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
														<FormLabel>
															{t('mcp_server_update_form_args')}
														</FormLabel>
														<Input
															{...field}
															value={field.value ?? ''}
															placeholder={t(
																'mcp_server_update_form_args_placeholder'
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
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default UpdateMcp;
