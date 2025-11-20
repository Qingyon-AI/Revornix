import { NotificationTarget } from '@/generated';
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
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import UpdateNotificationTarget from '@/components/notification/update-notification-target';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { deleteNotificationTarget } from '@/service/notification';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const NotificationTargetCard = ({
	notification_target,
}: {
	notification_target: NotificationTarget;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const muteDeleteNotificationTarget = useMutation({
		mutationFn: deleteNotificationTarget,
		onError(error, variables, context) {
			toast.error(error.message);
		},
		onSuccess(data, variables, context) {
			toast.success(t('setting_notification_target_manage_delete_success'));
			queryClient.invalidateQueries({
				queryKey: ['notification-target'],
			});
			setShowDeleteDialog(false);
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>{notification_target.title}</CardTitle>
				<CardDescription>{notification_target.description}</CardDescription>
			</CardHeader>
			<CardFooter className='flex flex-row items-center gap-1 justify-end'>
				<UpdateNotificationTarget notification_target_id={notification_target.id} />
				<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<AlertDialogTrigger asChild>
						<Button variant='destructive'>{t('delete')}</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('warning')}</AlertDialogTitle>
							<AlertDialogDescription>
								{t('setting_notification_target_manage_delete_alert')}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<Button
								variant={'destructive'}
								onClick={() => {
									muteDeleteNotificationTarget.mutateAsync({
										user_notification_target_ids: [notification_target.id],
									});
								}}
								disabled={muteDeleteNotificationTarget.isPending}>
								{t('confirm')}
								{muteDeleteNotificationTarget.isPending && (
									<Loader2 className='h-4 w-4 animate-spin' />
								)}
							</Button>
							<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardFooter>
		</Card>
	);
};

export default NotificationTargetCard;
