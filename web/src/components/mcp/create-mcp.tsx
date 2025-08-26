import { getQueryClient } from '@/lib/get-query-client';
import { createMCPServer } from '@/service/mcp';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, PlusCircle } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { MCPCategory } from '@/enums/mcp';

const CreateMcp = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const [showCreateDialog, setShowCreateDialog] = useState(false);

	const mcpCreateFormSchema = z
		.object({
			name: z.string().min(1).max(20),
			category: z.number().min(0).max(1),
			args: z.string().optional(),
			cmd: z.string().optional(),
			url: z.string().optional(),
			headers: z.string().optional(),
			env: z.string().optional(),
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
			}
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
			}
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
			}
		);
	const mcpCreateForm = useForm({
		resolver: zodResolver(mcpCreateFormSchema),
		defaultValues: {
			name: '',
			category: MCPCategory.STD,
			url: '',
			headers: '',
			cmd: '',
			args: '',
			env: '',
		},
	});
	const mutateCreateMCPServer = useMutation({
		mutationFn: (values: {
			name: string;
			category: number;
			args?: string;
			cmd?: string;
			url?: string;
			headers?: string;
			env?: string;
		}) => {
			return createMCPServer(values);
		},
		onSuccess: () => {
			toast.success(t('mcp_server_create_success'));
			setShowCreateDialog(false);
			queryClient.invalidateQueries({ queryKey: ['mcp-server-search'] });
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
	return (
		<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
			<DialogTrigger asChild>
				<Button className='shadow-none'>
					{t('mcp_server_create')}
					<PlusCircle />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('mcp_server_create_form_title')}</DialogTitle>
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
											<FormLabel>
												{t('mcp_server_create_form_name_label')}
											</FormLabel>
											<Input
												{...field}
												placeholder={t(
													'mcp_server_create_form_name_placeholder'
												)}
											/>
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
											<FormLabel>
												{t('mcp_server_create_form_category_label')}
											</FormLabel>
											<Select
												onValueChange={(value) => field.onChange(Number(value))}
												defaultValue={String(field.value)}>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'mcp_server_create_form_category_placeholder'
														)}
													/>
												</SelectTrigger>
												<SelectContent className='w-full'>
													<SelectGroup>
														<SelectItem value='0'>
															{t('mcp_server_create_form_category_std')}
														</SelectItem>
														<SelectItem value='1'>
															{t('mcp_server_create_form_category_http')}
														</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							{mcpCreateForm.watch('category') === 1 && (
								<>
									<FormField
										name='url'
										control={mcpCreateForm.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('mcp_server_create_form_url')}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'mcp_server_create_form_url_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='headers'
										control={mcpCreateForm.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('mcp_server_create_form_headers')}
													</FormLabel>
													<Textarea
														{...field}
														placeholder={t(
															'mcp_server_create_form_headers_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</>
							)}
							{mcpCreateForm.watch('category') === 0 && (
								<>
									<FormField
										name='cmd'
										control={mcpCreateForm.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('mcp_server_create_form_script')}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'mcp_server_create_form_script_placeholder'
														)}
													/>
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
													<FormLabel>
														{t('mcp_server_create_form_args')}
													</FormLabel>
													<Input
														{...field}
														placeholder={t(
															'mcp_server_create_form_args_placeholder'
														)}
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='env'
										control={mcpCreateForm.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														{t('mcp_server_create_form_env')}
													</FormLabel>
													<Textarea
														{...field}
														placeholder={t(
															'mcp_server_create_form_env_placeholder'
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
										{t('mcp_server_create_form_cancel')}
									</Button>
								</DialogClose>
								<Button
									type='submit'
									disabled={mutateCreateMCPServer.isPending}>
									{t('mcp_server_create_form_submit')}
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
	);
};

export default CreateMcp;
