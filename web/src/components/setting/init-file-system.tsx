'use client';

import z from 'zod';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { getQueryClient } from '@/lib/get-query-client';
import { CircleCheck } from 'lucide-react';
import {
	getMineFileSystems,
	getProvideFileSystems,
	installFileSystem,
	updateFileSystem,
} from '@/service/file-system';

const InitFileSystem = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const {
		data: provideFileSystems,
		isFetching: isFetchingProvideFileSystems,
		isRefetching: isRefetchingProvideFileSystems,
	} = useQuery({
		queryKey: ['provide-file-system'],
		queryFn: async () => {
			return await getProvideFileSystems({ keyword: '' });
		},
	});

	const {
		data: mineFileSystems,
		isFetching: isFetchingMineFileSystems,
		isRefetching: isRefetchingMineFileSystems,
	} = useQuery({
		queryKey: ['mine-file-system'],
		queryFn: async () => {
			return await getMineFileSystems({ keyword: '' });
		},
	});

	const formSchema = z
		.object({
			file_system_id: z.number(),
			file_system_config: z.string(),
		})
		.superRefine((data, ctx) => {
			const fileSystem = provideFileSystems?.data.find(
				(item) => item.id === data.file_system_id
			);
			if (fileSystem?.demo_config && !data.file_system_config) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_file_system_form_config_needed'),
					path: ['file_system_config'],
				});
			}
		});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			file_system_config: '',
		},
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

	const mutateInstallFileSystem = useMutation({
		mutationFn: installFileSystem,
		onSuccess: () => {
			toast.success(t('setting_file_system_install_success'));
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const mutateUpdateFileSystem = useMutation({
		mutationFn: updateFileSystem,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		if (
			!mineFileSystems?.data.find((item) => item.id === values.file_system_id)
		) {
			await mutateInstallFileSystem.mutateAsync({
				file_system_id: values.file_system_id,
				status: true,
			});
		}
		await mutateUpdateFileSystem.mutateAsync({
			file_system_id: values.file_system_id,
			config_json: values.file_system_config,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			{mineFileSystems?.data && mineFileSystems.data.length === 0 && (
				<Form {...form}>
					<form className='space-y-2 w-full' onSubmit={handleSubmit}>
						<FormField
							control={form.control}
							name='file_system_id'
							render={({ field }) => (
								<FormItem>
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('init_file_system_form_file_system')}
										</FormLabel>
										<div className='col-span-9'>
											<Select
												onValueChange={(value) => field.onChange(Number(value))}
												value={field.value ? String(field.value) : undefined}>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'init_file_system_form_file_system_placeholder'
														)}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{provideFileSystems?.data.map((item) => {
															return (
																<SelectItem
																	key={item.id}
																	value={String(item.id)}
																	className='w-full'>
																	{item.name}
																</SelectItem>
															);
														})}
													</SelectGroup>
												</SelectContent>
											</Select>
										</div>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
						{provideFileSystems?.data.find((item) => {
							return item.id === form.watch('file_system_id');
						})?.demo_config && (
							<FormItem className='space-y-2 gap-0'>
								<div className='grid grid-cols-12 gap-2'>
									<FormLabel className='col-span-3'>
										{t('init_file_system_form_config')}
									</FormLabel>
									<div className='col-span-9 p-5 rounded bg-muted font-mono text-sm break-all'>
										{
											provideFileSystems?.data.find((item) => {
												return item.id === form.watch('file_system_id');
											})?.demo_config
										}
									</div>
								</div>
							</FormItem>
						)}

						<FormField
							control={form.control}
							name='file_system_config'
							render={({ field }) => (
								<FormItem>
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('init_file_system_form_config')}
										</FormLabel>
										<Textarea
											className='col-span-9'
											placeholder={t(
												'init_file_system_form_config_placeholder'
											)}
											{...field}
										/>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button className='w-full' type='submit'>
							{t('save')}
						</Button>
					</form>
				</Form>
			)}
			{mineFileSystems?.data && mineFileSystems.data.length > 0 && (
				<div className='bg-muted rounded p-5 py-12 flex flex-col justify-center items-center gap-5'>
					<CircleCheck className='size-28 text-muted-foreground' />
					<p className='text-muted-foreground text-sm'>{t('done')}</p>
				</div>
			)}
		</>
	);
};

export default InitFileSystem;
