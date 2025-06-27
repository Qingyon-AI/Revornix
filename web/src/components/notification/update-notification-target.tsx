'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getQueryClient } from '@/lib/get-query-client';
import {
	getMineNotificationTargetDetail,
	updateNotificationTarget,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

const UpdateNotificationTarget = ({
	notification_target_id,
}: {
	notification_target_id: number;
}) => {
	const { data, isFetching } = useQuery({
		queryKey: ['notification-target-detail', notification_target_id],
		queryFn: async () => {
			return await getMineNotificationTargetDetail({
				notification_target_id: notification_target_id,
			});
		},
	});

	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		notification_target_id: z.number(),
		title: z.string(),
		description: z.string(),
		email: z.string().email().optional(),
	});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_target_id,
			title: '',
			description: '',
			email: '',
		},
	});

	const onSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onFormValidateSuccess, onFormValidateError)(event);
	};

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		const [res, err] = await utils.to(
			updateNotificationTarget({
				notification_target_id: values.notification_target_id,
				title: values.title,
				description: values.description,
				email: values.email,
			})
		);
		if (err || !res) {
			toast.error(err.message || '更新失败');
			return;
		}
		toast.success('更新成功');
		queryClient.invalidateQueries({
			queryKey: ['notification-target'],
		});
		queryClient.invalidateQueries({
			queryKey: ['notification-target-detail', notification_target_id],
		});
		setShowUpdateDialog(false);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	// ✅ 数据加载后同步到表单
	useEffect(() => {
		if (data) {
			const defaultValues: z.infer<typeof formSchema> = {
				notification_target_id,
				title: data.title,
				description: data.description,
				email: data.email_notification_target?.email ?? '',
			};
			form.reset(defaultValues);
		}
	}, [data, form, notification_target_id]);

	return (
		<>
			<Button variant={'outline'} onClick={() => setShowUpdateDialog(true)}>
				编辑
			</Button>
			<Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
				<DialogContent>
					<DialogTitle>编辑通知目标</DialogTitle>
					<Form {...form}>
						<form
							onSubmit={onSubmitForm}
							className='space-y-3'
							id='update-form'>
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>名称</FormLabel>
											<Input {...field} placeholder='请输入通知目标的名字' />
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='description'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>描述</FormLabel>
											<Input {...field} placeholder='请输入通知目标的描述' />
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							{data?.category === 0 && (
								<>
									<FormField
										name='email'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>邮箱地址</FormLabel>
													<Input {...field} placeholder='请选择目标邮箱地址' />
													<FormMessage />
												</FormItem>
											);
										}}
									/>
								</>
							)}
						</form>
					</Form>
					<DialogFooter>
						<Button type='submit' form='update-form'>
							确认更新
						</Button>
						<DialogClose asChild>
							<Button variant='outline'>取消</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default UpdateNotificationTarget;
