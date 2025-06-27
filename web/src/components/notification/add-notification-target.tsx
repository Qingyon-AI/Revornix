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
import { addNotificationTarget } from '@/service/notification';
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

const AddNotificationTarget = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		title: z.string(),
		description: z.string(),
		category: z.number(),
		email: z.string().email().optional(),
	});

	const [showAddDialog, setShowAddDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			category: 0,
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
			addNotificationTarget({
				title: values.title,
				description: values.description,
				category: values.category,
				email: values.email,
			})
		);
		if (err || !res) {
			toast.error(err.message || '创建失败');
			return;
		}
		toast.success('创建成功');
		queryClient.invalidateQueries({
			predicate: (query) => {
				return query.queryKey.includes('notification-target');
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
			<Button onClick={() => setShowAddDialog(true)}>增加目标</Button>
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent>
					<DialogTitle>增加目标</DialogTitle>
					<DialogDescription>
						增加目标可以便利的通过各种方式接收通知。
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
											<Input {...field} placeholder='请输入目标的名字' />
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
											<Input {...field} placeholder='请输入目标的描述' />
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
											<FormLabel>目标类型</FormLabel>
											<Select
												onValueChange={(value) => field.onChange(Number(value))}
												defaultValue={String(field.value)}>
												<SelectTrigger className='w-full'>
													<SelectValue placeholder='请选择目标类型' />
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
														placeholder='请选择目标邮箱地址'
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

export default AddNotificationTarget;
