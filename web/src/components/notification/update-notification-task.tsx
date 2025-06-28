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
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getQueryClient } from '@/lib/get-query-client';
import {
	getMineNotificationSources,
	getMineNotificationTargets,
	getNotificationTaskDetail,
	updateNotificationTask,
} from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { useQuery } from '@tanstack/react-query';

const UpdateNotificationTask = ({
	notification_task_id,
}: {
	notification_task_id: number;
}) => {
	const { data, isFetching } = useQuery({
		queryKey: ['notification-task-detail', notification_task_id],
		queryFn: async () => {
			return await getNotificationTaskDetail({
				notification_task_id: notification_task_id,
			});
		},
	});
	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		notification_task_id: z.number(),
		title: z.string(),
		content: z.string(),
		cron_expr: z.string(),
		enable: z.boolean(),
		notification_source_id: z.number(),
		notification_target_id: z.number(),
	});

	const { data: mineNotificationSources } = useQuery({
		queryKey: ['notification-source'],
		queryFn: getMineNotificationSources,
	});

	const { data: mineNotificationTargets } = useQuery({
		queryKey: ['notification-target'],
		queryFn: getMineNotificationTargets,
	});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_task_id: notification_task_id,
			title: '',
			content: '',
			cron_expr: '',
			enable: true,
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
			updateNotificationTask({
				notification_task_id: notification_task_id,
				title: values.title,
				content: values.content,
				cron_expr: values.cron_expr,
				enable: values.enable,
				notification_source_id: values.notification_source_id,
				notification_target_id: values.notification_target_id,
			})
		);
		if (err || !res) {
			toast.error(err.message || '更新失败');
			return;
		}
		toast.success('更新成功');
		queryClient.invalidateQueries({
			queryKey: ['notification-task'],
		});
		queryClient.invalidateQueries({
			queryKey: ['notification-task-detail', notification_task_id],
		});
		form.reset();
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
				notification_task_id: notification_task_id,
				title: data.title,
				content: data.content,
				cron_expr: data.cron_expr,
				enable: data.enable,
				notification_source_id: data.notification_source_id,
				notification_target_id: data.notification_target_id,
			};
			form.reset(defaultValues);
		}
	}, [data, form, notification_task_id]);

	return (
		<>
			<Button onClick={() => setShowUpdateDialog(true)}>编辑</Button>
			<Dialog
				open={showUpdateDialog}
				onOpenChange={(e) => {
					if (!e) {
						form.reset();
					}
					setShowUpdateDialog(e);
				}}>
				<DialogContent>
					<DialogTitle>编辑通知任务</DialogTitle>
					<Form {...form}>
						<form
							onSubmit={onSubmitForm}
							className='space-y-3'
							id='update-notification-task-form'>
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>通知标题</FormLabel>
											<Input {...field} placeholder='请输入通知标题' />
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='content'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>通知内容</FormLabel>
											<Textarea {...field} placeholder='请输入通知标题' />
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='cron_expr'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>cron表达式</FormLabel>
											<Input {...field} placeholder='请输入表达式' />
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='notification_source_id'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>通知源</FormLabel>
											<Select
												value={field.value ? String(field.value) : undefined}
												onValueChange={(e) => {
													field.onChange(Number(e));
												}}>
												<SelectTrigger className='w-full'>
													<SelectValue placeholder='请选择通知源' />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{mineNotificationSources?.data.map(
															(item, index) => {
																return (
																	<SelectItem
																		value={item.id.toString()}
																		key={index}>
																		{item.title}
																	</SelectItem>
																);
															}
														)}
													</SelectGroup>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='notification_target_id'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>通知目标</FormLabel>
											<Select
												value={field.value ? String(field.value) : undefined}
												onValueChange={(e) => {
													field.onChange(Number(e));
												}}>
												<SelectTrigger className='w-full'>
													<SelectValue placeholder='请选择通知目标' />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{mineNotificationTargets?.data.map(
															(item, index) => {
																return (
																	<SelectItem
																		value={item.id.toString()}
																		key={index}>
																		{item.title}
																	</SelectItem>
																);
															}
														)}
													</SelectGroup>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='enable'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className='flex flex-row items-center justify-between border rounded-xl p-3'>
											<div className='space-y-1'>
												<FormLabel>启用状态</FormLabel>
												<FormDescription>
													默认启用，如需关闭请手动关闭
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									);
								}}
							/>
						</form>
					</Form>
					<DialogFooter>
						<Button type='submit' form='update-notification-task-form'>
							确认提交
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

export default UpdateNotificationTask;
