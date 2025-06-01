import { useUserContext } from '@/provider/user-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormField, FormItem, FormMessage } from '../ui/form';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { utils } from '@kinda/utils';
import { updateDailyReport } from '@/service/user';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
	run_time: z
		.string()
		.regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, '时间格式必须是 HH:mm:ss')
		.refine((time) => {
			const [hh, mm, ss] = time.split(':').map(Number);
			return hh >= 0 && hh < 24 && mm >= 0 && mm < 60 && ss >= 0 && ss < 60;
		}, '无效的时间值'),
});

const DailyReportTime = () => {
	const { userInfo, refreshUserInfo } = useUserContext();
	const [updating, setUpdating] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			run_time: userInfo?.daily_report_run_time ?? '',
		},
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
		if (!userInfo?.daily_report_status) return;
		setUpdating(true);
		const [res, err] = await utils.to(
			updateDailyReport({
				status: userInfo.daily_report_status,
				run_time: values.run_time,
			})
		);
		if (err) {
			toast.error(err.message);
			setUpdating(false);
			return;
		}
		toast.success('通知时间修改成功');
		await refreshUserInfo();
		form.reset();
		setUpdating(false);
	};

	const onFormValidateError = (errors: any) => {
		toast.error('表单校验失败');
		console.error(errors);
	};

	useEffect(() => {
		if (!userInfo?.daily_report_run_time) return;
		form.setValue('run_time', userInfo.daily_report_run_time);
	}, [userInfo]);

	return (
		<>
			{userInfo && (
				<>
					<Form {...form}>
						<form
							onSubmit={handleSubmit}
							className='flex flex-row items-center gap-5'>
							<FormField
								name='run_time'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											{field.value && (
												<Input
													{...field}
													placeholder='请输入每日报告时间'
													className='w-40'
												/>
											)}
											{!field.value && <Skeleton className='w-40 h-10' />}
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							{form.formState.isDirty && (
								<Button disabled={updating} type='submit'>
									保存
									{updating && <Loader2 className='animate-spin' />}
								</Button>
							)}
						</form>
					</Form>
				</>
			)}
		</>
	);
};

export default DailyReportTime;
