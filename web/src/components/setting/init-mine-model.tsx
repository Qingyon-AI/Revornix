'use client';

import { getQueryClient } from '@/lib/get-query-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
	createAiModel,
	createAiModelProvider,
	searchAiModel,
	searchAiModelProvider,
} from '@/service/ai';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/provider/user-provider';
import { CircleCheck } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { useState } from 'react';

const InitMineModel = () => {
	const [providerChooseYepOrNo, setProviderChooseYepOrNo] = useState('no');
	const t = useTranslations();
	const formSchema = z
		.object({
			model_provider_name: z.string().optional(),
			model_provider_description: z.string().optional(),
			model_provider_api_key: z.string().optional(),
			model_provider_api_url: z.string().optional(),
			model_provider_id: z.number().optional(),
			model_name: z.string(),
		})
		.superRefine((data, ctx) => {
			const hasCustomProvider =
				data.model_provider_name &&
				data.model_provider_api_key &&
				data.model_provider_api_url;

			const hasProviderId = data.model_provider_id !== undefined;

			if (!(hasCustomProvider || hasProviderId)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_mine_model_form_need'),
					path: ['model_provider_id'],
				});
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_mine_model_form_need'),
					path: ['model_provider_name'],
				});
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_mine_model_form_needed'),
					path: ['model_provider_api_key'],
				});
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_mine_model_form_needed'),
					path: ['model_provider_api_url'],
				});
			}
			if (!data.model_name) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_mine_model_form_model_name_needed'),
					path: ['model_name'],
				});
			}
		});

	const queryClient = getQueryClient();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {},
	});

	const { data: models } = useQuery({
		queryKey: ['getModels'],
		queryFn: () =>
			searchAiModel({
				keyword: '',
			}),
	});

	const { data: modelProviders } = useQuery({
		queryKey: ['getModelProviders'],
		queryFn: () =>
			searchAiModelProvider({
				keyword: '',
			}),
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

	const mutateAddAiModelProvider = useMutation({
		mutationFn: createAiModelProvider,
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ['getModelProviders'],
			});
			queryClient.invalidateQueries({
				queryKey: ['getModels'],
			});
		},
		onError: (err) => {
			console.error(err);
			toast.error(err.message);
		},
	});

	const mutateAddModel = useMutation({
		mutationFn: createAiModel,
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ['getModelProviders'],
			});
			queryClient.invalidateQueries({
				queryKey: ['getModels'],
			});
			toast.success(t('setting_model_add_success'));
		},
		onError: (err) => {
			console.error(err);
			toast.error(err.message);
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		if (providerChooseYepOrNo === 'yep') {
			const res = await mutateAddModel.mutateAsync({
				name: values.model_name,
				description: values.model_name,
				provider_id: values.model_provider_id!,
			});
		} else if (providerChooseYepOrNo === 'no') {
			const res1 = await mutateAddAiModelProvider.mutateAsync({
				name: values.model_provider_name!,
				description: values.model_provider_description,
				api_key: values.model_provider_api_key!,
				api_url: values.model_provider_api_url!,
			});
			const res2 = await mutateAddModel.mutateAsync({
				name: values.model_name,
				description: values.model_name,
				provider_id: res1.id,
			});
		}
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			{models?.data && models?.data?.length === 0 && (
				<Form {...form}>
					<form className='flex flex-col gap-2' onSubmit={handleSubmit}>
						<div className='relative flex items-center justify-center overflow-hidden'>
							<Separator />
							<div className='py-1 px-2 border rounded-full text-center bg-muted text-xs mx-1'>
								Provider
							</div>
							<Separator />
						</div>
						<Tabs
							value={providerChooseYepOrNo}
							onValueChange={setProviderChooseYepOrNo}
							className='w-full'>
							<TabsList className='w-full'>
								<TabsTrigger value='yep'>
									{t('init_mine_model_model_provider_choose_yep')}
								</TabsTrigger>
								<TabsTrigger value='no'>
									{t('init_mine_model_model_provider_choose_no')}
								</TabsTrigger>
							</TabsList>
							<TabsContent value='yep'>
								<FormField
									name='model_provider_id'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<div className='grid grid-cols-12 gap-2'>
													<FormLabel className='col-span-3'>
														{t('init_mine_model_form_model_provider_name')}
													</FormLabel>
													<Select
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														value={
															field.value ? String(field.value) : undefined
														}>
														<div className='col-span-9'>
															<SelectTrigger className='w-full'>
																<SelectValue
																	placeholder={t(
																		'init_mine_model_form_model_provider_name_choose_placeholder'
																	)}
																/>
															</SelectTrigger>
															<SelectContent className='w-full'>
																<SelectGroup>
																	{modelProviders?.data?.map((item, index) => {
																		return (
																			<SelectItem
																				key={index}
																				value={item.id.toString()}>
																				{item.name}
																			</SelectItem>
																		);
																	})}
																</SelectGroup>
															</SelectContent>
														</div>
													</Select>
												</div>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
							</TabsContent>
							<TabsContent value='no' className='space-y-2'>
								<FormField
									control={form.control}
									name='model_provider_name'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('setting_model_provider_name')}
												</FormLabel>
												<Input
													type='text'
													className='col-span-9'
													placeholder='Name'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='model_provider_description'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('setting_model_provider_description')}
												</FormLabel>
												<Input
													type='text'
													className='col-span-9'
													placeholder='Description'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='model_provider_api_key'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>API Key</FormLabel>
												<Input
													type='password'
													className='col-span-9'
													placeholder='API Key'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='model_provider_api_url'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>API Base</FormLabel>
												<Input
													className='col-span-9'
													placeholder='API Base'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							</TabsContent>
						</Tabs>
						<div className='relative flex items-center justify-center overflow-hidden'>
							<Separator />
							<div className='py-1 px-2 border rounded-full text-center bg-muted text-xs mx-1'>
								Model
							</div>
							<Separator />
						</div>
						<FormField
							control={form.control}
							name='model_name'
							render={({ field }) => (
								<FormItem>
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('setting_model_name')}
										</FormLabel>
										<Input
											className='col-span-9'
											placeholder={t('setting_model_name_placeholder')}
											{...field}
										/>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type='submit'>{t('save')}</Button>
					</form>
				</Form>
			)}
			{models?.data &&
				models?.data?.length > 0 &&
				modelProviders?.data &&
				modelProviders?.data?.length > 0 && (
					<div className='bg-muted rounded p-5 py-12 flex flex-col justify-center items-center gap-5'>
						<CircleCheck className='size-28 text-muted-foreground' />
						<p className='text-muted-foreground text-sm'>{t('done')}</p>
					</div>
				)}
		</>
	);
};

export default InitMineModel;
