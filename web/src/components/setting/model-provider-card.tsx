'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	deleteAiModelProvider,
	forkAiModelProvider,
	searchAiModel,
} from '@/service/ai';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
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
import { Globe2Icon, Loader2, PlusCircle, XCircleIcon } from 'lucide-react';
import { ModelProvider } from '@/generated';
import { Separator } from '../ui/separator';
import ModelCard from './model-card';
import ModelAddCard from './model-add-card';
import { useUserContext } from '@/provider/user-provider';
import ModelProviderUpdate from './model-provider-update';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useRouter } from 'nextjs-toploader/app';
import { Badge } from '../ui/badge';
import { replacePath } from '@/lib/utils';
import { formatInUserTimeZone } from '@/lib/time';

interface ModelCardProps {
	modelProvider: ModelProvider;
}

const ModelProviderCard = ({ modelProvider }: ModelCardProps) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const router = useRouter();
	const { refreshMainUserInfo } = useUserContext();

	const queryClient = getQueryClient();

	const [showDeleteModelProviderDialog, setShowDeleteModelProviderDialog] =
		useState(false);
	const [showModelConfigDialog, setShowModelConfigDialog] = useState(false);
	const [showAddModel, setShowAddModel] = useState(false);

	const { data: models } = useQuery({
		queryKey: ['getModels', modelProvider.id],
		queryFn: () => {
			return searchAiModel({
				provider_id: modelProvider.id,
				keyword: '',
			});
		},
	});

	const mutateDeleteModelProvider = useMutation({
		mutationFn: deleteAiModelProvider,
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey.includes('getModels') ||
						query.queryKey.includes('getModelProviders')
					);
				},
			});
			refreshMainUserInfo();
			toast.success(t('setting_model_provider_delete_successful'));
			setShowDeleteModelProviderDialog(false);
		},
		onError(error, variables, onMutateResult, context) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const mutateForkModelProvider = useMutation({
		mutationFn: forkAiModelProvider,
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey.includes('getModels') ||
						query.queryKey.includes('getModelProviders')
					);
				},
			});
			refreshMainUserInfo();
		},
		onError(error, variables, onMutateResult, context) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const isMineModelProvider = useMemo(() => {
		return mainUserInfo && mainUserInfo.id === modelProvider?.creator.id;
	}, [modelProvider?.creator.id, mainUserInfo]);

	return (
		<>
			<Card className='flex h-full flex-col'>
				<CardHeader className='flex flex-col flex-1'>
					<CardTitle className='flex flex-row items-center w-full'>
						<div className='flex flex-row items-center gap-2'>
							{modelProvider.name}
							{modelProvider.is_public && (
								<Badge className='bg-amber-600/10 dark:bg-amber-600/20 hover:bg-amber-600/10 text-amber-500 shadow-none rounded-full'>
									<Globe2Icon className='mr-1 size-3.5' />
									Public
								</Badge>
							)}
						</div>
						<Dialog
							open={showDeleteModelProviderDialog}
							onOpenChange={setShowDeleteModelProviderDialog}>
							<DialogTrigger asChild>
								<Button
									size={'icon'}
									type='button'
									variant={'ghost'}
									className='ml-auto'>
									<XCircleIcon className='size-4' />
								</Button>
							</DialogTrigger>
							<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-md'>
								<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
									<DialogTitle>{t('warning')}</DialogTitle>
									<DialogDescription>
										{t('setting_model_provider_delete_warning_description')}
									</DialogDescription>
								</DialogHeader>
								<div className='min-h-0 flex-1 px-6 py-5' />
								<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
									<Button
										variant='destructive'
										type='button'
										disabled={mutateDeleteModelProvider.isPending}
										onClick={() => {
											mutateDeleteModelProvider.mutate({
												provider_id: modelProvider.id,
											});
										}}>
										{t('confirm')}
										{mutateDeleteModelProvider.isPending && (
											<Loader2 className='h-4 w-4 animate-spin' />
										)}
									</Button>
									<DialogClose asChild>
										<Button variant='default'>{t('cancel')}</Button>
									</DialogClose>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</CardTitle>
					<CardDescription className='break-all flex-1'>
						{modelProvider.description}
					</CardDescription>
				</CardHeader>
				<CardContent className='w-full flex flex-col gap-3'>
					<div className='flex flex-row gap-2 items-center ml-auto'>
						<Dialog
							open={showModelConfigDialog}
							onOpenChange={setShowModelConfigDialog}>
							<DialogTrigger asChild>
								<Button type='button'>
									{t('setting_model_models_configure')}
								</Button>
							</DialogTrigger>
							<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-5xl'>
								<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
									<DialogTitle>
										{t('setting_model_models_configure')}
									</DialogTitle>
									<DialogDescription>
										{t('setting_model_models_configure_description')}
									</DialogDescription>
								</DialogHeader>
								<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
									{models?.data?.length === 0 && (
										<div className='rounded-xl border border-dashed border-input/70 bg-muted/40 p-4 text-sm text-center text-muted-foreground'>
											{t('setting_model_empty')}
										</div>
									)}
									<div className='flex items-center justify-between gap-3'>
										<div className='text-sm text-muted-foreground'>
											{t('setting_model_collection_manage_hint')}
										</div>
										<Button
											type='button'
											variant='outline'
											className='rounded-xl'
											onClick={() => {
												setShowAddModel(true);
											}}>
											{t('setting_model_add')}
											<PlusCircle className='ml-1 size-4' />
										</Button>
									</div>
									<div className='mt-4 space-y-3 pr-1'>
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
								</div>
							</DialogContent>
						</Dialog>
						<ModelProviderUpdate modelProviderId={modelProvider.id} />
						{!isMineModelProvider && (
							<>
								{!modelProvider.is_forked && (
									<Button
										className='shadow-none'
										variant={'outline'}
										disabled={mutateForkModelProvider.isPending}
										onClick={() => {
											mutateForkModelProvider.mutate({
												provider_id: modelProvider.id,
												status: true,
											});
										}}>
										{t('setting_model_provider_fork')}
										{mutateForkModelProvider.isPending && (
											<Loader2 className='h-4 w-4 animate-spin' />
										)}
									</Button>
								)}
								{modelProvider.is_forked && (
									<Button
										className='shadow-none text-xs'
										variant={'destructive'}
										disabled={mutateForkModelProvider.isPending}
										onClick={() => {
											mutateForkModelProvider.mutate({
												provider_id: modelProvider.id,
												status: false,
											});
										}}>
										{t('setting_model_provider_unfork')}
										{mutateForkModelProvider.isPending && (
											<Loader2 className='h-4 w-4 animate-spin' />
										)}
									</Button>
								)}
							</>
						)}
					</div>
				</CardContent>
				<CardFooter className='flex flex-row items-center'>
					<Avatar
						className='size-5'
						title={
							modelProvider.creator.nickname
								? modelProvider.creator.nickname
								: 'Unknown User'
						}
						onClick={(e) => {
							router.push(`/user/detail/${modelProvider.creator.id}`);
							e.preventDefault();
							e.stopPropagation();
						}}>
						<AvatarImage
							src={replacePath(
								modelProvider.creator.avatar,
								modelProvider.creator.id,
							)}
							alt='user avatar'
							className='size-5 object-cover'
						/>
						<AvatarFallback className='size-5 font-semibold'>
							{modelProvider.creator.nickname.slice(0, 1) ?? '?'}
						</AvatarFallback>
					</Avatar>
					<span className='text-xs text-muted-foreground ml-2'>
						{modelProvider.creator.nickname}
					</span>
					<span className='ml-auto text-xs text-muted-foreground'>
						{modelProvider.create_time &&
							formatInUserTimeZone(
								modelProvider.create_time,
								'yyyy-MM-dd HH:mm',
							)}
					</span>
				</CardFooter>
			</Card>
		</>
	);
};

export default ModelProviderCard;
