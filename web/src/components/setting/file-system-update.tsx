import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getQueryClient } from '@/lib/get-query-client';
import { Button } from '../ui/button';
import { InfoIcon, Loader2, XCircleIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useUserContext } from '@/provider/user-provider';
import { Alert, AlertDescription } from '../ui/alert';
import {
	getProvideFileSystems,
	getUserFileSystemDetail,
	updateFileSystem,
} from '@/service/file-system';
import { diffValues } from '@/lib/utils';
import { Spinner } from '../ui/spinner';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';

const FileSystemUpdate = ({
	userFileSystemId,
}: {
	userFileSystemId: number;
}) => {
	const t = useTranslations();
	const locale = useLocale();

	const { mainUserInfo } = useUserContext();

	const [configDialogOpen, setConfigDialogOpen] = useState(false);

	const queryClient = getQueryClient();

	const formSchema = z.object({
		user_file_system_id: z.number(),
		title: z.string().optional(),
		description: z.string().optional(),
		config_json: z.string().optional(),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			user_file_system_id: userFileSystemId,
			title: '',
			description: '',
			config_json: '',
		},
	});

	const initialValuesRef = useRef<z.infer<typeof formSchema> | null>(null);

	const {
		data: provideFileSystems,
		isFetching: isFetchingProvideFileSystems,
		isRefetching: isRefetchingProvideFileSystems,
	} = useQuery({
		queryKey: ['provide-file-system'],
		queryFn: async () => {
			return await getProvideFileSystems({ keyword: '' });
		},
	});

	const {
		data: file_system_detail,
		refetch: refetchFileSystemDetail,
		isFetching: isFetchingFileSystemDetail,
		isError: isErrorFileSystemDetail,
		error: errorFileSystemDetail,
		isSuccess: isSuccessFileSystemDetail,
	} = useQuery({
		queryKey: ['getUserFileSystemDetail', mainUserInfo?.id],
		queryFn: async () => {
			return await getUserFileSystemDetail({
				user_file_system_id: userFileSystemId,
			});
		},
		enabled: configDialogOpen,
	});

	const mutateUpdateFileSystem = useMutation({
		mutationFn: updateFileSystem,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
			form.reset();
			setConfigDialogOpen(false);
		},
		onError: (error) => {
			toast.error(error.message);
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
		if (!initialValuesRef.current) return;

		const patch = diffValues(values, initialValuesRef.current);

		// 如果啥都没改
		if (Object.keys(patch).length === 0) {
			toast.info(t('form_no_change'));
			return;
		}

		mutateUpdateFileSystem.mutate({
			...values,
			user_file_system_id: userFileSystemId,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	useEffect(() => {
		if (!file_system_detail) return;

		const initialFormValues: z.infer<typeof formSchema> = {
			user_file_system_id: userFileSystemId,
			title: file_system_detail.title ?? '',
			description: file_system_detail.description ?? '',
			config_json: file_system_detail.config_json ?? '',
		};

		form.reset(initialFormValues);
		initialValuesRef.current = initialFormValues; // ✅ 存表单结构
	}, [file_system_detail, userFileSystemId, configDialogOpen]);

	return (
		<Dialog
			open={configDialogOpen}
			onOpenChange={(open) => {
				setConfigDialogOpen(open);
				if (open) {
					refetchFileSystemDetail(); // ✅ 每次打开都拉最新
				}
			}}>
			<DialogTrigger asChild>
				<Button className='text-xs shadow-none'>{t('config')}</Button>
			</DialogTrigger>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className='max-h-[80vh] overflow-auto flex flex-col'>
				<DialogHeader>
					<DialogTitle>{t('config')}</DialogTitle>
					{file_system_detail && (
						<DialogDescription>
							{t(
								'setting_file_system_page_mine_file_system_config_description',
								{
									file_system: file_system_detail?.title,
								},
							)}
						</DialogDescription>
					)}
				</DialogHeader>

				{!file_system_detail && isFetchingFileSystemDetail && (
					<div className='bg-muted text-xs text-muted-foreground p-5 rounded flex flex-row items-center justify-center gap-2'>
						<span>{t('loading')}</span>
						<Spinner />
					</div>
				)}

				{!file_system_detail &&
					isErrorFileSystemDetail &&
					errorFileSystemDetail && (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<XCircleIcon />
								</EmptyMedia>
								<EmptyDescription>
									{errorFileSystemDetail.message}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}

				{isSuccessFileSystemDetail && file_system_detail && (
					<Form {...form}>
						<form
							onSubmit={handleSubmit}
							id='update_form'
							className='space-y-5 flex-1 overflow-auto'>
							<FormItem>
								<div className='grid grid-cols-12 gap-2'>
									<FormLabel className='col-span-3'>
										{t(
											'setting_file_system_page_file_system_form_file_system_id',
										)}
									</FormLabel>
									<div className='col-span-9'>
										<Select
											disabled
											value={file_system_detail.file_system_id.toString()}>
											<SelectTrigger className='w-full'>
												<SelectValue
													placeholder={t(
														'setting_file_system_page_file_system_form_file_system_id_placeholder',
													)}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{provideFileSystems?.data.map((item) => {
														return (
															<SelectItem
																key={item.id}
																value={String(item.id)}
																className='w-full'>
																{item.name}
															</SelectItem>
														);
													})}
												</SelectGroup>
											</SelectContent>
										</Select>
									</div>
								</div>
								<FormMessage />
							</FormItem>

							<Alert>
								<InfoIcon className='h-4 w-4' />
								<AlertDescription>
									{locale === 'zh'
										? provideFileSystems?.data.find((item) => {
												return item.id === file_system_detail.file_system_id;
											})?.description_zh
										: provideFileSystems?.data.find((item) => {
												return item.id === file_system_detail.file_system_id;
											})?.description}
								</AlertDescription>
							</Alert>
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('setting_file_system_page_file_system_form_title')}
												</FormLabel>
												<div className='col-span-9'>
													<Input
														{...field}
														placeholder={t(
															'setting_file_system_page_file_system_form_title_placeholder',
														)}
														value={field.value || ''}
													/>
												</div>
											</div>
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
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t(
														'setting_file_system_page_file_system_form_description',
													)}
												</FormLabel>
												<div className='col-span-9'>
													<Textarea
														{...field}
														placeholder={t(
															'setting_file_system_page_file_system_form_description_placeholder',
														)}
														value={field.value || ''}
													/>
												</div>
											</div>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
							{file_system_detail.demo_config && (
								<>
									<FormField
										name='config_json'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<div className='grid grid-cols-12 gap-2'>
														<FormLabel className='col-span-3'>
															{t(
																'setting_file_system_page_file_system_form_config_json',
															)}
														</FormLabel>
														<div className='col-span-9'>
															<Textarea
																placeholder={t(
																	'setting_file_system_page_file_system_form_config_json_placeholder',
																)}
																className='font-mono break-all'
																{...field}
																value={field.value ?? ''}
															/>
														</div>
													</div>
													<FormMessage />
												</FormItem>
											);
										}}
									/>
									<div className='grid grid-cols-12 gap-2'>
										<FormLabel className='col-span-3'>
											{t(
												'setting_file_system_page_mine_file_system_config_demo',
											)}
										</FormLabel>
										<div className='col-span-9 p-5 rounded bg-muted font-mono text-sm break-all'>
											{file_system_detail.demo_config}
										</div>
									</div>
								</>
							)}
						</form>
					</Form>
				)}

				<Separator />

				<DialogFooter className='flex flex-row items-center justify-end'>
					<DialogClose asChild>
						<Button type='button' variant={'secondary'}>
							{t('cancel')}
						</Button>
					</DialogClose>
					<Button
						type='submit'
						form='update_form'
						disabled={mutateUpdateFileSystem.isPending}>
						{t('confirm')}
						{mutateUpdateFileSystem.isPending && (
							<Loader2 className='animate-spin' />
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default FileSystemUpdate;
