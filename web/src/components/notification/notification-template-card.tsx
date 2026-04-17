'use client';

import { useMemo, useState } from 'react';
import { InfiniteData, useMutation } from '@tanstack/react-query';
import { Loader2, XCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { toast } from 'sonner';

import { getQueryClient } from '@/lib/get-query-client';
import {
	filterInfiniteQueryElements,
	mapInfiniteQueryElements,
} from '@/lib/infinite-query-cache';
import { formatInUserTimeZone } from '@/lib/time';
import { replacePath } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import {
	deleteNotificationTemplate,
	forkNotificationTemplate,
	type InifiniteScrollPagnitionNotificationTemplate,
	type NotificationTemplateItem,
} from '@/service/notification';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

const NotificationTemplateCard = ({
	notification_template,
	onEdit,
}: {
	notification_template: NotificationTemplateItem;
	onEdit: (template: NotificationTemplateItem) => void;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();
	const { refreshMainUserInfo, mainUserInfo } = useUserContext();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const isMineNotificationTemplate = useMemo(() => {
		return !!mainUserInfo && mainUserInfo.id === notification_template.creator.id;
	}, [notification_template.creator.id, mainUserInfo]);

	const deleteMutation = useMutation({
		mutationFn: deleteNotificationTemplate,
		onMutate() {
			const previousTemplates = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionNotificationTemplate>
			>({
				queryKey: ['searchNotificationTemplates'],
			});

			filterInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationTemplate,
				NotificationTemplateItem
			>(queryClient, ['searchNotificationTemplates'], (item) => {
				return item.id !== notification_template.id;
			});

			return { previousTemplates };
		},
		onError(error, _variables, context) {
			context?.previousTemplates?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
			toast.error(error.message);
		},
		onSuccess() {
			toast.success(t('notification_template_manage_delete_success'));
			queryClient.invalidateQueries({
				queryKey: ['searchUsableNotificationTemplates'],
			});
			queryClient.invalidateQueries({
				queryKey: ['notification-template'],
			});
			setShowDeleteDialog(false);
		},
	});

	const forkMutation = useMutation({
		mutationFn: forkNotificationTemplate,
		onMutate(variables) {
			const previousTemplates = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionNotificationTemplate>
			>({
				queryKey: ['searchNotificationTemplates'],
			});

			mapInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationTemplate,
				NotificationTemplateItem
			>(queryClient, ['searchNotificationTemplates'], (item) => {
				if (item.id !== notification_template.id) return item;
				return {
					...item,
					is_forked: variables.status,
				};
			});

			return { previousTemplates };
		},
		onSuccess() {
			refreshMainUserInfo();
			queryClient.invalidateQueries({
				queryKey: ['searchUsableNotificationTemplates'],
			});
			queryClient.invalidateQueries({
				queryKey: ['notification-template'],
			});
		},
		onError(error, _variables, context) {
			context?.previousTemplates?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
			toast.error(error.message);
		},
	});

	return (
		<Card className='h-full'>
			<CardHeader className='flex-1'>
				<CardTitle className='flex w-full min-w-0 flex-row items-center'>
					<div className='flex min-w-0 flex-1 flex-row flex-wrap items-center gap-2 break-all'>
						<span className='line-clamp-2'>{notification_template.name}</span>
					</div>
					{isMineNotificationTemplate && (
						<AlertDialog
							open={showDeleteDialog}
							onOpenChange={setShowDeleteDialog}>
							<AlertDialogTrigger asChild>
								<Button
									size='icon'
									type='button'
									variant='ghost'
									className='ml-auto'>
									<XCircleIcon className='size-4' />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t('tip')}</AlertDialogTitle>
									<AlertDialogDescription>
										{t('notification_template_manage_delete_description')}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<Button
										variant='destructive'
										onClick={async () => {
											const res = await deleteMutation.mutateAsync({
												notification_template_id: notification_template.id,
											});
											if (res.success) {
												setShowDeleteDialog(false);
											}
										}}
										disabled={deleteMutation.isPending}>
										{t('confirm')}
										{deleteMutation.isPending && (
											<Loader2 className='animate-spin' />
										)}
									</Button>
									<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</CardTitle>
				<CardDescription className='flex flex-1 flex-col'>
					<span className='mb-2 line-clamp-4'>
						{notification_template.description || t('empty')}
					</span>
					<div className='flex flex-row flex-wrap items-center gap-1'>
						{notification_template.is_public && (
							<Badge className='rounded-full bg-amber-600/10 text-amber-500 shadow-none hover:bg-amber-600/10 dark:bg-amber-600/20'>
								<div className='mr-1 h-1.5 w-1.5 rounded-full bg-amber-500' />
								{t('notification_template_manage_public_badge')}
							</Badge>
						)}
					</div>
				</CardDescription>
			</CardHeader>
			<CardContent className='relative flex flex-row items-center justify-between gap-2'>
				<div className='min-w-0 flex-1 text-sm text-muted-foreground'>
					{notification_template.parameters.length > 0
						? notification_template.parameters.map((item) => item.key).join(', ')
						: t('notification_template_manage_parameters_empty')}
				</div>
				<div className='flex flex-row items-center gap-2'>
					{isMineNotificationTemplate && (
						<Button variant='outline' className='shadow-none' onClick={() => onEdit(notification_template)}>
							{t('edit')}
						</Button>
					)}
					{!isMineNotificationTemplate && (
						<>
							{!notification_template.is_forked && (
								<Button
									className='shadow-none'
									variant='outline'
									disabled={forkMutation.isPending}
									onClick={() =>
										forkMutation.mutate({
											notification_template_id: notification_template.id,
											status: true,
										})
									}>
									{t('notification_template_manage_fork')}
									{forkMutation.isPending && (
										<Loader2 className='h-4 w-4 animate-spin' />
									)}
								</Button>
							)}
							{notification_template.is_forked && (
								<Button
									className='shadow-none text-xs'
									variant='destructive'
									disabled={forkMutation.isPending}
									onClick={() =>
										forkMutation.mutate({
											notification_template_id: notification_template.id,
											status: false,
										})
									}>
									{t('notification_template_manage_unfork')}
									{forkMutation.isPending && (
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
					title={notification_template.creator.nickname || 'Unknown User'}
					onClick={(e) => {
						router.push(`/user/detail/${notification_template.creator.id}`);
						e.preventDefault();
						e.stopPropagation();
					}}>
					<AvatarImage
						src={
							replacePath(
								notification_template.creator.avatar,
								notification_template.creator.id,
							) ?? ''
						}
						alt='user avatar'
						className='size-5 object-cover'
					/>
					<AvatarFallback className='size-5 font-semibold'>
						{notification_template.creator.nickname.slice(0, 1) ?? '?'}
					</AvatarFallback>
				</Avatar>
				<span className='ml-2 text-xs text-muted-foreground'>
					{notification_template.creator.nickname}
				</span>
				<span className='ml-auto text-xs text-muted-foreground'>
					{notification_template.create_time &&
						formatInUserTimeZone(
							notification_template.create_time,
							'yyyy-MM-dd HH:mm',
						)}
				</span>
			</CardFooter>
		</Card>
	);
};

export default NotificationTemplateCard;
