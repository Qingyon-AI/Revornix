import {
	deleteNotificationRecords,
	readNotificationRecords,
} from '@/service/notification';
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
import { InfiniteData, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import {
	InifiniteScrollPagnitionNotificationRecord,
	NotificationRecord,
} from '@/generated';
import { Separator } from '../ui/separator';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { getQueryClient } from '@/lib/get-query-client';
import { replacePath } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useRouter } from 'nextjs-toploader/app';

const NotificationRecordCard = ({
	notification,
}: {
	notification: NotificationRecord;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const router = useRouter();
	const mutateRead = useMutation({
		mutationKey: ['readNotification', notification.id],
		mutationFn: readNotificationRecords,
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
				toast.success(t('notification_marked_as_read'));
			} else {
				toast.success(t('notification_marked_as_unread'));
			}
			setShowNotification(false);
		},
		onError: (error, variables, context) => {
			if (!notification || !context?.prevNotification) return;
			notification = context?.prevNotification;
			toast.error(error.message);
		},
	});
	const mutateDelete = useMutation({
		mutationKey: ['deleteNotification', notification.id],
		mutationFn: deleteNotificationRecords,
		onSuccess: (_, variables) => {
			// variables 通常是你 deleteNotificationRecords 的参数
			const deletedId = notification.id;

			queryClient.setQueryData<
				InfiniteData<InifiniteScrollPagnitionNotificationRecord>
			>(['searchMyNotifications', ''], (oldData) => {
				if (!oldData) return oldData;

				return {
					...oldData,
					pages: oldData.pages.map((page) => ({
						...page,
						elements: page.elements.filter((item) => {
							return item.id !== deletedId;
						}),
					})),
				};
			});
			setShowNotification(false);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const [showNotification, setShowNotification] = useState(false);
	return (
		<>
			<Dialog open={showNotification} onOpenChange={setShowNotification}>
				<DialogContent className='max-h-[80vh] overflow-auto flex flex-col'>
					<DialogHeader>
						<DialogTitle>{notification.title}</DialogTitle>
					</DialogHeader>

					<div className='flex-1 overflow-auto flex flex-col gap-2'>
						{notification.cover && (
							<img
								src={replacePath(notification.cover, notification.creator.id)}
								alt='notification cover'
								className='rounded aspect-video w-full object-cover'
							/>
						)}
						<div>{notification.content}</div>
					</div>
					{notification.link && (
						<Link href={notification.link}>
							<Button
								size='sm'
								variant={'link'}
								className='p-0 m-0 w-fit h-fit underline'>
								{t('notification_record_go_to_link')}
							</Button>
						</Link>
					)}
					<Separator />
					<DialogFooter className='flex justify-between! items-center'>
						<div className='flex flex-row gap-2 items-center text-muted-foreground text-xs'>
							<Avatar
								className='size-7 cursor-pointer'
								onClick={() =>
									router.push(`/user/detail/${notification.creator.id}`)
								}>
								<AvatarImage
									src={replacePath(
										notification.creator.avatar,
										notification.creator.id,
									)}
									alt='avatar'
									className='size-7 object-cover'
								/>
								<AvatarFallback className='size-7'>
									{notification.creator.nickname}
								</AvatarFallback>
							</Avatar>
							<div className='flex flex-col gap-1'>
								<p
									className='text-xs text-muted-foreground cursor-pointer'
									onClick={() =>
										router.push(`/user/detail/${notification.creator.id}`)
									}>
									{notification.creator.nickname}
								</p>
								{format(
									notification.create_time as Date,
									'yyyy-MM-dd HH:mm:ss',
								)}
							</div>
						</div>
						<div className='flex flex-row gap-2 items-center'>
							<Button
								variant={'secondary'}
								disabled={mutateDelete.isPending}
								onClick={() => {
									mutateDelete.mutate({
										notification_record_ids: [notification.id],
									});
								}}>
								{t('delete')}
								{mutateDelete.isPending && (
									<Loader2 className='size-4 animate-spin' />
								)}
							</Button>
							{notification.read_at ? (
								<Button
									variant={'destructive'}
									onClick={() => {
										mutateRead.mutate({
											notification_record_ids: [notification.id],
											status: false,
										});
									}}>
									{t('notification_mark_as_unread')}
								</Button>
							) : (
								<Button
									onClick={() => {
										mutateRead.mutate({
											notification_record_ids: [notification.id],
											status: true,
										});
									}}>
									{t('notification_mark_as_read')}
								</Button>
							)}
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div
				className='flex flex-row items-center justify-between rounded px-3 py-2 bg-muted cursor-pointer'
				onClick={() => setShowNotification(true)}>
				<div className='flex flex-col gap-2 w-full'>
					<div className='flex flex-row justify-between items-start'>
						<div className='flex flex-col gap-2 w-full flex-1'>
							<p className='font-bold'>{notification.title}</p>
							<p className='text-sm font-semibold line-clamp-3'>
								{notification.content}
							</p>
							{notification.link && (
								<Link href={notification.link} className='w-fit'>
									<Button
										size='sm'
										variant={'link'}
										className='p-0 m-0 w-fit h-fit underline'>
										{t('notification_record_go_to_link')}
									</Button>
								</Link>
							)}
						</div>
						{notification.cover && (
							<img
								src={replacePath(notification.cover, notification.creator.id)}
								alt='notification cover'
								className='rounded aspect-video w-40 object-cover my-1'
							/>
						)}
					</div>

					<Separator className='my-1' />
					<div className='flex justify-between items-center'>
						<div className='text-muted-foreground text-xs'>
							<div className='flex flex-row gap-2 items-center'>
								<Avatar
									className='size-7'
									onClick={(e) => {
										e.stopPropagation();
										e.preventDefault();
										router.push(`/user/detail/${notification.creator.id}`);
									}}>
									<AvatarImage
										src={replacePath(
											notification.creator.avatar,
											notification.creator.id,
										)}
										alt='avatar'
										className='size-7 object-cover'
									/>
									<AvatarFallback className='size-7'>
										{notification.creator.nickname}
									</AvatarFallback>
								</Avatar>
								<div className='flex flex-col gap-1'>
									<p
										className='text-xs text-muted-foreground'
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
											router.push(`/user/detail/${notification.creator.id}`);
										}}>
										{notification.creator.nickname}
									</p>
									{format(
										notification.create_time as Date,
										'yyyy-MM-dd HH:mm:ss',
									)}
								</div>
							</div>
						</div>
						{notification.read_at ? (
							<p className='text-muted-foreground text-xs'>
								{t('notification_read')}
							</p>
						) : (
							<p className='text-red-500 font-bold text-xs'>
								{t('notification_unread')}
							</p>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

export default NotificationRecordCard;
