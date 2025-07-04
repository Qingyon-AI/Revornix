'use client';
import { useEffect, useState, useTransition } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
	deleteAiModelProvider,
	searchAiModel,
	updateAiModelProvider,
} from '@/service/ai';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { utils } from '@kinda/utils';
import { getQueryClient } from '@/lib/get-query-client';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, PlusCircle } from 'lucide-react';
import { ModelProvider } from '@/generated';
import { Separator } from '../ui/separator';
import ModelCard from './model-card';
import ModelAddCard from './model-add-card';
import { Badge } from '../ui/badge';
import { useUserContext } from '@/provider/user-provider';

interface ModelCardProps {
	modelProvider: ModelProvider;
}

const ModelProviderCard = ({ modelProvider }: ModelCardProps) => {
	const t = useTranslations();
	const { refreshUserInfo } = useUserContext();
	const formSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		description: z.string().optional(),
		api_key: z.string().min(1, 'API Key is required'),
		api_url: z.string().optional(),
	});
	const queryClient = getQueryClient();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			api_key: '',
			api_url: '',
		},
	});
	const [showDeleteModelProviderDialog, setShowDeleteModelProviderDialog] =
		useState(false);
	const [showModelConfigDialog, setShowModelConfigDialog] = useState(false);
	const [showAddModel, setShowAddModel] = useState(false);
	const [showModelProviderConfigDialog, setShowModelProviderConfigDialog] =
		useState(false);
	const [submitUpdating, startSubmitUpdating] = useTransition();
	const [deleteModelProviderLoading, startDeleteModelProvider] =
		useTransition();

	const { data: models } = useQuery({
		queryKey: ['getModels', modelProvider.id],
		queryFn: () => {
			return searchAiModel({
				provider_id: modelProvider.id,
				keyword: '',
			});
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

	const handleDeleteModelProvider = async () => {
		startDeleteModelProvider(async () => {
			const [res, err] = await utils.to(
				deleteAiModelProvider({
					provider_ids: [modelProvider.id],
				})
			);
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success(t('setting_model_provider_delete_successful'));
			setShowDeleteModelProviderDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['getModelProviders'],
			});
			queryClient.invalidateQueries({
				queryKey: ['getModels'],
			});
			refreshUserInfo();
		});
	};

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		startSubmitUpdating(async () => {
			const [res, err] = await utils.to(
				updateAiModelProvider({
					id: modelProvider.id,
					...values,
				})
			);
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success(t('setting_model_provider_update_successful'));
			setShowModelProviderConfigDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['getModelProviders'],
			});
			queryClient.invalidateQueries({
				queryKey: ['getModels'],
			});
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	useEffect(() => {
		if (modelProvider) {
			form.reset({
				name: modelProvider.name,
				description: modelProvider.description,
				api_key: modelProvider.api_key,
				api_url: modelProvider.api_url,
			});
		}
	}, [modelProvider]);

	return (
		<>
			<Dialog
				open={showModelConfigDialog}
				onOpenChange={setShowModelConfigDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('setting_model_models_configure')}</DialogTitle>
						<DialogDescription>
							{t('setting_model_models_configure_description')}
						</DialogDescription>
					</DialogHeader>
					<div className='max-h-[80vh] flex flex-col gap-2'>
						{models?.data?.length === 0 && (
							<div className='rounded p-3 text-xs bg-muted text-center text-muted-foreground'>
								{t('setting_model_empty')}
							</div>
						)}
						<div className='flex-1 overflow-auto flex flex-col gap-2'>
							{models &&
								models.data?.map((model, index) => {
									return <ModelCard key={index} model={model} />;
								})}
							{showAddModel && (
								<ModelAddCard
									modelProvider={modelProvider}
									onCancel={() => setShowAddModel(false)}
									onSuccess={() => {
										queryClient.invalidateQueries({
											queryKey: ['getModels', modelProvider.id],
										});
										queryClient.invalidateQueries({
											queryKey: ['getModels'],
										});
										setShowAddModel(false);
									}}
								/>
							)}
						</div>
						<Separator className='my-5' />
						<div
							className='rounded flex flex-row bg-muted p-3 text-xs text-muted-foreground justify-center cursor-pointer'
							onClick={() => {
								setShowAddModel(true);
							}}>
							{t('setting_model_add')}
							<PlusCircle className='h-4 w-4 ml-1' />
						</div>
					</div>
				</DialogContent>
			</Dialog>
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
									name='name'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>{t('setting_model_provider_name')}</FormLabel>
												<Input
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
												<FormLabel className='col-span-3'>{t('setting_model_provider_description')}</FormLabel>
												<Input
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
								<Button type='submit' disabled={submitUpdating}>
									{t('save')}
									{submitUpdating && (
										<Loader2 className='h-4 w-4 animate-spin' />
									)}
								</Button>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>
			<Card>
				<CardHeader>
					<div className='flex flex-row items-center justify-between'>
						<div>
							<CardTitle>{modelProvider.name}</CardTitle>
							<CardDescription>{modelProvider.description}</CardDescription>
						</div>
						<Button
							variant={'outline'}
							className='text-xs shadow-none'
							onClick={() => {
								setShowModelProviderConfigDialog(true);
							}}>
							{t('setting_model_provider_configure')}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div
						className='text-xs bg-muted rounded p-3 text-center cursor-pointer'
						onClick={() => {
							setShowModelConfigDialog(true);
						}}>
						{t('setting_model_models_configure')}
					</div>
				</CardContent>
				<CardFooter className='flex flex-row items-center justify-between'>
					<div className='flex flex-row gap-2'>
						{modelProvider.api_key ? (
							<Badge
								variant={'outline'}
								className='text-xs text-muted-foreground'>
								KEY
							</Badge>
						) : (
							<Badge
								variant={'destructive'}
								className='text-xs text-muted-foreground'>
								KEY
							</Badge>
						)}
						{modelProvider.api_url ? (
							<Badge
								variant={'outline'}
								className='text-xs text-muted-foreground'>
								URL
							</Badge>
						) : (
							<Badge
								variant={'destructive'}
								className='text-xs text-muted-foreground'>
								URL
							</Badge>
						)}
					</div>
					<Dialog>
						<DialogTrigger asChild>
							<Button type='button' variant={'outline'}>
								{t('delete')}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{t('warning')}</DialogTitle>
								<DialogDescription>
									{t('setting_model_provider_delete_warning_description')}
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button
									variant='destructive'
									type='button'
									onClick={handleDeleteModelProvider}>
									{t('confirm')}
									{deleteModelProviderLoading && (
										<Loader2 className='h-4 w-4 animate-spin' />
									)}
								</Button>
								<DialogClose asChild>
									<Button variant='default'>{t('cancel')}</Button>
								</DialogClose>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardFooter>
			</Card>
		</>
	);
};

export default ModelProviderCard;
