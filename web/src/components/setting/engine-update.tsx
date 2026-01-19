import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
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
import { Separator } from '../ui/separator';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getQueryClient } from '@/lib/get-query-client';
import { getEngineDetail, updateEngine } from '@/service/engine';
import { Button } from '../ui/button';
import { Loader2, ShieldAlert, XCircleIcon } from 'lucide-react';
import { EngineCategory, EngineCategoryList } from '@/enums/engine';
import { Switch } from '../ui/switch';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUserContext } from '@/provider/user-provider';
import { Alert, AlertTitle } from '../ui/alert';
import { diffValues } from '@/lib/utils';
import { Spinner } from '../ui/spinner';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';

const EngineUpdate = ({ engineId }: { engineId: number }) => {
	const t = useTranslations();
	const locale = useLocale();

	const { mainUserInfo } = useUserContext();

	const [engineCategory, setEngineCategory] = useState(EngineCategory.Markdown);

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);

	const queryClient = getQueryClient();

	const formSchema = z.object({
		engine_id: z.number(),
		name: z.string().optional(),
		description: z.string().optional(),
		config_json: z.string().optional(),
		is_public: z.boolean().optional(),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			engine_id: engineId,
			name: '',
			description: '',
			config_json: '',
		},
	});

	const initialValuesRef = useRef<z.infer<typeof formSchema> | null>(null);

	const {
		data: engine_info,
		refetch: refetchEngineInfo,
		isFetching: isFetchingEngineInfo,
		isError: isErrorEngineInfo,
		error: errorEngineInfo,
		isSuccess: isSuccessEngineInfo,
	} = useQuery({
		queryKey: ['getEngineDetail', engineId],
		queryFn: async () => {
			return await getEngineDetail({
				engine_id: engineId,
			});
		},
		enabled: showUpdateDialog,
	});

	const mutateUpdateEngine = useMutation({
		mutationFn: updateEngine,
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate(query) {
					return query.queryKey.includes('searchCommunityEngines');
				},
			});
			toast.success(t('setting_engine_page_mine_engine_update_success'));
			setShowUpdateDialog(false);
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
		if (!initialValuesRef.current) return;

		const patch = diffValues(values, initialValuesRef.current);

		// 如果啥都没改
		if (Object.keys(patch).length === 0) {
			toast.info(t('form_no_change'));
			return;
		}

		mutateUpdateEngine.mutate({
			...values,
			engine_id: engineId,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	useEffect(() => {
		if (!engine_info) return;

		const initialFormValues: z.infer<typeof formSchema> = {
			engine_id: engineId,
			name: engine_info.name ?? '',
			description: engine_info.description ?? '',
			config_json: engine_info.config_json ?? '',
			is_public: engine_info.is_public ?? false,
		};

		setEngineCategory(engine_info.category);

		form.reset(initialFormValues);
		initialValuesRef.current = initialFormValues; // ✅ 存表单结构
	}, [engine_info, engineId, showUpdateDialog]);

	const authorized = useMemo(() => {
		return mainUserInfo && mainUserInfo.id === engine_info?.creator.id;
	}, [engine_info?.creator.id, mainUserInfo]);

	return (
		<Dialog
			open={showUpdateDialog}
			onOpenChange={(open) => {
				setShowUpdateDialog(open);
				if (open) {
					refetchEngineInfo(); // ✅ 每次打开都拉最新
				}
			}}>
			<DialogTrigger asChild>
				<Button className='text-xs shadow-none'>{t('config')}</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[80vh] flex flex-col'>
				<DialogHeader>
					<DialogTitle>{t('config')}</DialogTitle>
					{engine_info && (
						<DialogDescription>
							{t('setting_engine_page_mine_engine_config_description', {
								engine: engine_info?.name,
							})}
						</DialogDescription>
					)}
				</DialogHeader>

				{!engine_info && isFetchingEngineInfo && (
					<div className='bg-muted text-xs text-muted-foreground p-5 rounded flex flex-row items-center justify-center gap-2'>
						<span>{t('loading')}</span>
						<Spinner />
					</div>
				)}

				{!engine_info && isErrorEngineInfo && errorEngineInfo && (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<XCircleIcon />
							</EmptyMedia>
							<EmptyDescription>{errorEngineInfo.message}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}

				{isSuccessEngineInfo && engine_info && (
					<Form {...form}>
						<form
							onSubmit={handleSubmit}
							id='update_form'
							className='space-y-5 flex-1 overflow-auto'>
							<Field className='grid grid-cols-12 gap-2'>
								<FieldLabel className='col-span-3'>
									{t('setting_engine_page_engine_form_engine_category')}
								</FieldLabel>
								<div className='col-span-9'>
									<Select disabled value={engineCategory.toString()}>
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

							<FormItem>
								<div className='grid grid-cols-12 gap-2'>
									<FormLabel className='col-span-3'>
										{t('setting_engine_page_engine_form_engine_id')}
									</FormLabel>
									<div className='col-span-9'>
										<Select
											disabled
											value={engine_info.engine_provided.id.toString()}>
											<SelectTrigger className='w-full'>
												<SelectValue
													placeholder={t(
														'setting_engine_page_engine_form_engine_id_placeholder',
													)}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem
														value={String(
															engine_info.engine_provided.id.toString(),
														)}
														className='w-full'>
														{locale === 'zh'
															? engine_info.engine_provided.name_zh
															: engine_info.engine_provided.name}
													</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
									</div>
								</div>
								<FormMessage />
							</FormItem>

							<FormField
								name='name'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('setting_engine_page_engine_form_title')}
												</FormLabel>
												<div className='col-span-9'>
													<Input
														disabled={!authorized}
														{...field}
														placeholder={t(
															'setting_engine_page_engine_form_title_placeholder',
														)}
														value={field.value ?? ''}
													/>
												</div>
											</div>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='description'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('setting_engine_page_engine_form_description')}
												</FormLabel>
												<div className='col-span-9'>
													<Textarea
														disabled={!authorized}
														{...field}
														placeholder={t(
															'setting_engine_page_engine_form_description_placeholder',
														)}
														value={field.value ?? ''}
													/>
												</div>
											</div>
											<FormMessage />
										</FormItem>
									);
								}}
							/>

							{authorized && (
								<>
									{engine_info.engine_provided.demo_config && (
										<>
											<FormField
												name='config_json'
												control={form.control}
												render={({ field }) => {
													return (
														<FormItem>
															<div className='grid grid-cols-12 gap-2'>
																<FormLabel className='col-span-3'>
																	{t(
																		'setting_engine_page_engine_form_config_json',
																	)}
																</FormLabel>
																<div className='col-span-9'>
																	<Textarea
																		disabled={!authorized}
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
													{engine_info.engine_provided.demo_config}
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
													<div className='flex flex-row gap-1 items-center'>
														<FormLabel className='flex flex-row gap-1 items-center'>
															{t('setting_model_provider_is_public')}
														</FormLabel>
														<Switch
															disabled={!authorized}
															checked={field.value}
															onCheckedChange={(e) => {
																field.onChange(e);
															}}
														/>
													</div>
													<FormDescription>
														{t(
															'setting_engine_page_mine_engine_is_public_tips',
														)}
													</FormDescription>
												</FormItem>
											);
										}}
									/>
								</>
							)}
						</form>
					</Form>
				)}

				<Separator />
				<DialogFooter className='flex flex-row items-center'>
					{!authorized && (
						<Alert className='bg-amber-600/10 dark:bg-amber-600/15 text-amber-500 border-amber-500/50 dark:border-amber-600/50'>
							<ShieldAlert className='size-4' />
							<AlertTitle>{t('setting_engine_change_forbidden')}</AlertTitle>
						</Alert>
					)}
					{authorized && (
						<>
							<DialogClose asChild>
								<Button type='button' variant={'secondary'}>
									{t('cancel')}
								</Button>
							</DialogClose>
							<Button
								type='submit'
								form='update_form'
								disabled={mutateUpdateEngine.isPending}>
								{t('confirm')}
								{mutateUpdateEngine.isPending && (
									<Loader2 className='animate-spin' />
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default EngineUpdate;
