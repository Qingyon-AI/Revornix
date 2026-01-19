import { z } from 'zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getAiModelProvider, updateAiModelProvider } from '@/service/ai';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { Button } from '../ui/button';
import { Loader2, ShieldAlert, XCircleIcon } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Switch } from '../ui/switch';
import { useUserContext } from '@/provider/user-provider';
import { Alert, AlertTitle } from '../ui/alert';
import { diffValues } from '@/lib/utils';
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
import { Spinner } from '../ui/spinner';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Separator } from '../ui/separator';

const ModelProviderUpdate = ({
	modelProviderId,
}: {
	modelProviderId: number;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const formSchema = z.object({
		name: z.string().optional(),
		description: z.string().optional(),
		api_key: z.string().optional(),
		base_url: z.string().optional(),
		is_public: z.boolean().optional(),
	});
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			description: '',
			api_key: '',
			base_url: '',
		},
	});

	const [showModelProviderConfigDialog, setShowModelProviderConfigDialog] =
		useState(false);

	const initialValuesRef = useRef<z.infer<typeof formSchema> | null>(null);

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

	const mutateUpdate = useMutation({
		mutationFn: updateAiModelProvider,
		onSuccess: (data) => {
			toast.success(t('setting_model_provider_update_successful'));
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey.includes('getModelProviders') ||
						query.queryKey.includes('getModels')
					);
				},
			});
			queryClient.invalidateQueries({
				queryKey: ['getModelProvider', modelProviderId],
			});
			setShowModelProviderConfigDialog(false);
		},
		onError(error, variables, onMutateResult, context) {
			toast.error(error.message);
			console.error(error);
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		if (!initialValuesRef.current) return;

		const patch = diffValues(values, initialValuesRef.current);

		// 如果啥都没改
		if (Object.keys(patch).length === 0) {
			toast.info(t('form_no_change'));
			return;
		}

		mutateUpdate.mutate({
			id: modelProviderId,
			...patch,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const {
		data: modelProvider,
		isFetching,
		isSuccess,
		isError,
		refetch,
		error,
	} = useQuery({
		queryKey: ['getModelProvider', modelProviderId],
		queryFn: () => {
			return getAiModelProvider({
				provider_id: modelProviderId,
			});
		},
		enabled: showModelProviderConfigDialog,
	});

	useEffect(() => {
		if (!modelProvider) return;

		const initialFormValues: z.infer<typeof formSchema> = {
			name: modelProvider.name ?? '',
			description: modelProvider.description ?? '',
			api_key: ('api_key' in modelProvider ? modelProvider.api_key : '') ?? '',
			base_url:
				('base_url' in modelProvider ? modelProvider.base_url : '') ?? '',
			is_public: modelProvider.is_public ?? false,
		};

		form.reset(initialFormValues);
		initialValuesRef.current = initialFormValues; // ✅ 存表单结构
	}, [modelProvider, modelProviderId, showModelProviderConfigDialog]);

	const authorized = useMemo(() => {
		return mainUserInfo && mainUserInfo.id === modelProvider?.creator.id;
	}, [modelProvider?.creator.id, mainUserInfo]);

	return (
		<Dialog
			open={showModelProviderConfigDialog}
			onOpenChange={(open) => {
				setShowModelProviderConfigDialog(open);
				if (open) {
					refetch(); // ✅ 每次打开都拉最新
				}
			}}>
			<DialogTrigger asChild>
				<Button
					className='shadow-none'
					variant={'outline'}
					onClick={() => {
						setShowModelProviderConfigDialog(true);
					}}>
					{t('setting_model_provider_configure')}
				</Button>
			</DialogTrigger>
			<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>{modelProvider?.name}</DialogTitle>
					<DialogDescription className='break-all'>
						{modelProvider?.description}
					</DialogDescription>
				</DialogHeader>
				{!modelProvider && isFetching && (
					<div className='bg-muted text-xs text-muted-foreground p-5 rounded flex flex-row items-center justify-center gap-2'>
						<span>{t('loading')}</span>
						<Spinner />
					</div>
				)}

				{!modelProvider && isError && error && (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<XCircleIcon />
							</EmptyMedia>
							<EmptyDescription>{error.message}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				{isSuccess && modelProvider && (
					<Form {...form}>
						<form
							className='flex flex-col gap-5'
							onSubmit={handleSubmit}
							id='update_form'>
							<FormField
								control={form.control}
								name='name'
								render={({ field }) => (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('setting_model_provider_name')}
											</FormLabel>
											<Input
												className='col-span-9'
												placeholder='Name'
												{...field}
												value={field.value ?? ''}
												disabled={!authorized}
											/>
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
												{t('setting_model_provider_description')}
											</FormLabel>
											<Input
												className='col-span-9'
												placeholder='Description'
												{...field}
												value={field.value ?? ''}
												disabled={!authorized}
											/>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
							{mainUserInfo &&
								mainUserInfo.id === modelProvider?.creator.id && (
									<>
										<FormField
											control={form.control}
											name='api_key'
											render={({ field }) => (
												<FormItem>
													<div className='grid grid-cols-12 gap-2'>
														<FormLabel className='col-span-3'>
															API Key
														</FormLabel>
														<Input
															type='password'
															className='col-span-9'
															placeholder='API Key'
															{...field}
															value={field.value ?? ''}
															disabled={!authorized}
														/>
													</div>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name='base_url'
											render={({ field }) => (
												<FormItem>
													<div className='grid grid-cols-12 gap-2'>
														<FormLabel className='col-span-3'>
															Base Url
														</FormLabel>
														<Input
															className='col-span-9'
															placeholder='Base Url'
															{...field}
															value={field.value ?? ''}
															disabled={!authorized}
														/>
													</div>
													<FormMessage />
												</FormItem>
											)}
										/>
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
																checked={field.value}
																onCheckedChange={(e) => {
																	field.onChange(e);
																}}
																disabled={!authorized}
															/>
														</div>
														<FormDescription>
															{t('setting_model_provider_is_public_tips')}
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
								disabled={mutateUpdate.isPending}>
								{t('confirm')}
								{mutateUpdate.isPending && <Loader2 className='animate-spin' />}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ModelProviderUpdate;
