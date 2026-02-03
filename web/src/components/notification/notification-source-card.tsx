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
import { Button } from '@/components/ui/button';
import UpdateNotificationSource from '@/components/notification/update-notification-source';
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import {
	deleteNotificationSource,
	forkNotificationSource,
} from '@/service/notification';
import { Loader2, XCircleIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useRouter } from 'nextjs-toploader/app';
import { replacePath } from '@/lib/utils';
import { format } from 'date-fns';
import { NotificationSource } from '@/generated';
import { Badge } from '../ui/badge';
import { useUserContext } from '@/provider/user-provider';

const NotificationSourceCard = ({
	notification_source,
}: {
	notification_source: NotificationSource;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const { refreshMainUserInfo, mainUserInfo } = useUserContext();
	const queryClient = getQueryClient();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const muteDeleteNotificationSource = useMutation({
		mutationFn: deleteNotificationSource,
		onError(error, variables, context) {
			toast.error(error.message);
		},
		onSuccess(data, variables, context) {
			toast.success(t('setting_notification_source_manage_delete_success'));
			queryClient.invalidateQueries({
				predicate(query) {
					return query.queryKey.includes('searchNotificationSources');
				},
			});
		},
	});

	const mutateForkNotificationSource = useMutation({
		mutationFn: forkNotificationSource,
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate(query) {
					return query.queryKey.includes('notification-source');
				},
			});
			refreshMainUserInfo();
		},
		onError(error, variables, onMutateResult, context) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const isMineNotificationSource = useMemo(() => {
		return mainUserInfo && mainUserInfo.id === notification_source?.creator.id;
	}, [notification_source?.creator.id, mainUserInfo]);

	return (
		<Card>
			<CardHeader className='flex-1'>
				<CardTitle className='flex flex-row items-center w-full min-w-0'>
					<div className='flex flex-row items-center gap-2 flex-1 min-w-0 flex-wrap break-all'>
						<span className='line-clamp-2'>{notification_source.title}</span>
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
									{t('setting_notification_source_manage_delete_alert')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<Button
									variant={'destructive'}
									onClick={async () => {
										const res = await muteDeleteNotificationSource.mutateAsync({
											notification_source_ids: [notification_source.id],
										});
										if (res.success) {
											setShowDeleteDialog(false);
										}
									}}
									disabled={muteDeleteNotificationSource.isPending}>
									{t('confirm')}
									{muteDeleteNotificationSource.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
								<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardTitle>
				<CardDescription className='flex flex-col flex-1'>
					<span className='mb-2'>{notification_source.description}</span>
					{notification_source.is_public && (
						<Badge className='bg-amber-600/10 dark:bg-amber-600/20 hover:bg-amber-600/10 text-amber-500 shadow-none rounded-full'>
							<div className='h-1.5 w-1.5 rounded-full bg-amber-500 mr-1' />{' '}
							Public
						</Badge>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent className='relative gap-2 flex flex-row items-center justify-end'>
				<UpdateNotificationSource
					notification_source_id={notification_source.id}
				/>
				{!isMineNotificationSource && (
					<>
						{!notification_source.is_forked && (
							<Button
								className='shadow-none'
								variant={'outline'}
								disabled={mutateForkNotificationSource.isPending}
								onClick={() => {
									mutateForkNotificationSource.mutate({
										notification_source_id: notification_source.id,
										status: true,
									});
								}}>
								{t('setting_notification_source_fork')}
								{mutateForkNotificationSource.isPending && (
									<Loader2 className='h-4 w-4 animate-spin' />
								)}
							</Button>
						)}
						{notification_source.is_forked && (
							<Button
								className='shadow-none text-xs'
								variant={'destructive'}
								disabled={mutateForkNotificationSource.isPending}
								onClick={() => {
									mutateForkNotificationSource.mutate({
										notification_source_id: notification_source.id,
										status: false,
									});
								}}>
								{t('setting_notification_source_unfork')}
								{mutateForkNotificationSource.isPending && (
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
						notification_source.creator.nickname
							? notification_source.creator.nickname
							: 'Unknown User'
					}
					onClick={(e) => {
						router.push(`/user/detail/${notification_source.creator.id}`);
						e.preventDefault();
						e.stopPropagation();
					}}>
					<AvatarImage
						src={
							replacePath(
								notification_source.creator.avatar,
								notification_source.creator.id,
							) ?? ''
						}
						alt='user avatar'
						className='size-5 object-cover'
					/>
					<AvatarFallback className='size-5'>
						{notification_source.creator.nickname}
					</AvatarFallback>
				</Avatar>
				<span className='text-xs text-muted-foreground ml-2'>
					{notification_source.creator.nickname}
				</span>
				<span className='ml-auto text-xs text-muted-foreground'>
					{notification_source.create_time &&
						format(
							new Date(notification_source.create_time),
							'yyyy-MM-dd HH:mm',
						)}
				</span>
			</CardFooter>
		</Card>
	);
};

export default NotificationSourceCard;
