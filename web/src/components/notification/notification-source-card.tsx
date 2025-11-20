import { NotificationSource, UserNotificationSource } from '@/generated';
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
import { Button } from '@/components/ui/button';
import UpdateNotificationSource from '@/components/notification/update-notification-source';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { deleteNotificationSource } from '@/service/notification';
import { Loader2 } from 'lucide-react';

const NotificationSourceCard = ({
	notification_source,
}: {
	notification_source: UserNotificationSource;
}) => {
	const t = useTranslations();
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
				queryKey: ['notification-source'],
			});
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>{notification_source.title}</CardTitle>
				<CardDescription>{notification_source.description}</CardDescription>
			</CardHeader>
			<CardFooter className='flex flex-row items-center gap-1 justify-end'>
				<UpdateNotificationSource
					notification_source_id={notification_source.id}
				/>
				<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<AlertDialogTrigger asChild>
						<Button variant='destructive'>{t('delete')}</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('warning')}</AlertDialogTitle>
							<AlertDialogDescription>
								{t('setting_notification_source_manage_delete_alert')}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<Button
								variant={'destructive'}
								onClick={() => {
									muteDeleteNotificationSource.mutateAsync({
										user_notification_source_ids: [notification_source.id],
									});
								}}
								disabled={muteDeleteNotificationSource.isPending}>
								{t('confirm')}
								{muteDeleteNotificationSource.isPending && (
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

export default NotificationSourceCard;
