import { getQueryClient } from '@/lib/get-query-client';
import { Button } from '../ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	getMineNotificationTargetDetail,
	verifyNotificationTarget,
	verifyNotificationTargetSend,
} from '@/service/notification';
import { toast } from 'sonner';
import { Loader2, XCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Spinner } from '../ui/spinner';
import { Separator } from '../ui/separator';
import { Alert, AlertTitle } from '../ui/alert';
import { Switch } from '../ui/switch';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useEffect, useState } from 'react';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form';
import z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NotificationTargetProvidedUUID } from '@/enums/notification';
import { Input } from '../ui/input';
import { useCountDown } from 'ahooks';
import {
	InifiniteScrollPagnitionNotificationTarget,
	NotificationTarget,
	NotificationTargetDetail,
} from '@/generated';
import { mapInfiniteQueryElements } from '@/lib/infinite-query-cache';

const NotificationTargetVerify = ({
	notification_target_id,
}: {
	notification_target_id: number;
}) => {
	const t = useTranslations();
	const formSchema = z.object({
		notification_target_provided_id: z.number(),
		notification_target_id: z.number(),
		code: z.string().optional(),
		email: z.string().email().optional(),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {},
	});

	const queryClient = getQueryClient();

	const [showVerifyDialog, setShowVerifyDialog] = useState(false);

	const { data, isFetching, isError, error, isSuccess, refetch } = useQuery({
		queryKey: ['notification-target-detail', notification_target_id],
		queryFn: async () => {
			return await getMineNotificationTargetDetail({
				notification_target_id: notification_target_id,
			});
		},
		enabled: showVerifyDialog,
	});

	const mutateVerifyNotificationTargetSend = useMutation({
		mutationFn: verifyNotificationTargetSend,
		onSuccess: () => {
			console.log('success');
			toast.success(t('notification_target_verify_code_sent'));
			setTargetDate(Date.now() + 60000);
		},
		onError(error, variables, onMutateResult, context) {
			console.error(error);
			toast.error(error.message);
		},
		onSettled() {
			setCodeSending(false);
		},
	});

	const mutateVerifyNotificationTarget = useMutation({
		mutationFn: verifyNotificationTarget,
		onSuccess: () => {
			setTargetDate(Date.now() + 60000);
			toast.success(t('notification_target_verify_success'));
			mapInfiniteQueryElements<
				InifiniteScrollPagnitionNotificationTarget,
				NotificationTarget
			>(queryClient, ['searchNotificationTargets'], (item) => {
				if (item.id !== notification_target_id) return item;
				return {
					...item,
					is_verified: true,
				};
			});
			queryClient.setQueryData<NotificationTargetDetail>(
				['notification-target-detail', notification_target_id],
				(old) => {
					if (!old) return old;
					return {
						...old,
						is_verified: true,
					};
				},
			);
			setShowVerifyDialog(false);
		},
		onError(error, variables, onMutateResult, context) {
			console.error(error);
			toast.error(error.message);
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
		mutateVerifyNotificationTarget.mutate({
			notification_target_provided_id: values.notification_target_provided_id,
			notification_target_id: values.notification_target_id,
			email: values.email,
			code: values.code,
		});
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	const [targetDate, setTargetDate] = useState<number>();
	const [countdown] = useCountDown({
		targetDate,
	});

	const [codeSending, setCodeSending] = useState(false);

	const onSendCode = async () => {
		form.trigger('email');
		if (form.formState.errors.email) {
			toast.error(form.formState.errors.email.message);
			return;
		}
		setCodeSending(true);
		const notification_target_provided_id =
			data?.notification_target_provided.id;
		const email = form.getValues('email');
		if (!notification_target_provided_id || !email) {
			toast.error(t('form_validate_failed'));
			setCodeSending(false);
			return;
		}
		mutateVerifyNotificationTargetSend.mutate({
			notification_target_provided_id,
			notification_target_id,
			email,
		});
	};

	useEffect(() => {
		if (!data) return;

		const initialFormValues: z.infer<typeof formSchema> = {
			notification_target_provided_id: data.notification_target_provided.id,
			notification_target_id: data.id,
		};
		if (data.config_json) {
			initialFormValues.email = JSON.parse(data.config_json).email;
		}

		console.log(111, initialFormValues);

		form.reset(initialFormValues);
	}, [data]);

	return (
		<>
			<Dialog
				open={showVerifyDialog}
				onOpenChange={(open) => {
					setShowVerifyDialog(open);
					if (open) {
						refetch(); // ✅ 每次打开都拉最新
					}
				}}>
				<DialogTrigger asChild>
					<Button variant={'outline'}>
						{t('setting_notification_target_verify')}
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogTitle>
						{t('setting_notification_target_manage_verify_form_label')}
					</DialogTitle>
					{!data && isFetching && (
						<div className='bg-muted text-xs text-muted-foreground p-5 rounded flex flex-row items-center justify-center gap-2'>
							<span>{t('loading')}</span>
							<Spinner />
						</div>
					)}

					{!data && isError && error && (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<XCircleIcon />
								</EmptyMedia>
								<EmptyDescription>{error.message}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}

					{isSuccess && data && (
						<Form {...form}>
							<form
								onSubmit={onSubmitForm}
								className='space-y-3'
								id='verify-form'>
								{data.notification_target_provided.uuid ===
									NotificationTargetProvidedUUID.EMAIL && (
									<>
										<FormField
											control={form.control}
											name='code'
											render={({ field }) => (
												<FormItem>
													<div className='grid grid-cols-12'>
														<FormLabel className='col-span-3'>
															{t('seo_register_form_email_code')}
														</FormLabel>
														<div className='col-span-9 flex flex-row items-center space-x-2'>
															<FormControl>
																<Input
																	placeholder={t(
																		'seo_register_form_email_code_placeholder',
																	)}
																	{...field}
																/>
															</FormControl>
															<Button
																type='button'
																onClick={onSendCode}
																disabled={!!countdown || codeSending}>
																{!countdown &&
																	t('seo_register_form_email_code_send')}
																{!!countdown &&
																	`${Math.round(countdown / 1000)}`}
																{codeSending && (
																	<Loader2 className='size-4 animate-spin' />
																)}
															</Button>
														</div>
													</div>
													<FormMessage />
												</FormItem>
											)}
										/>
									</>
								)}
							</form>
						</Form>
					)}
					<Separator />
					<DialogFooter>
						<Button type='submit' className='ml-auto' form='verify-form'>
							提交
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default NotificationTargetVerify;
