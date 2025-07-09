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
import { updateUserDefaultModel } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';
import { CircleCheck } from 'lucide-react';

const InitMineModel = () => {
	const { refreshUserInfo } = useUserContext();
	const t = useTranslations();
	const formSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		description: z.string(),
		api_key: z.string().min(1, 'API Key is required'),
		api_url: z.string(),
		model_name: z.string(),
	});
	const queryClient = getQueryClient();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			description: '',
			api_key: '',
			api_url: '',
			model_name: '',
		},
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

	const mutateUpdateDefaultModel = useMutation({
		mutationFn: updateUserDefaultModel,
		onSuccess(data) {
			refreshUserInfo();
		},
		onError(error) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		const res1 = await mutateAddAiModelProvider.mutateAsync({
			name: values.name,
			description: values.description,
			api_key: values.api_key,
			api_url: values.api_url,
		});
		const res2 = await mutateAddModel.mutateAsync({
			name: values.model_name,
			description: values.model_name,
			api_key: '',
			api_url: '',
			provider_id: res1.id,
		});
		await mutateUpdateDefaultModel.mutateAsync({
			default_revornix_model_id: res2.id,
			default_document_reader_model_id: res2.id,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			{models?.data &&
				models?.data?.length === 0 &&
				modelProviders?.data &&
				modelProviders?.data?.length === 0 && (
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
								name='description'
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
											/>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='api_url'
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
					<div className='bg-muted rounded p-5 py-12 flex flex-col justify-center items-center gap-2'>
						<CircleCheck className='size-28 text-muted-foreground' />
						<p>完成</p>
					</div>
				)}
		</>
	);
};

export default InitMineModel;
