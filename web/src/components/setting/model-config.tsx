import { z } from 'zod';
import { useEffect, useMemo, useRef } from 'react';
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
import { Loader2, ShieldAlert } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Switch } from '../ui/switch';
import { useUserContext } from '@/provider/user-provider';
import { Alert, AlertTitle } from '../ui/alert';
import { diffValues } from '@/lib/utils';

const ModelConfig = ({
	modelProviderId,
	onUpdateSuccessfully,
}: {
	modelProviderId: number;
	onUpdateSuccessfully: () => void;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const formSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		description: z.string().optional().nullable(),
		api_key: z.string().optional().nullable(),
		base_url: z.string(),
		is_public: z.boolean(),
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
			onUpdateSuccessfully();
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

	const { data } = useQuery({
		queryKey: ['getModelProvider', modelProviderId],
		queryFn: () => {
			return getAiModelProvider({
				provider_id: modelProviderId,
			});
		},
	});

	useEffect(() => {
		if (!data) return;

		const initialFormValues: z.infer<typeof formSchema> = {
			name: data.name ?? '',
			description: data.description ?? '',
			api_key: ('api_key' in data ? data.api_key : '') ?? '',
			base_url: ('base_url' in data ? data.base_url : '') ?? '',
			is_public: data.is_public ?? false,
		};

		form.reset(initialFormValues);
		initialValuesRef.current = initialFormValues; // ✅ 存表单结构
	}, [data, modelProviderId]);

	const authorized = useMemo(() => {
		return mainUserInfo && mainUserInfo.id === data?.creator.id;
	}, [data?.creator.id, mainUserInfo]);

	return (
		<>
			<Form {...form}>
				<form className='flex flex-col gap-5' onSubmit={handleSubmit}>
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
					{mainUserInfo && mainUserInfo.id === data?.creator.id && (
						<>
							<FormField
								control={form.control}
								name='api_key'
								render={({ field }) => (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>API Key</FormLabel>
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
											<FormLabel className='col-span-3'>Base Url</FormLabel>
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
							<Button
								type='submit'
								disabled={mutateUpdate.isPending || !authorized}>
								{t('save')}
								{mutateUpdate.isPending && (
									<Loader2 className='h-4 w-4 animate-spin' />
								)}
							</Button>
						</>
					)}
					{!authorized && (
						<Alert className='bg-amber-600/10 dark:bg-amber-600/15 text-amber-500 border-amber-500/50 dark:border-amber-600/50'>
							<ShieldAlert className='size-4' />
							<AlertTitle>
								{t('setting_model_provider_change_forbidden')}
							</AlertTitle>
						</Alert>
					)}
				</form>
			</Form>
		</>
	);
};

export default ModelConfig;
