'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import {
	getAiModelProvider,
	searchAiModelProvider,
	updateAiModelProvider,
} from '@/service/ai';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { utils } from '@kinda/utils';
import { Loader2 } from 'lucide-react';
import { getQueryClient } from '@/lib/get-query-client';

const formSchema = z.object({
	api_key: z.string().min(1, 'API Key is required'),
	api_url: z.string().optional(),
});

const ModelSettingPage = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			api_key: '',
			api_url: '',
		},
	});
	const [showModelProviderConfigDialog, setShowModelProviderConfigDialog] =
		useState(false);
	const [chosedProviderId, setChosedProviderId] = useState<number | null>(null);

	const [submitUpdating, startSubmitUpdating] = useTransition();

	const {
		data: modelProviders,
		isFetching,
		error,
	} = useQuery({
		queryKey: ['getModelProviders'],
		queryFn: () =>
			searchAiModelProvider({
				keyword: '',
			}),
	});

	const { data: modelProvider } = useQuery({
		queryKey: ['getModelProvider', chosedProviderId],
		queryFn: () => {
			if (!chosedProviderId) {
				return null;
			}
			return getAiModelProvider({
				provider_id: chosedProviderId,
			});
		},
		enabled: !!chosedProviderId,
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
		if (!chosedProviderId) return;
		startSubmitUpdating(async () => {
			const [res, err] = await utils.to(
				updateAiModelProvider({
					id: chosedProviderId,
					...values,
				})
			);
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success('更新成功');
			setShowModelProviderConfigDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['getModelProvider', chosedProviderId],
			});
		});
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error(t('form_validate_failed'));
	};

	useEffect(() => {
		if (modelProvider) {
			form.reset({
				api_key: modelProvider.api_key,
				api_url: modelProvider.api_url,
			});
		}
	}, [modelProvider]);
	return (
		<>
			<Dialog
				open={showModelProviderConfigDialog}
				onOpenChange={setShowModelProviderConfigDialog}>
				<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
					<DialogHeader>
						<DialogTitle>{modelProvider?.name}</DialogTitle>
						<DialogDescription>{modelProvider?.description}</DialogDescription>
					</DialogHeader>
					<div>
						<Form {...form}>
							<form className='flex flex-col gap-5' onSubmit={handleSubmit}>
								<FormField
									control={form.control}
									name='api_key'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-2'>API Key</FormLabel>
												<Input
													type='password'
													className='col-span-10'
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
												<FormLabel className='col-span-2'>API Base</FormLabel>
												<Input
													className='col-span-10'
													placeholder='API Base'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type='submit' disabled={submitUpdating}>
									保存
									{submitUpdating && (
										<Loader2 className='h-4 w-4 animate-spin' />
									)}
								</Button>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>
			<div className='px-5 pb-5 w-full h-full'>
				{isFetching && <Skeleton className='w-full h-full' />}
				{!isFetching && modelProviders && modelProviders.data && (
					<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
						{modelProviders.data.map((modelProvider, index) => (
							<Card key={modelProvider.id}>
								<CardHeader>
									<CardTitle>{modelProvider.name}</CardTitle>
									<CardDescription>{modelProvider.description}</CardDescription>
								</CardHeader>
								<CardFooter className='flex justify-end'>
									<Button
										variant={'outline'}
										className='text-xs shadow-none'
										onClick={() => {
											setChosedProviderId(modelProvider.id);
											setShowModelProviderConfigDialog(true);
										}}>
										配置该模型供应
									</Button>
								</CardFooter>
							</Card>
						))}
					</div>
				)}
			</div>
		</>
	);
};

export default ModelSettingPage;
