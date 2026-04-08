import { Button } from '../ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { Loader2, PlusCircleIcon } from 'lucide-react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
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
import { getProvidedEngines, createEngine } from '@/service/engine';
import { Separator } from '../ui/separator';
import { EngineCategory, EngineCategoryList } from '@/enums/engine';
import { EngineBillingMode } from '@/enums/engine-billing';
import { AccessPlanLevel } from '@/enums/product';
import { getPlanLevelTranslationKey } from '@/lib/subscription';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '../ui/switch';
import ResourceSelectEmptyState from './resource-select-empty-state';
import { Boxes } from 'lucide-react';
import EngineBillingPolicyFields from './engine-billing-policy-fields';

const EngineAddButton = () => {
	const t = useTranslations();
	const locale = useLocale();
	const { refreshMainUserInfo } = useUserContext();
	const [engineCategory, setEngineCategory] = useState(EngineCategory.Markdown);
	const [showMineEngineAddDialog, setShowMineEngineAddDialog] = useState(false);
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
	const isPublic = form.watch('is_public');
	const queryClient = getQueryClient();
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
			setShowMineEngineAddDialog(false);
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
			required_plan_level: values.is_public
				? values.required_plan_level
				: AccessPlanLevel.FREE,
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
		<Dialog
			open={showMineEngineAddDialog}
			onOpenChange={setShowMineEngineAddDialog}>
			<DialogTrigger asChild>
				<Button>
					{t('setting_engine_page_engine_add_title')}
					<PlusCircleIcon />
				</Button>
			</DialogTrigger>
			<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-3xl'>
				<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
					<DialogTitle>{t('setting_engine_page_engine_add_title')}</DialogTitle>
					<DialogDescription>
						{t('setting_engine_page_engine_add_description')}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						className='flex min-h-0 flex-1 flex-col'
						id='install_form'
						onSubmit={handleSubmit}>
						<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
							<div className='flex flex-col gap-5'>
						<Field className='grid grid-cols-12 gap-2'>
							<FieldLabel className='col-span-3'>
								{t('setting_engine_page_engine_form_engine_category')}
							</FieldLabel>
							<div className='col-span-9'>
								<Select
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
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('setting_engine_page_engine_form_engine_id')}
										</FormLabel>
										<div className='col-span-9'>
											<Select
												onValueChange={(value) => field.onChange(Number(value))}
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
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('setting_engine_page_engine_form_title')}
										</FormLabel>
										<div className='col-span-9'>
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
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t('setting_engine_page_engine_form_description')}
										</FormLabel>
										<div className='col-span-9'>
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
						{provideEngines?.data.find((item) => {
							return item.id === form.watch('engine_id');
						})?.demo_config && (
							<>
								<FormField
									name='config_json'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<div className='grid grid-cols-12 gap-2'>
													<FormLabel className='col-span-3'>
														{t('setting_engine_page_engine_form_config_json')}
													</FormLabel>
													<div className='col-span-9'>
														<Textarea
															placeholder={t(
																'setting_engine_page_engine_form_config_json_placeholder',
															)}
															className='font-mono break-all'
															{...field}
															value={field.value ?? ''}
														/>
													</div>
												</div>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
								<div className='grid grid-cols-12 gap-2'>
									<FormLabel className='col-span-3'>
										{t('setting_engine_page_mine_engine_config_demo')}
									</FormLabel>
									<div className='col-span-9 p-5 rounded bg-muted font-mono text-sm break-all'>
										{
											provideEngines?.data.find((item) => {
												return item.id === form.watch('engine_id');
											})?.demo_config
										}
									</div>
								</div>
							</>
						)}
						<FormField
							name='is_public'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem className='rounded-lg border border-input p-3'>
										<div className='flex flex-row gap-1 items-center justify-between'>
											<FormLabel className='flex flex-row gap-1 items-center'>
												{t('setting_model_provider_is_public')}
											</FormLabel>
											<Switch
												checked={field.value}
												onCheckedChange={(e) => {
													field.onChange(e);
												}}
											/>
										</div>
									<FormDescription>
										{t('setting_engine_page_mine_engine_is_public_tips')}
									</FormDescription>
									{isPublic && (
										<div className='flex flex-row justify-between gap-3 rounded-xl border border-input/70 bg-background/60 p-3'>
											<div className='space-y-1'>
												<div className='text-sm font-medium'>
													{t('setting_required_plan_level_label')}
												</div>
												<p className='text-xs text-muted-foreground'>
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
												<SelectTrigger className='w-fit'>
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
															<SelectItem
																key={level}
																value={String(level)}>
																{t(getPlanLevelTranslationKey(level))}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
										</div>
									)}
								</FormItem>
								);
							}}
						/>
						<EngineBillingPolicyFields form={form} />
							</div>
						</div>
						<DialogFooter className='sticky bottom-0 z-10 flex flex-row items-center justify-end border-t border-border/60 bg-background px-6 py-4'>
					<DialogClose asChild>
						<Button type='button' variant={'secondary'}>
							{t('cancel')}
						</Button>
					</DialogClose>
					<Button
						type='submit'
						form='install_form'
						disabled={mutateCreateEngine.isPending}>
						{t('confirm')}
						{mutateCreateEngine.isPending && (
							<Loader2 className='animate-spin' />
						)}
					</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};
export default EngineAddButton;
