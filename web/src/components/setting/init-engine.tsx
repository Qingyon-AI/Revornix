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
	updateEngine,
} from '@/service/engine';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { updateUserDefaultEngine } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';
import { getQueryClient } from '@/lib/get-query-client';
import { CircleCheck } from 'lucide-react';

const InitEngine = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { refreshUserInfo } = useUserContext();
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

	const formSchema = z.object({
		engine_id: z.number(),
		engine_config: z.string(),
	});
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			engine_config: '',
			engine_id: undefined,
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
			toast.success(t('setting_engine_page_install_success'));
			queryClient.invalidateQueries({
				queryKey: ['mine-engine'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const mutateUpdateEngineConfig = useMutation({
		mutationFn: updateEngine,
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const mutateUpdateDefaultDocumentParseEngine = useMutation({
		mutationFn: updateUserDefaultEngine,
		onSuccess: () => {
			refreshUserInfo();
			toast.success(
				t('setting_default_document_parse_engine_update_successful')
			);
			toast.success(
				t('setting_default_document_parse_engine_update_successful')
			);
		},
		onError: (error) => {
			toast.error(error.message);
			console.error(error);
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		if (!mineEngines?.data.find((item) => item.id === values.engine_id)) {
			await mutateInstallEngine.mutateAsync({
				engine_id: values.engine_id,
				status: true,
			});
		}
		await mutateUpdateEngineConfig.mutateAsync({
			engine_id: values.engine_id,
			config_json: values.engine_config,
		});
		await mutateUpdateDefaultDocumentParseEngine.mutateAsync({
			default_file_document_parse_engine_id: values.engine_id,
			default_website_document_parse_engine_id: values.engine_id,
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
					<form className='flex flex-col gap-5 w-full' onSubmit={handleSubmit}>
						<FormField
							control={form.control}
							name='engine_id'
							render={({ field }) => (
								<FormItem>
									<div className='space-y-2'>
										<FormLabel>引擎选择</FormLabel>
										<Select
											onValueChange={(value) => field.onChange(Number(value))}
											value={field.value ? String(field.value) : undefined}>
											<SelectTrigger className='w-full'>
												<SelectValue placeholder={'请选择引擎'} />
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
									<FormMessage />
								</FormItem>
							)}
						/>
						{provideEngines?.data.find((item) => {
							return item.id === form.watch('engine_id');
						})?.demo_config && (
							<FormItem className='space-y-2 gap-0'>
								<FormLabel>配置示例</FormLabel>
								<div className='p-5 rounded bg-muted font-mono text-sm'>
									{
										provideEngines?.data.find((item) => {
											return item.id === form.watch('engine_id');
										})?.demo_config
									}
								</div>
							</FormItem>
						)}

						<FormField
							control={form.control}
							name='engine_config'
							render={({ field }) => (
								<FormItem>
									<div className='space-y-2'>
										<FormLabel>配置</FormLabel>
										<Textarea placeholder='Engine Config' {...field} />
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type='submit'>{t('save')}</Button>
					</form>
				</Form>
			)}
			{mineEngines?.data && mineEngines.data.length > 0 && (
				<div className='bg-muted rounded p-5 py-12 flex flex-col justify-center items-center gap-2'>
					<CircleCheck className='size-28 text-muted-foreground' />
					<p>完成</p>
				</div>
			)}
		</>
	);
};

export default InitEngine;
