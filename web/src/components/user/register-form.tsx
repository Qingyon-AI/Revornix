'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import Cookies from 'js-cookie';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createEmailUserVerify } from '@/service/user';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';

const formSchema = z
	.object({
		email: z.string().email('请输入正确的邮箱地址'),
		password: z
			.string()
			.min(6, '密码长度不能少于6位')
			.max(40, '密码长度不能多于40位'),
		passwordAgain: z
			.string()
			.min(6, '密码长度不能少于6位')
			.max(40, '密码长度不能多于40位'),
	})
	.refine((data) => data.password === data.passwordAgain, {
		message: '两次输入的密码不一致',
		path: ['passwordAgain'],
	});

export function RegisterForm() {
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
	const { refreshUserInfo } = useUserContext();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	});

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onSuccess, onError)(event);
	};

	const onSuccess = async (values: z.infer<typeof formSchema>) => {
		setSubmitting(true);
		const [res, err] = await utils.to(
			createEmailUserVerify({
				email: values.email,
				password: values.password
			})
		);
		if (err || !res) {
			toast.error(err.message);
			setSubmitting(false);
			return;
		}
		toast.success('注册成功');
		setSubmitting(false);
		Cookies.set('access_token', res.access_token);
		Cookies.set('refresh_token', res.refresh_token);
		refreshUserInfo();
		router.push('/dashboard');
	};

	const onError = (errors: any) => {
		console.log(errors);
		toast.error('表单校验失败');
	};

	return (
		<Card className='mx-auto max-w-sm'>
			<Form {...form}>
				<form onSubmit={onSubmit} className='space-y-2 min-w-80'>
					<CardHeader className='mb-5'>
						<CardTitle className='text-2xl'>注册</CardTitle>
						<CardDescription>输入必要的信息以完成注册</CardDescription>
					</CardHeader>
					<CardContent>
						<FormField
							control={form.control}
							name='email'
							render={({ field }) => (
								<FormItem className='mb-5'>
									<FormLabel>邮箱</FormLabel>
									<FormControl>
										<Input placeholder='请输入邮箱地址' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className='grid gap-2'>
							<FormField
								control={form.control}
								name='password'
								render={({ field }) => (
									<FormItem className='mb-5'>
										<FormLabel>密码</FormLabel>
										<FormControl>
											<Input
												type='password'
												placeholder='请输入密码'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className='grid gap-2'>
							<FormField
								control={form.control}
								name='passwordAgain'
								render={({ field }) => (
									<FormItem className='mb-5'>
										<FormLabel>确认密码</FormLabel>
										<FormControl>
											<Input
												type='password'
												placeholder='请再次输入密码'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<Button className='w-full' type='submit' disabled={submitting}>
							注册
							{submitting && <Loader2 className='mr-1 size-4 animate-spin' />}
						</Button>
						<div className='mt-4 text-center text-sm'>
							已经有账号了？
							<Link href='/login' className='underline'>
								前往登陆
							</Link>
						</div>
					</CardContent>
				</form>
			</Form>
		</Card>
	);
}
