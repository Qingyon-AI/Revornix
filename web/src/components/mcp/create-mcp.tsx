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
															{t('mcp_server_create_form_category_stream')}
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
								<FormField
									name='address'
									control={mcpCreateForm.control}
									render={({ field }) => {
										return (
											<FormItem>
												<FormLabel>
													{t('mcp_server_create_form_address')}
												</FormLabel>
												<Input
													{...field}
													placeholder={t(
														'mcp_server_create_form_address_placeholder'
													)}
												/>
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
