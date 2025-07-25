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
	getMineEngines,
	getProvideEngines,
	installEngine,
} from '@/service/engine';
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
import { Input } from '../ui/input';

const InitEngine = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const {
		data: provideEngines,
		isFetching: isFetchingProvideEngines,
		isRefetching: isRefetchingProvideEngines,
	} = useQuery({
		queryKey: ['provide-engine'],
		queryFn: async () => {
			return await getProvideEngines({ keyword: '' });
		},
	});

	const {
		data: mineEngines,
		isFetching: isFetchingMineEngines,
		isRefetching: isRefetchingMineEngines,
	} = useQuery({
		queryKey: ['mine-engine'],
		queryFn: async () => {
			return await getMineEngines({ keyword: '' });
		},
	});

	const formSchema = z
		.object({
			engine_id: z.number(),
			title: z.string(),
			description: z.string().optional().nullable(),
			config_json: z.string().optional().nullable(),
		})
		.superRefine((data, ctx) => {
			const engine = provideEngines?.data.find(
				(item) => item.id === data.engine_id
			);
			if (engine?.demo_config && !data.config_json) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_engine_form_config_needed'),
					path: ['engine_config'],
				});
			}
		});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			config_json: '',
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

	const mutateInstallEngine = useMutation({
		mutationFn: installEngine,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['mine-engine'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		await mutateInstallEngine.mutateAsync({
			engine_id: values.engine_id,
			title: values.title,
			description: values.description,
			config_json: values.config_json,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			{mineEngines?.data && mineEngines.data.length === 0 && (
				<Form {...form}>
					<form className='space-y-2 w-full' onSubmit={handleSubmit}>
						<FormField
							control={form.control}
							name='engine_id'
							render={({ field }) => (
								<FormItem>
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('init_engine_form_engine')}
										</FormLabel>
										<div className='col-span-9'>
											<Select
												onValueChange={(value) => field.onChange(Number(value))}
												value={field.value ? String(field.value) : undefined}>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'init_engine_form_engine_placeholder'
														)}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{provideEngines?.data.map((item) => {
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
						<FormField
							control={form.control}
							name='title'
							render={({ field }) => (
								<FormItem>
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('setting_engine_page_engine_form_title')}
										</FormLabel>
										<div className='col-span-9'>
											<Input
												{...field}
												placeholder={t(
													'setting_engine_page_engine_form_title_placeholder'
												)}
												value={field.value || ''}
											/>
										</div>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='description'
							render={({ field }) => (
								<FormItem>
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('setting_engine_page_engine_form_description')}
										</FormLabel>
										<div className='col-span-9'>
											<Textarea
												{...field}
												placeholder={t(
													'setting_engine_page_engine_form_description_placeholder'
												)}
												value={field.value || ''}
											/>
										</div>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
						{provideEngines?.data.find((item) => {
							return item.id === form.watch('engine_id');
						})?.demo_config && (
							<>
								<FormField
									control={form.control}
									name='config_json'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('init_engine_form_config')}
												</FormLabel>
												<Textarea
													className='col-span-9'
													placeholder={t('init_engine_form_config_placeholder')}
													{...field}
													value={field.value ?? ''}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormItem className='space-y-2 gap-0'>
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('init_engine_form_config')}
										</FormLabel>
										<div className='col-span-9 p-5 rounded bg-muted font-mono text-sm break-all'>
											{
												provideEngines?.data.find((item) => {
													return item.id === form.watch('engine_id');
												})?.demo_config
											}
										</div>
									</div>
								</FormItem>
							</>
						)}
						<Button className='w-full' type='submit'>
							{t('save')}
						</Button>
					</form>
				</Form>
			)}
			{mineEngines?.data && mineEngines.data.length > 0 && (
				<div className='bg-muted rounded p-5 py-12 flex flex-col justify-center items-center gap-5'>
					<CircleCheck className='size-28 text-muted-foreground' />
					<p className='text-muted-foreground text-sm'>{t('done')}</p>
				</div>
			)}
		</>
	);
};

export default InitEngine;
