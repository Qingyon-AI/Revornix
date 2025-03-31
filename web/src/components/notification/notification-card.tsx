import { readNotifications } from '@/service/notification';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Notification } from '@/generated';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CardDescription } from '../ui/card';

const NotificationCard = ({ notification }: { notification: Notification }) => {
	const mutate = useMutation({
		mutationKey: ['readNotification', notification.id],
		mutationFn: readNotifications,
		onMutate: async (variables) => {
			if (variables.status) {
				notification.read_at = new Date();
			} else {
				notification.read_at = null;
			}
			const prevNotification = notification;
			return { prevNotification };
		},
		onSuccess: (data) => {
			if (notification.read_at) {
				toast.success('已标记为已读');
			} else {
				toast.success('已标记为未读');
			}
			setShowNotification(false);
		},
		onError: (error, variables, context) => {
			if (!notification || !context?.prevNotification) return;
			notification = context?.prevNotification; // 恢复之前的值
			toast.error(error.message);
		},
	});
	const [showNotification, setShowNotification] = useState(false);
	return (
		<>
			<Dialog open={showNotification} onOpenChange={setShowNotification}>
				<DialogContent className='sm:max-w-[425px]'>
					<DialogHeader>
						<DialogTitle>{notification.title}</DialogTitle>
						<CardDescription>{notification.content}</CardDescription>
					</DialogHeader>
					<DialogFooter className='flex flex-row items-center !justify-between w-full'>
						{notification.link && (
							<Link className='w-fit h-fit' href={notification.link}>
								<Button
									className='text-xs p-0 w-fit h-fit underline text-muted-foreground'
									variant={'link'}>
									前往{notification.link}查看
								</Button>
							</Link>
						)}
						{notification.read_at ? (
							<Button
								variant={'destructive'}
								onClick={() => {
									mutate.mutate({
										notification_ids: [notification.id],
										status: false,
									});
								}}>
								标为未读
							</Button>
						) : (
							<Button
								onClick={() => {
									mutate.mutate({
										notification_ids: [notification.id],
										status: true,
									});
								}}>
								标为已读
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div
				className='flex flex-row items-center justify-between rounded px-3 py-2 bg-muted cursor-pointer'
				onClick={() => setShowNotification(true)}>
				<div className='flex flex-col gap-2 w-full'>
					<p className='font-bold'>{notification.title}</p>
					<p className='text-sm font-semibold'>{notification.content}</p>
					{notification.link && (
						<Link
							className='w-fit'
							href={notification.link}
							onClick={(e) => e.stopPropagation()}>
							<Button
								className='text-xs p-0 w-fit h-fit underline'
								variant={'link'}>
								链接：{notification.link}
							</Button>
						</Link>
					)}
					<div className='text-muted-foreground text-xs'>
						{format(notification.create_time as Date, 'yyyy-MM-dd HH:mm:ss')}
					</div>
				</div>
				<div className='text-xs w-12 text-center'>
					{notification.read_at ? (
						<p className='text-muted-foreground'>已读</p>
					) : (
						<p className='text-red-500 font-bold'>未读</p>
					)}
				</div>
			</div>
		</>
	);
};

export default NotificationCard;
