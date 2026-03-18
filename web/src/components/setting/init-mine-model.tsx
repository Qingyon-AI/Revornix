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
} from '@/service/ai';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CircleCheck, Loader2 } from 'lucide-react';
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
import ResourceSelectEmptyState from './resource-select-empty-state';
import { Bot } from 'lucide-react';

const InitMineModel = () => {
	const [providerChooseYepOrNo, setProviderChooseYepOrNo] = useState('no');
	const t = useTranslations();
	const formSchema = z
		.object({
			model_provider_name: z.string().optional(),
			model_provider_description: z.string().optional(),
			model_provider_api_key: z.string().optional(),
			model_provider_base_url: z.string().optional(),
			model_provider_id: z.number().optional(),
			model_name: z.string(),
		})
		.superRefine((data, ctx) => {
			const hasCustomProvider =
				data.model_provider_name &&
				data.model_provider_api_key &&
				data.model_provider_base_url;

			const hasProviderId = data.model_provider_id !== undefined;

			if (!(hasCustomProvider || hasProviderId)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_mine_model_form_needed'),
					path: ['model_provider_id'],
				});
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('init_mine_model_form_needed'),
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
					path: ['model_provider_base_url'],
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
				base_url: values.model_provider_base_url!,
				is_public: false,
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
	const isSubmitting =
		mutateAddAiModelProvider.isPending || mutateAddModel.isPending;

	return (
		<>
			{models?.data && models?.data?.length === 0 && (
				<Form {...form}>
					<form className='flex flex-col gap-4' onSubmit={handleSubmit}>
						<Tabs
							value={providerChooseYepOrNo}
							onValueChange={setProviderChooseYepOrNo}
							className='w-full'>
							<TabsList className='grid h-auto w-full grid-cols-2 rounded-2xl bg-muted/70 p-1'>
								<TabsTrigger
									value='yep'
									className='whitespace-normal px-3 py-2 text-center leading-5'>
									{t('init_mine_model_model_provider_choose_yep')}
								</TabsTrigger>
								<TabsTrigger
									value='no'
									className='whitespace-normal px-3 py-2 text-center leading-5'>
									{t('init_mine_model_model_provider_choose_no')}
								</TabsTrigger>
							</TabsList>
							{/* 已有供应商 */}
							<TabsContent value='yep' className='space-y-4 pt-2'>
								<FormField
									name='model_provider_id'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
													<FormLabel className='sm:col-span-4 sm:pt-2'>
														{t('init_mine_model_form_model_name')}
													</FormLabel>
													<Select
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														value={
															field.value ? String(field.value) : undefined
														}>
														<div className='sm:col-span-8'>
															<SelectTrigger className='w-full'>
																<SelectValue
																	placeholder={t(
																		'init_mine_model_form_model_name_placeholder',
																	)}
																/>
															</SelectTrigger>
															<SelectContent className='w-full'>
																{(models?.data?.length ?? 0) === 0 ? (
																	<ResourceSelectEmptyState
																		icon={Bot}
																		title={t('setting_default_model_empty_title')}
																		description={t(
																			'setting_default_model_empty_description',
																		)}
																		actionLabel={t(
																			'setting_default_model_empty_action',
																		)}
																		href='/setting/model'
																	/>
																) : (
																	<SelectGroup>
																		{models?.data?.map((item, index) => {
																			return (
																				<SelectItem
																					key={index}
																					value={item.id.toString()}>
																					{item.name}
																				</SelectItem>
																			);
																		})}
																	</SelectGroup>
																)}
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
							{/* 新建供应商 */}
							<TabsContent value='no' className='space-y-4 pt-2'>
								<FormField
									control={form.control}
									name='model_provider_name'
									render={({ field }) => (
										<FormItem>
											<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
											<FormLabel className='sm:col-span-4 sm:pt-2'>
												{t('setting_model_provider_name')}
												</FormLabel>
												<Input
													type='text'
													className='sm:col-span-8'
													placeholder={t(
														'setting_model_provider_name_placeholder',
													)}
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
											<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
												<FormLabel className='sm:col-span-4 sm:pt-2'>
													{t('setting_model_provider_description')}
												</FormLabel>
												<Input
													type='text'
													className='sm:col-span-8'
													placeholder={t(
														'setting_model_provider_description_placeholder',
													)}
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
												<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
													<FormLabel className='sm:col-span-4 sm:pt-2'>
														{t('setting_model_provider_api_key')}
													</FormLabel>
													<Input
														type='password'
														className='sm:col-span-8'
														placeholder={t('setting_model_provider_api_key_placeholder')}
														{...field}
													/>
												</div>
												<FormMessage />
										</FormItem>
									)}
								/>
									<FormField
										control={form.control}
										name='model_provider_base_url'
										render={({ field }) => (
											<FormItem>
												<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
													<FormLabel className='sm:col-span-4 sm:pt-2'>
														{t('setting_model_provider_base_url')}
													</FormLabel>
													<Input
														className='sm:col-span-8'
														placeholder={t('setting_model_provider_base_url_placeholder')}
														{...field}
													/>
												</div>
												<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='model_name'
									render={({ field }) => (
										<FormItem>
											<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
												<FormLabel className='sm:col-span-4 sm:pt-2'>
													{t('setting_model_name')}
												</FormLabel>
												<Input
													className='sm:col-span-8'
													placeholder={t('setting_model_name_placeholder')}
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							</TabsContent>
						</Tabs>
						<Button
							type='submit'
							className='w-full rounded-2xl'
							disabled={isSubmitting}>
							{t('save')}
							{isSubmitting && (
								<Loader2 className='animate-spin size-4' />
							)}
						</Button>
					</form>
				</Form>
			)}
			{models?.data && models?.data?.length > 0 && (
				<div className='flex flex-col items-center justify-center gap-4 rounded-[24px] border border-emerald-500/15 bg-emerald-500/5 px-5 py-10 text-center'>
					<CircleCheck className='size-12 text-emerald-600' />
					<p className='text-sm text-muted-foreground'>{t('done')}</p>
				</div>
			)}
		</>
	);
};

export default InitMineModel;
