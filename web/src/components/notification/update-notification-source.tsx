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
	getMineNotificationSourceDetail,
	updateNotificationSource,
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
import { Tooltip, TooltipTrigger } from '../ui/hybrid-tooltip';
import { Info } from 'lucide-react';
import { TooltipContent } from '../ui/tooltip';
import { useQuery } from '@tanstack/react-query';

const UpdateNotificationSource = ({
	notification_source_id,
}: {
	notification_source_id: number;
}) => {
	const { data, isFetching } = useQuery({
		queryKey: ['notification-source-detail', notification_source_id],
		queryFn: async () => {
			return await getMineNotificationSourceDetail({
				notification_source_id: notification_source_id,
			});
		},
	});

	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		notification_source_id: z.number(),
		title: z.string(),
		description: z.string(),
		category: z.number(),
		email: z.string().email().optional(),
		password: z.string().optional(),
		address: z.string().optional(),
		port: z.number().optional(),
	});

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			notification_source_id,
			title: '',
			description: '',
			category: 0,
			email: '',
			password: '',
			address: '',
			port: undefined,
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
			updateNotificationSource({
				notification_source_id: values.notification_source_id,
				title: values.title,
				description: values.description,
				category: values.category,
				email: values.email,
				password: values.password,
				address: values.address,
				port: values.port,
			})
		);
		if (err || !res) {
			toast.error(err.message || '更新失败');
			return;
		}
		toast.success('更新成功');
		queryClient.invalidateQueries({
			queryKey: ['notification-source'],
		});
		queryClient.invalidateQueries({
			queryKey: ['notification-source-detail', notification_source_id],
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
				notification_source_id,
				title: data.title,
				description: data.description,
				category: data.category,
				email: data.email_notification_source?.email ?? '',
				password: data.email_notification_source?.password ?? '',
				address: data.email_notification_source?.address ?? '',
				port: data.email_notification_source?.port ?? undefined,
			};
			// @ts-expect-error
			form.reset(defaultValues);
		}
	}, [data, form, notification_source_id]);

	return (
		<>
			<Button variant={'outline'} onClick={() => setShowUpdateDialog(true)}>
				编辑
			</Button>
			<Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
				<DialogContent>
					<DialogTitle>编辑源</DialogTitle>
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
											<Input {...field} placeholder='请输入源的名字' />
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
											<Input {...field} placeholder='请输入源的描述' />
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							<FormField
								name='category'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>源类型</FormLabel>
											<Select
												onValueChange={(value) => field.onChange(Number(value))}
												defaultValue={String(field.value)}>
												<SelectTrigger className='w-full'>
													<SelectValue placeholder='请选择邮件源类型' />
												</SelectTrigger>
												<SelectContent className='w-full'>
													<SelectGroup>
														<SelectItem value='0'>email</SelectItem>
													</SelectGroup>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							{form.watch('category') === 0 && (
								<>
									<FormField
										name='email'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>邮箱地址</FormLabel>
													<Input
														{...field}
														placeholder='请选择邮件源邮箱地址'
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='password'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>
														邮箱密码
														<Tooltip>
															<TooltipTrigger>
																<Info size={15} />
															</TooltipTrigger>
															<TooltipContent>
																注意这里的密码不是真实邮箱密码，而是smtp服务的密码。
															</TooltipContent>
														</Tooltip>
													</FormLabel>
													<Input
														type='password'
														{...field}
														placeholder='请选择邮件源邮箱密码'
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='address'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>邮箱服务器地址</FormLabel>
													<Input
														{...field}
														placeholder='请选择邮件源服务器地址'
													/>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<FormField
										name='port'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<FormLabel>邮箱服务器端口</FormLabel>
													<Input
														type={'number'}
														{...field}
														onChange={(e) =>
															field.onChange(e.target.valueAsNumber)
														}
														placeholder='请选择邮件源服务器端口'
													/>
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

export default UpdateNotificationSource;
