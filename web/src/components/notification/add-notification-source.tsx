'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
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
import { addNotificationSource } from '@/service/notification';
import { zodResolver } from '@hookform/resolvers/zod';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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

const AddNotificationSource = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		title: z.string(),
		description: z.string(),
		category: z.number(),
		email: z.string().email().optional(),
		password: z.string().optional(),
		address: z.string().optional(),
		port: z.number().optional(),
	});

	const [showAddDialog, setShowAddDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			category: 0,
			email: '',
			password: '',
			address: '',
			port: 465,
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
			addNotificationSource({
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
			toast.error(err.message || '创建失败');
			return;
		}
		toast.success('创建成功');
		queryClient.invalidateQueries({
			predicate: (query) => {
				return query.queryKey.includes('notification-source');
			},
		});
		form.reset();
		setShowAddDialog(false);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	return (
		<>
			<Button onClick={() => setShowAddDialog(true)}>增加源</Button>
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent>
					<DialogTitle>增加源</DialogTitle>
					<DialogDescription>
						增加源可以便利的通过各种方式通知到各终端，当前仅支持email方式。
					</DialogDescription>
					<Form {...form}>
						<form onSubmit={onSubmitForm} className='space-y-3' id='add-form'>
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
						<Button type='submit' form='add-form'>
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

export default AddNotificationSource;
