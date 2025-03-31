'use client';

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getMyInitialPassword, updatePassword } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';
import { useQuery } from '@tanstack/react-query';
import { useCopyToClipboard } from 'react-use';
import { utils } from '@kinda/utils';

const passwordFormSchema = z.object({
	origin_password: z.string().min(8, '密码至少8位').max(40, '密码最多40位'),
	password: z.string().min(8, '密码至少8位').max(40, '密码最多40位'),
});

const PassWordUpdate = () => {
	const { userInfo, refreshUserInfo } = useUserContext();
	const [isSubmitting, startSubmittingTransition] = useTransition();
	const [copiedText, copy] = useCopyToClipboard();
	const [initialPassword, setInitialPassword] = useState<string>();
	const [showInitialPasswordDialog, setShowInitialPasswordDialog] =
		useState(false);
	const [showPasswordUpdateDialog, setShowPasswordUpdateDialog] =
		useState(false);

	const onSubmitUpdatePasswordForm = async (
		event: FormEvent<HTMLFormElement>
	) => {
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

	const form = useForm<z.infer<typeof passwordFormSchema>>({
		resolver: zodResolver(passwordFormSchema),
		defaultValues: {
			origin_password: '',
			password: '',
		},
	});

	const onFormValidateSuccess = async (
		values: z.infer<typeof passwordFormSchema>
	) => {
		startSubmittingTransition(async () => {
			const [res, err] = await utils.to(
				updatePassword({
					origin_password: values.origin_password,
					new_password: values.password,
				})
			);
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success('更新成功');
			form.reset();
			refreshUserInfo();
			setShowPasswordUpdateDialog(false);
		});
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error('表单校验失败');
	};

	const {
		isFetching: isInitialPasswordFetching,
		refetch: refetchInitialPassword,
	} = useQuery({
		enabled: false,
		retry: false,
		queryKey: ['getMyInitialPassword', userInfo],
		queryFn: getMyInitialPassword,
	});

	return (
		<>
			{userInfo && userInfo.email_info && (
				<>
					<Dialog
						open={showInitialPasswordDialog}
						onOpenChange={(v) => {
							setShowInitialPasswordDialog(v);
							if (!v) {
								refreshUserInfo();
							}
						}}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>初始密码</DialogTitle>
								<DialogDescription>
									初次密码仅可查看一次，之后将无法查看，请注意保存。
								</DialogDescription>
							</DialogHeader>
							<div>
								<div className='flex items-center space-x-2'>
									<div className='grid flex-1 gap-2'>
										<Label htmlFor='link' className='sr-only'>
											Link
										</Label>
										{!initialPassword && isInitialPasswordFetching ? (
											<p className='text-sm text-muted-foreground'>
												正在获取中...
											</p>
										) : (
											<Input id='link' value={initialPassword} readOnly />
										)}
									</div>
									<Button
										onClick={() => {
											initialPassword && copy(initialPassword);
											toast.success('已复制');
										}}
										size='sm'
										className='px-3'>
										<span className='sr-only'>Copy</span>
										<Copy />
									</Button>
								</div>
							</div>
							<DialogFooter>
								<DialogClose asChild>
									<Button>确认</Button>
								</DialogClose>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<div className='flex flex-row gap-5'>
						{userInfo.email_info.is_initial_password &&
							!userInfo.email_info.has_seen_initial_password && (
								<Button
									onClick={async () => {
										setShowInitialPasswordDialog(true);
										const { data, error, isError } =
											await refetchInitialPassword();
										if (isError) {
											toast.error(error.message);
											return;
										}
										data && setInitialPassword(data.password);
									}}>
									查看初始密码
								</Button>
							)}
						<Button
							variant='outline'
							onClick={() => {
								setShowPasswordUpdateDialog(true);
							}}>
							更改密码
						</Button>
					</div>
					<Dialog
						open={showPasswordUpdateDialog}
						onOpenChange={setShowPasswordUpdateDialog}>
						<DialogContent className='sm:max-w-md'>
							<DialogHeader>
								<DialogTitle>更改密码</DialogTitle>
							</DialogHeader>
							<Form {...form}>
								<form
									onSubmit={onSubmitUpdatePasswordForm}
									className='space-y-5'>
									<div className='space-y-5'>
										<FormField
											control={form.control}
											name='origin_password'
											render={({ field }) => (
												<FormItem className='flex justify-between items-center space-y-0'>
													<FormLabel className='flex flex-col gap-2'>
														输入原密码
													</FormLabel>
													<div className='flex flex-col gap-2'>
														<FormControl>
															<Input
																type='password'
																placeholder='请输入原密码'
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</div>
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name='password'
											render={({ field }) => (
												<FormItem className='flex justify-between items-center space-y-0'>
													<FormLabel className='flex flex-col gap-2'>
														输入新密码
													</FormLabel>
													<div className='flex flex-col gap-2'>
														<FormControl>
															<Input
																type='password'
																placeholder='请输入新密码'
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</div>
												</FormItem>
											)}
										/>
									</div>
									<DialogFooter className='sm:justify-end'>
										<Button type='submit' disabled={isSubmitting}>
											确认
											{isSubmitting && (
												<Loader2 className='size-4 animate-spin' />
											)}
										</Button>
										<DialogClose asChild>
											<Button type='button' variant='secondary'>
												取消
											</Button>
										</DialogClose>
									</DialogFooter>
								</form>
							</Form>
						</DialogContent>
					</Dialog>
				</>
			)}
		</>
	);
};

export default PassWordUpdate;
