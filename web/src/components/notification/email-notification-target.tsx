import { sendEmailNotificationTargetCode } from '@/service/notification';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { useCountDown } from 'ahooks';
import { Loader2 } from 'lucide-react';
import { useFormContext, useFormState } from 'react-hook-form';

const EmailNotificationTarget = ({
	useEmailDirtyForCodeField = false,
}: {
	useEmailDirtyForCodeField?: boolean;
}) => {
	const t = useTranslations();
	const [codeSending, setCodeSending] = useState(false);

	const form = useFormContext();
	const { dirtyFields } = useFormState({
		control: form.control,
		name: 'email_target_form.email',
	});

	const emailDirty = dirtyFields.email_target_form?.email;
	const shouldShowCodeField = useEmailDirtyForCodeField ? emailDirty : true;

	const [targetDate, setTargetDate] = useState<number>();
	const [countdown] = useCountDown({
		targetDate,
	});

	useEffect(() => {
		if (!shouldShowCodeField) {
			form.setValue('email_target_form.code', '');
		}
	}, [form, shouldShowCodeField]);

	const mutateSendCode = useMutation({
		mutationFn: sendEmailNotificationTargetCode,
		onSuccess: () => {
			setTargetDate(Date.now() + 60 * 1000);
		},
		onError: (err) => {
			toast.error(err.message);
			console.error(err);
		},
		onSettled: () => {
			setCodeSending(false);
		},
	});

	const onSendCode = async () => {
		form.trigger('email_target_form.email');
		setCodeSending(true);
		mutateSendCode.mutate({
			email: form.getValues('email_target_form.email'),
		});
	};

	return (
		<>
			<FormField
				control={form.control}
				name='email_target_form.email'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_email_bind_email_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t('notification_email_bind_email_placeholder')}
								/>
							</FormControl>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>
			{shouldShowCodeField && (
				<FormField
					control={form.control}
					name='email_target_form.code'
					render={({ field }) => (
						<FormItem>
							<div className='grid grid-cols-12'>
								<FormLabel className='col-span-3'>
									{t('notification_email_bind_code_label')}
								</FormLabel>
								<div className='col-span-9 flex flex-row items-center space-x-2'>
									<FormControl>
										<Input
											{...field}
											placeholder={t(
												'notification_email_bind_code_placeholder',
											)}
										/>
									</FormControl>
									<Button
										type='button'
										onClick={onSendCode}
										disabled={!!countdown || codeSending}>
										{!countdown && t('notification_email_bind_send_code')}
										{!!countdown && `${Math.round(countdown / 1000)}s`}
										{codeSending && <Loader2 className='size-4 animate-spin' />}
									</Button>
								</div>
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}
		</>
	);
};

export default EmailNotificationTarget;
