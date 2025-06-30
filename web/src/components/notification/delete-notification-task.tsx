import { useMutation } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { deleteNotificationTask } from '@/service/notification';
import { toast } from 'sonner';
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
import { Loader2 } from 'lucide-react';
import { getQueryClient } from '@/lib/get-query-client';
import { useTranslations } from 'next-intl';

const DeleteNotificationTask = ({
	notification_task_id,
}: {
	notification_task_id: number;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const mutateDelete = useMutation({
		mutationFn: () => {
			return deleteNotificationTask({
				notification_task_ids: [notification_task_id],
			});
		},
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				queryKey: ['notification-task'],
			});
		},
		onError(error, variables, context) {
			toast.error(error.message);
		},
	});
	return (
		<>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button variant={'outline'}>{t('delete')}</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('warning')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('setting_notification_task_manage_delete_alert')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button
							variant={'destructive'}
							onClick={() => {
								mutateDelete.mutateAsync();
							}}
							disabled={mutateDelete.isPending}>
							{t('confirm')}
							{mutateDelete.isPending && (
								<Loader2 className='h-4 w-4 animate-spin' />
							)}
						</Button>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default DeleteNotificationTask;
