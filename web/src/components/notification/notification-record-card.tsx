import {
	deleteNotificationRecords,
	readNotificationRecords,
} from '@/service/notification';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { InfiniteData, QueryKey, useMutation } from '@tanstack/react-query';
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
import {
	filterInfiniteQueryElements,
	mapInfiniteQueryElements,
} from '@/lib/infinite-query-cache';
import { useUserContext } from '@/provider/user-provider';
import { formatInUserTimeZone } from '@/lib/time';

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const sanitizeNotificationHtml = (content: string) => {
	if (typeof window === 'undefined' || !content) {
		return content;
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString(content, 'text/html');

	doc
		.querySelectorAll(
			'script,style,iframe,object,embed,form,input,button,textarea,select,option,link,meta,base,svg,math',
		)
		.forEach((element) => element.remove());

	doc.querySelectorAll('*').forEach((element) => {
		[...element.attributes].forEach((attribute) => {
			const attributeName = attribute.name.toLowerCase();
			const attributeValue = attribute.value.trim();

			if (
				attributeName.startsWith('on') ||
				attributeName === 'style' ||
				attributeName === 'srcdoc'
			) {
				element.removeAttribute(attribute.name);
				return;
			}

			if (
				attributeName === 'href' ||
				attributeName === 'src' ||
				attributeName === 'xlink:href' ||
				attributeName === 'formaction'
			) {
				const normalizedValue = attributeValue.toLowerCase();
				const isSafeAnchor = attributeName === 'href' && normalizedValue.startsWith('#');
				const isSafeRelativePath =
					normalizedValue.startsWith('/') ||
					normalizedValue.startsWith('./') ||
					normalizedValue.startsWith('../');
				const isSafeAbsoluteUrl =
					normalizedValue.startsWith('http://') ||
					normalizedValue.startsWith('https://') ||
					normalizedValue.startsWith('mailto:') ||
					normalizedValue.startsWith('tel:');
				const isSafeImageDataUrl =
					attributeName === 'src' && normalizedValue.startsWith('data:image/');

				if (
					!isSafeAnchor &&
					!isSafeRelativePath &&
					!isSafeAbsoluteUrl &&
					!isSafeImageDataUrl
				) {
					element.removeAttribute(attribute.name);
				}
			}
		});

		if (element instanceof HTMLAnchorElement && element.target === '_blank') {
			element.rel = 'noopener noreferrer';
		}
	});

	return doc.body.innerHTML;
};

const getNotificationPreviewText = (content: string) => {
	if (typeof window === 'undefined' || !content || !HTML_TAG_PATTERN.test(content)) {
		return content;
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString(content, 'text/html');
	return doc.body.textContent?.trim() ?? content;
};

const NotificationRecordCard = ({
	notification,
}: {
	notification: NotificationRecord;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const router = useRouter();
	const { mainUserInfo } = useUserContext();
	const searchMyNotificationsQueryKey = [
		'searchMyNotifications',
		mainUserInfo?.id,
	] as const;
	const mutateRead = useMutation({
		mutationKey: ['readNotification', notification.id],
		mutationFn: readNotificationRecords,
		onMutate: async (variables) => {
			const previousNotifications = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionNotificationRecord>
			>({
				queryKey: searchMyNotificationsQueryKey,
			});

			mapInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationRecord,
				NotificationRecord
			>(queryClient, searchMyNotificationsQueryKey, (item) => {
				if (item.id !== notification.id) return item;
				return {
					...item,
					read_at: variables.status ? new Date() : null,
				};
			});

			return { previousNotifications };
		},
		onSuccess: (_, variables) => {
			if (variables.status) {
				toast.success(t('notification_marked_as_read'));
			} else {
				toast.success(t('notification_marked_as_unread'));
			}
			setShowNotification(false);
		},
		onError: (error, variables, context) => {
			context?.previousNotifications?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey as QueryKey, snapshot);
			});
			toast.error(error.message);
		},
	});
	const mutateDelete = useMutation({
		mutationKey: ['deleteNotification', notification.id],
		mutationFn: deleteNotificationRecords,
		onSuccess: () => {
			const deletedId = notification.id;
			filterInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationRecord,
				NotificationRecord
			>(
				queryClient,
				searchMyNotificationsQueryKey,
				(item) => item.id !== deletedId,
			);
			setShowNotification(false);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const [showNotification, setShowNotification] = useState(false);
	const notificationContent = notification.content ?? '';
	const sanitizedContent = useMemo(() => {
		return sanitizeNotificationHtml(notificationContent);
	}, [notificationContent]);
	const previewContent = useMemo(() => {
		return getNotificationPreviewText(notificationContent);
	}, [notificationContent]);
	const isHtmlContent = useMemo(() => {
		return HTML_TAG_PATTERN.test(notificationContent);
	}, [notificationContent]);

	return (
		<>
			<Dialog open={showNotification} onOpenChange={setShowNotification}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-2xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle className='min-w-0'>{notification.title}</DialogTitle>
					</DialogHeader>
					<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
						<div className='flex flex-col gap-4'>
							{notification.cover && (
								<img
									src={replacePath(notification.cover, notification.creator.id)}
									alt='notification cover'
									className='rounded aspect-video w-full object-cover'
								/>
							)}
							{isHtmlContent ? (
								<div
									className='prose prose-sm max-w-none break-words dark:prose-invert prose-a:text-primary prose-img:rounded-xl'
									dangerouslySetInnerHTML={{ __html: sanitizedContent }}
								/>
							) : (
								<div className='whitespace-pre-wrap break-words'>
									{notificationContent}
								</div>
							)}
							{notification.link && (
								<Link href={notification.link} className='w-fit'>
									<Button
										size='sm'
										variant='outline'
										className='rounded-full'>
										{t('notification_record_go_to_link')}
									</Button>
								</Link>
							)}
						</div>
					</div>
					<DialogFooter className='sticky bottom-0 z-10 flex items-center justify-between! border-t border-border/60 bg-background px-6 py-4'>
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
								<AvatarFallback className='size-7 font-semibold'>
									{notification.creator.nickname.slice(0, 1) ?? '?'}
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
								{formatInUserTimeZone(
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
								{previewContent}
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
									<AvatarFallback className='size-7 font-semibold'>
										{notification.creator.nickname.slice(0, 1) ?? '?'}
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
									{formatInUserTimeZone(
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
