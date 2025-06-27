'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
	deleteNotificationTarget,
	getMineNotificationTargets,
} from '@/service/notification';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Info, Loader2 } from 'lucide-react';
import { getQueryClient } from '@/lib/get-query-client';
import AddNotificationTarget from '@/components/notification/add-notification-target';
import UpdateNotificationTarget from '@/components/notification/update-notification-target';

const NotificationSourceManagePage = () => {
	const queryClient = getQueryClient();
	const t = useTranslations();

	const { data, isFetching, isSuccess } = useQuery({
		queryKey: ['notification-target'],
		queryFn: async () => {
			return await getMineNotificationTargets();
		},
	});

	const muteDeleteNotificationTarget = useMutation({
		mutationFn: deleteNotificationTarget,
		onError(error, variables, context) {
			toast.error(error.message);
		},
		onSuccess(data, variables, context) {
			toast.success('删除成功');
			queryClient.invalidateQueries({
				queryKey: ['notification-source'],
			});
		},
	});

	return (
		<>
			<div className='px-5 pb-5'>
				<Alert className='mb-5'>
					<Info />
					<AlertTitle>注意</AlertTitle>
					<AlertDescription>这里可以配置通知目标。</AlertDescription>
				</Alert>
				<div className='flex flex-row justify-between px-5 mb-5 items-center'>
					<p className='font-bold text-md'>通知目标管理</p>
					<AddNotificationTarget />
				</div>
				<div>
					{isFetching && <Skeleton className='w-full h-64' />}
					{isSuccess && !isFetching && data?.data.length === 0 && (
						<div className='bg-muted text-muted-foreground rounded text-xs h-64 flex items-center justify-center'>
							暂无相关内容
						</div>
					)}
					{isSuccess && !isFetching && data?.data?.length !== 0 && (
						<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
							{data &&
								data?.data.map((item) => {
									return (
										<Card key={item.id}>
											<CardHeader>
												<CardTitle>{item.title}</CardTitle>
												<CardDescription>{item.description}</CardDescription>
											</CardHeader>
											<CardFooter className='flex flex-row items-center gap-1 justify-end'>
												<UpdateNotificationTarget
													notification_target_id={item.id}
												/>
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button variant='destructive'>删除</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>警告</AlertDialogTitle>
															<AlertDialogDescription>
																确认删除吗？一旦删除后所有相关通知将会无法发送。
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<Button
																variant={'destructive'}
																onClick={() => {
																	muteDeleteNotificationTarget.mutateAsync({
																		notification_target_ids: [item.id],
																	});
																}}
																disabled={
																	muteDeleteNotificationTarget.isPending
																}>
																{t('confirm')}
																{muteDeleteNotificationTarget.isPending && (
																	<Loader2 className='h-4 w-4 animate-spin' />
																)}
															</Button>
															<AlertDialogCancel>
																{t('cancel')}
															</AlertDialogCancel>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</CardFooter>
										</Card>
									);
								})}
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default NotificationSourceManagePage;
