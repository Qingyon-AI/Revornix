import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertDialogContent,
} from '@/components/ui/alert-dialog';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useMemo, useState } from 'react';
import { InfiniteData, useMutation } from '@tanstack/react-query';
import {
	deleteNotificationTarget,
	forkNotificationTarget,
} from '@/service/notification';
import { Loader2, XCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { useUserContext } from '@/provider/user-provider';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
	InifiniteScrollPagnitionNotificationTarget,
	NotificationTarget,
} from '@/generated';
import { replacePath } from '@/lib/utils';
import { format } from 'date-fns';
import UpdateNotificationTarget from './update-notification-target';
import {
	filterInfiniteQueryElements,
	mapInfiniteQueryElements,
} from '@/lib/infinite-query-cache';

const NotificationTargetCard = ({
	notification_target,
}: {
	notification_target: NotificationTarget;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const { refreshMainUserInfo, mainUserInfo } = useUserContext();
	const queryClient = getQueryClient();

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const muteDeleteNotificationTarget = useMutation({
		mutationFn: deleteNotificationTarget,
		onMutate() {
			const previousTargets = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionNotificationTarget>
			>({
				queryKey: ['searchNotificationTargets'],
			});

			filterInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationTarget,
				NotificationTarget
			>(queryClient, ['searchNotificationTargets'], (item) => {
				return item.id !== notification_target.id;
			});

			return { previousTargets };
		},
		onError(error, variables, context) {
			context?.previousTargets?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
			toast.error(error.message);
		},
		onSuccess(data, variables, context) {
			toast.success(t('setting_notification_target_manage_delete_success'));
			setShowDeleteDialog(false);
		},
	});

	const mutateForkNotificationTarget = useMutation({
		mutationFn: forkNotificationTarget,
		onMutate(variables) {
			const previousTargets = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionNotificationTarget>
			>({
				queryKey: ['searchNotificationTargets'],
			});

			mapInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationTarget,
				NotificationTarget
			>(queryClient, ['searchNotificationTargets'], (item) => {
				if (item.id !== notification_target.id) return item;
				return {
					...item,
					is_forked: variables.status,
				};
			});

			return { previousTargets };
		},
		onSuccess: () => {
			refreshMainUserInfo();
		},
		onError(error, variables, context) {
			context?.previousTargets?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
			toast.error(error.message);
		},
	});

	const isMineNotificationTarget = useMemo(() => {
		return mainUserInfo && mainUserInfo.id === notification_target?.creator.id;
	}, [notification_target?.creator.id, mainUserInfo]);

	return (
		<Card>
			<CardHeader className='flex-1'>
				<CardTitle className='flex flex-row items-center w-full min-w-0'>
					<div className='flex flex-row items-center gap-2 flex-1 min-w-0 flex-wrap break-all'>
						<span className='line-clamp-2'>{notification_target.title}</span>
					</div>
					<AlertDialog
						open={showDeleteDialog}
						onOpenChange={setShowDeleteDialog}>
						<AlertDialogTrigger asChild>
							<Button
								size={'icon'}
								type='button'
								variant={'ghost'}
								className='ml-auto'>
								<XCircleIcon className='size-4' />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{t('tip')}</AlertDialogTitle>
								<AlertDialogDescription>
									{t('setting_notification_target_manage_delete_alert')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<Button
									variant={'destructive'}
									onClick={async () => {
										const res = await muteDeleteNotificationTarget.mutateAsync({
											notification_target_ids: [notification_target.id],
										});
										if (res.success) {
											setShowDeleteDialog(false);
										}
									}}
									disabled={muteDeleteNotificationTarget.isPending}>
									{t('confirm')}
									{muteDeleteNotificationTarget.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
								<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardTitle>
				<CardDescription className='flex flex-col flex-1'>
					<span className='mb-2'>{notification_target.description}</span>
					<div className='flex flex-row items-center gap-1'>
						{notification_target.is_public && (
							<Badge className='bg-amber-600/10 dark:bg-amber-600/20 hover:bg-amber-600/10 text-amber-500 shadow-none rounded-full'>
								<div className='h-1.5 w-1.5 rounded-full bg-amber-500 mr-1' />{' '}
								Public
							</Badge>
						)}
					</div>
				</CardDescription>
			</CardHeader>
			<CardContent className='relative gap-2 flex flex-row items-center justify-end'>
				<UpdateNotificationTarget
					notification_target_id={notification_target.id}
				/>
				{!isMineNotificationTarget && (
					<>
						{!notification_target.is_forked && (
							<Button
								className='shadow-none'
								variant={'outline'}
								disabled={mutateForkNotificationTarget.isPending}
								onClick={() => {
									mutateForkNotificationTarget.mutate({
										notification_target_id: notification_target.id,
										status: true,
									});
								}}>
								{t('setting_notification_target_fork')}
								{mutateForkNotificationTarget.isPending && (
									<Loader2 className='h-4 w-4 animate-spin' />
								)}
							</Button>
						)}
						{notification_target.is_forked && (
							<Button
								className='shadow-none text-xs'
								variant={'destructive'}
								disabled={mutateForkNotificationTarget.isPending}
								onClick={() => {
									mutateForkNotificationTarget.mutate({
										notification_target_id: notification_target.id,
										status: false,
									});
								}}>
								{t('setting_notification_target_unfork')}
								{mutateForkNotificationTarget.isPending && (
									<Loader2 className='h-4 w-4 animate-spin' />
								)}
							</Button>
						)}
					</>
				)}
			</CardContent>
			<CardFooter className='flex flex-row items-center'>
				<Avatar
					className='size-5'
					title={
						notification_target.creator.nickname
							? notification_target.creator.nickname
							: 'Unknown User'
					}
					onClick={(e) => {
						router.push(`/user/detail/${notification_target.creator.id}`);
						e.preventDefault();
						e.stopPropagation();
					}}>
					<AvatarImage
						src={
							replacePath(
								notification_target.creator.avatar,
								notification_target.creator.id,
							) ?? ''
						}
						alt='user avatar'
						className='size-5 object-cover'
					/>
					<AvatarFallback className='size-5'>
						{notification_target.creator.nickname}
					</AvatarFallback>
				</Avatar>
				<span className='text-xs text-muted-foreground ml-2'>
					{notification_target.creator.nickname}
				</span>
				<span className='ml-auto text-xs text-muted-foreground'>
					{notification_target.create_time &&
						format(
							new Date(notification_target.create_time),
							'yyyy-MM-dd HH:mm',
						)}
				</span>
			</CardFooter>
		</Card>
	);
};

export default NotificationTargetCard;
