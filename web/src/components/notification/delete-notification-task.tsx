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

const DeleteNotificationTask = ({
	notification_task_id,
}: {
	notification_task_id: number;
}) => {
	const queryClient = getQueryClient();
	const mutateDelete = useMutation({
		mutationFn: () => {
			return deleteNotificationTask({
				notification_task_ids: [notification_task_id],
			});
		},
		onSuccess(data, variables, context) {
			toast.success('删除成功');
			queryClient.invalidateQueries({
				queryKey: ['notification-task'],
			});
		},
		onError(error, variables, context) {
			toast.error('删除失败');
		},
	});
	return (
		<>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button variant={'outline'}>删除</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>提醒</AlertDialogTitle>
						<AlertDialogDescription>
							确认删除吗？删除通知后将无法撤销。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button
							variant={'destructive'}
							onClick={() => {
								mutateDelete.mutateAsync();
							}}
							disabled={mutateDelete.isPending}>
							确认
							{mutateDelete.isPending && (
								<Loader2 className='h-4 w-4 animate-spin' />
							)}
						</Button>
						<AlertDialogCancel>取消</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default DeleteNotificationTask;
