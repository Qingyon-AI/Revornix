import { NotificationTask } from '@/generated';
import UpdateNotificationTask from '@/components/notification/update-notification-task';
import DeleteNotificationTask from '@/components/notification/delete-notification-task';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TableCell } from '../ui/table';
import { useMutation } from '@tanstack/react-query';
import { updateNotificationTask } from '@/service/notification';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card';

const NotificationTaskItem = ({ task }: { task: NotificationTask }) => {
	const queryClient = getQueryClient();
	const mutateUpdate = useMutation({
		mutationFn: updateNotificationTask,
		onMutate(variables) {
			const prev = task;
			if (variables.enable !== null && variables.enable !== undefined) {
				task.enable = variables.enable;
			}
			return { prev };
		},
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				queryKey: ['notification-task-detail', task.id],
			});
		},
		onError(error, variables, context) {
			toast.error('更新失败');
			if (context) {
				task = context.prev;
			}
		},
	});

	return (
		<>
			<TableCell>
				<Badge>{task.notification_source?.title}</Badge>
			</TableCell>
			<TableCell>
				<Badge>{task.notification_target?.title}</Badge>
			</TableCell>
			<TableCell>
				<HoverCard>
					<HoverCardTrigger asChild>
						<div className='line-clamp-1 whitespace-normal break-all'>{task.title}</div>
					</HoverCardTrigger>
					<HoverCardContent className='max-w-80 text-xs break-all'>
						{task.title}
					</HoverCardContent>
				</HoverCard>
			</TableCell>
			<TableCell>
				<HoverCard>
					<HoverCardTrigger asChild>
						<div className='line-clamp-1 whitespace-normal break-all'>{task.content}</div>
					</HoverCardTrigger>
					<HoverCardContent className='max-w-80 text-xs break-all'>
						{task.content}
					</HoverCardContent>
				</HoverCard>
			</TableCell>
			<TableCell className='font-mono'>{task.cron_expr}</TableCell>
			<TableCell>
				<Switch
					checked={task.enable}
					onCheckedChange={(e) => {
						mutateUpdate.mutate({
							notification_task_id: task.id,
							enable: e,
						});
					}}
				/>
			</TableCell>
			<TableCell className='space-x-2'>
				<UpdateNotificationTask notification_task_id={task.id} />
				<DeleteNotificationTask notification_task_id={task.id} />
			</TableCell>
		</>
	);
};

export default NotificationTaskItem;
