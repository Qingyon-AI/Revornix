'use client';
import { useEffect, useState, useTransition } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { searchAiModel, updateAiModelProvider } from '@/service/ai';
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
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, PlusCircle } from 'lucide-react';
import { ModelProvider } from '@/generated';
import { Separator } from '../ui/separator';
import ModelCard from './model-card';
import ModelAddCard from './model-add-card';
import { Badge } from '../ui/badge';

interface ModelCardProps {
	modelProvider: ModelProvider;
}

const formSchema = z.object({
	api_key: z.string().min(1, 'API Key is required'),
	api_url: z.string().optional(),
});

const ModelProviderCard = ({ modelProvider }: ModelCardProps) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			api_key: '',
			api_url: '',
		},
	});
	const [showModelConfigDialog, setShowModelConfigDialog] = useState(false);
	const [showAddModel, setShowAddModel] = useState(false);
	const [showModelProviderConfigDialog, setShowModelProviderConfigDialog] =
		useState(false);
	const [submitUpdating, startSubmitUpdating] = useTransition();

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
			toast.success('更新成功');
			setShowModelProviderConfigDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['getModelProviders'],
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
				open={showModelConfigDialog}
				onOpenChange={setShowModelConfigDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>供应商模型配置</DialogTitle>
						<DialogDescription>
							这里可以配置对应供应商可提供的所有模型
						</DialogDescription>
					</DialogHeader>
					<div className='max-h-[80vh] flex flex-col gap-2'>
						{models?.data?.length === 0 && (
							<div className='rounded p-3 text-xs bg-muted text-center text-muted-foreground'>
								暂无模型
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
							增加模型
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
			<Card key={modelProvider.id}>
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
							配置供应
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div
						className='text-xs bg-muted rounded p-3 text-center cursor-pointer'
						onClick={() => {
							setShowModelConfigDialog(true);
						}}>
						配置模型组
					</div>
				</CardContent>
				<CardFooter className='flex flex-row items-center justify-end gap-2'>
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
				</CardFooter>
			</Card>
		</>
	);
};

export default ModelProviderCard;
