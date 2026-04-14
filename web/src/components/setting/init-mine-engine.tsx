'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form';
import { useState } from 'react';
import { useUserContext } from '@/provider/user-provider';
import { Input } from '../ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import {
	getProvidedEngines,
	createEngine,
	searchUableEngines,
} from '@/service/engine';
import { EngineCategory, EngineCategoryList } from '@/enums/engine';
import { EngineBillingMode } from '@/enums/engine-billing';
import { AccessPlanLevel } from '@/enums/product';
import { getPlanLevelTranslationKey } from '@/lib/subscription';
import { Field, FieldLabel } from '@/components/ui/field';
import { Button } from '../ui/button';
import { CircleCheck, Loader2 } from 'lucide-react';
import { Switch } from '../ui/switch';
import ResourceSelectEmptyState from './resource-select-empty-state';
import { Boxes } from 'lucide-react';
import EngineBillingPolicyFields from './engine-billing-policy-fields';
import EngineConfigFields from './engine-config-fields';

const InitMineEngine = () => {
	const t = useTranslations();
	const locale = useLocale();
	const { refreshMainUserInfo } = useUserContext();
	const [engineCategory, setEngineCategory] = useState(EngineCategory.Markdown);
	const formSchema = z.object({
		engine_id: z.number().int(),
		name: z.string(),
		description: z.string().optional().nullable(),
		required_plan_level: z.number().int(),
		is_official_hosted: z.boolean(),
		billing_mode: z.number().int(),
		billing_unit_price: z.number().positive(),
		compute_point_multiplier: z.number().positive(),
		config_json: z.string().optional().nullable(),
		is_public: z.boolean(),
	});
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			description: '',
			required_plan_level: AccessPlanLevel.FREE,
			is_official_hosted: false,
			billing_mode: EngineBillingMode.TOKEN,
			billing_unit_price: 1,
			compute_point_multiplier: 1,
			config_json: '',
			is_public: false,
		},
	});
	const queryClient = getQueryClient();

	const { data: usableEngines } = useQuery({
		queryKey: ['searchMyEngine', EngineCategory.Markdown],
		queryFn: async () => {
			const res = await searchUableEngines({
				keyword: '',
				filter_category: EngineCategory.Markdown,
			});
			return res;
		},
	});

	const {
		data: provideEngines,
		isFetching: isFetchingProvideEngines,
		isRefetching: isRefetchingProvideEngines,
	} = useQuery({
		queryKey: ['provide-engine', engineCategory],
		queryFn: async () => {
			return await getProvidedEngines({
				keyword: '',
				filter_category: engineCategory,
			});
		},
	});
	const selectedEngine = provideEngines?.data.find((item) => {
		return item.id === form.watch('engine_id');
	});
	const mutateCreateEngine = useMutation({
		mutationFn: createEngine,
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey.includes('searchCommunityEngines') ||
						query.queryKey.includes('searchMyEngine')
					);
				},
			});
			refreshMainUserInfo();
			form.reset();
		},
		onError: (error) => {
			toast.error(error.message);
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

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateCreateEngine.mutateAsync({
			engine_provided_id: values.engine_id,
			name: values.name,
			description: values.description,
			required_plan_level: values.required_plan_level,
			is_official_hosted: values.is_official_hosted,
			billing_mode: values.billing_mode,
			billing_unit_price: values.billing_unit_price,
			compute_point_multiplier: values.compute_point_multiplier,
			config_json: values.config_json,
			is_public: values.is_public,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			{usableEngines?.data && usableEngines?.data?.length === 0 && (
				<Form {...form}>
					<form
						className='flex flex-col gap-5'
						id='install_form'
						onSubmit={handleSubmit}>
						<Field className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
							<FieldLabel className='sm:col-span-4 sm:pt-2'>
								{t('setting_engine_page_engine_form_engine_category')}
							</FieldLabel>
							<div className='sm:col-span-8'>
								<Select
									disabled
									onValueChange={(e) => {
										setEngineCategory(Number(e));
									}}
									value={engineCategory.toString()}>
									<SelectTrigger className='w-full'>
										<SelectValue
											placeholder={t(
												'setting_engine_page_engine_form_engine_category_placeholder',
											)}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{EngineCategoryList?.map((item) => {
												return (
													<SelectItem
														key={item.id}
														value={String(item.id)}
														className='w-full'>
														{locale === 'zh' ? item.zh : item.en}
													</SelectItem>
												);
											})}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						</Field>
						<FormField
							control={form.control}
							name='engine_id'
							render={({ field }) => (
								<FormItem>
									<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
										<FormLabel className='sm:col-span-4 sm:pt-2'>
											{t('setting_engine_page_engine_form_engine_id')}
										</FormLabel>
										<div className='sm:col-span-8'>
											<Select
												onValueChange={(value) => {
													field.onChange(Number(value));
													form.setValue('config_json', '', {
														shouldDirty: true,
														shouldValidate: true,
													});
												}}
												value={field.value ? String(field.value) : undefined}>
												<SelectTrigger className='w-full'>
													<SelectValue
														placeholder={t(
															'setting_engine_page_engine_form_engine_id_placeholder',
														)}
													/>
												</SelectTrigger>
												<SelectContent>
													{!isFetchingProvideEngines &&
													!isRefetchingProvideEngines &&
													(provideEngines?.data?.length ?? 0) === 0 ? (
														<ResourceSelectEmptyState
															icon={Boxes}
															title={t('setting_default_engine_empty_title')}
															description={t(
																'setting_default_engine_empty_description',
															)}
															actionLabel={t('setting_default_engine_empty_action')}
															href='/setting/engine'
														/>
													) : (
														<SelectGroup>
															{provideEngines?.data.map((item) => {
																return (
																	<SelectItem
																		key={item.id}
																		value={String(item.id)}
																		className='w-full'>
																		{locale === 'zh' ? item.name_zh : item.name}
																	</SelectItem>
																);
															})}
														</SelectGroup>
													)}
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
							name='name'
							render={({ field }) => (
								<FormItem>
									<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
										<FormLabel className='sm:col-span-4 sm:pt-2'>
											{t('setting_engine_page_engine_form_title')}
										</FormLabel>
										<div className='sm:col-span-8'>
											<Input
												{...field}
												placeholder={t(
													'setting_engine_page_engine_form_title_placeholder',
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
									<div className='grid gap-2 sm:grid-cols-12 sm:gap-3'>
										<FormLabel className='sm:col-span-4 sm:pt-2'>
											{t('setting_engine_page_engine_form_description')}
										</FormLabel>
										<div className='sm:col-span-8'>
											<Textarea
												{...field}
												placeholder={t(
													'setting_engine_page_engine_form_description_placeholder',
												)}
												value={field.value || ''}
											/>
										</div>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
						{selectedEngine?.demo_config && (
							<FormField
								name='config_json'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<EngineConfigFields
												engineName={selectedEngine.name}
												demoConfig={selectedEngine.demo_config}
												value={field.value ?? ''}
												onChange={(nextValue) => {
													field.onChange(nextValue);
												}}
											/>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						)}
						<FormField
							name='is_public'
							control={form.control}
							render={({ field }) => (
								<FormItem className='rounded-xl border border-input/70 bg-background/60 p-4'>
									<div className='space-y-4'>
										<div className='flex flex-row items-center justify-between gap-3'>
											<div className='space-y-1'>
												<FormLabel className='flex flex-row items-center gap-1 text-sm font-medium'>
													{t('setting_model_provider_is_public')}
												</FormLabel>
												<FormDescription className='text-xs leading-5 text-muted-foreground'>
													{t('setting_engine_page_mine_engine_is_public_tips')}
												</FormDescription>
											</div>
											<Switch
												checked={field.value}
												onCheckedChange={(value) => {
													field.onChange(value);
												}}
											/>
										</div>
										{field.value && (
											<div className='flex flex-row items-center justify-between gap-3 border-t border-input/70 pt-4'>
												<div className='space-y-1'>
													<div className='text-sm font-medium'>
														{t('setting_required_plan_level_label')}
													</div>
													<p className='text-xs leading-5 text-muted-foreground'>
														{t('setting_required_plan_level_tips')}
													</p>
												</div>
												<Select
													onValueChange={(value) =>
														form.setValue(
															'required_plan_level',
															Number(value),
															{
																shouldDirty: true,
																shouldValidate: true,
															},
														)
													}
													value={String(
														form.watch('required_plan_level') ??
															AccessPlanLevel.FREE,
													)}>
													<SelectTrigger className='w-28'>
														<SelectValue
															placeholder={t(
																'setting_required_plan_level_placeholder',
															)}
														/>
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															{[
																AccessPlanLevel.FREE,
																AccessPlanLevel.PRO,
																AccessPlanLevel.MAX,
															].map((level) => (
																<SelectItem key={level} value={String(level)}>
																	{t(getPlanLevelTranslationKey(level))}
																</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>
											</div>
										)}
									</div>
								</FormItem>
							)}
						/>
						<EngineBillingPolicyFields form={form} />
						<Button
							type='submit'
							className='w-full rounded-2xl'
							disabled={mutateCreateEngine.isPending}>
							{t('save')}
							{mutateCreateEngine.isPending && (
								<Loader2 className='animate-spin size-4' />
							)}
						</Button>
					</form>
				</Form>
			)}
			{usableEngines?.data && usableEngines?.data?.length > 0 && (
				<div className='flex flex-col items-center justify-center gap-4 rounded-[24px] border border-emerald-500/15 bg-emerald-500/5 px-5 py-10 text-center'>
					<CircleCheck className='size-12 text-emerald-600' />
					<p className='text-sm text-muted-foreground'>{t('done')}</p>
				</div>
			)}
		</>
	);
};

export default InitMineEngine;
