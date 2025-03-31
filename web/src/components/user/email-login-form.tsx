'use client';

import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import Cookies from 'js-cookie';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginUser } from '@/service/user';
import { useLoginProvider } from '@/provider/login-provider';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

const emailFormSchema = z.object({
	email: z.string().email('请输入正确的邮箱地址'),
	password: z
		.string()
		.min(6, '密码长度不能小于6位')
		.max(50, '密码长度不得超过50位'),
});

const EmailLoginForm = () => {
	const searchParams = useSearchParams();
	const redirect_page = searchParams.get('redirect_to') || '/dashboard'; // 默认跳转到 dashboard
	const [submitLoading, setSubmitLoading] = useState(false);
	const router = useRouter();
	const { refreshUserInfo } = useUserContext();
	const { setLoginWay } = useLoginProvider();
	const emailForm = useForm<z.infer<typeof emailFormSchema>>({
		resolver: zodResolver(emailFormSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	});

	const onSubmitEmailForm = async (event: React.FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return emailForm.handleSubmit(
			onEmailSubmitSuccess,
			onEmailSubmitError
		)(event);
	};

	const onEmailSubmitSuccess = async (
		values: z.infer<typeof emailFormSchema>
	) => {
		setSubmitLoading(true);
		const [res, err] = await utils.to(
			loginUser({
				email: values.email,
				password: values.password,
			})
		);
		if (err || !res) {
			toast.error(err.message);
			setSubmitLoading(false);
		} else {
			Cookies.set('access_token', res.access_token);
			Cookies.set('refresh_token', res.refresh_token);
			toast.success('登陆成功');
			setSubmitLoading(false);
			refreshUserInfo();
			router.push(redirect_page);
		}
	};

	const onEmailSubmitError = (errors: any) => {
		console.log(errors);
		toast.error('表单校验失败');
	};

	return (
		<Card>
			<Form {...emailForm}>
				<form onSubmit={onSubmitEmailForm} className='space-y-2 min-w-80'>
					<CardHeader className='mb-5'>
						<CardTitle className='text-2xl'>登陆</CardTitle>
						<CardDescription>输入邮箱密码信息来登录你的账号</CardDescription>
					</CardHeader>
					<CardContent>
						<FormField
							control={emailForm.control}
							name='email'
							render={({ field }) => (
								<FormItem className='mb-5'>
									<FormLabel>邮箱</FormLabel>
									<FormControl>
										<Input placeholder='请输入你的邮箱' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={emailForm.control}
							name='password'
							render={({ field }) => (
								<FormItem className='mb-5'>
									<FormLabel>密码</FormLabel>
									<FormControl>
										<Input
											type='password'
											placeholder='请输入你的密码'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter className='flex flex-col gap-2'>
						<Button disabled={submitLoading} type='submit' className='w-full'>
							{submitLoading && (
								<Loader2 className='mr-1 size-4 animate-spin' />
							)}
							登陆
						</Button>
						<div className='mt-4 text-center text-sm'>
							还没有账号？
							<Link href='/register' className='underline'>
								前往注册
							</Link>
						</div>
					</CardFooter>
				</form>
			</Form>
		</Card>
	);
};

export default EmailLoginForm;
