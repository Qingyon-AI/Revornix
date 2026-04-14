import { Card, CardContent } from '@/components/ui/card';
import { Button } from '../ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { HardDrive, Loader2, PlusIcon } from 'lucide-react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useEffect, useState } from 'react';
import {
	getProvideFileSystems,
	installFileSystem,
} from '@/service/file-system';
import { useUserContext } from '@/provider/user-provider';
import { Input } from '../ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import ResourceSelectEmptyState from './resource-select-empty-state';
import FileSystemConfigFields from './file-system-config-fields';

const MineFileSystemAddCard = ({}: {}) => {
	const t = useTranslations();
	const locale = useLocale();
	const { refreshMainUserInfo } = useUserContext();
	const [showMineFileSystemAddDialog, setShowMineFileSystemAddDialog] =
		useState(false);
	const [configJson, setConfigJson] = useState('');
	const formSchema = z.object({
		file_system_id: z.number().int(),
		title: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
	});
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
		},
	});
	const queryClient = getQueryClient();
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
	const mutateInstallFileSystem = useMutation({
		mutationFn: installFileSystem,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
			refreshMainUserInfo();
			form.reset();
			setShowMineFileSystemAddDialog(false);
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
		mutateInstallFileSystem.mutateAsync({
			file_system_id: values.file_system_id,
			title: values.title,
			description: values.description,
			config_json: configJson || undefined,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const selectedFileSystem = provideFileSystems?.data.find((item) => {
		return item.id === form.watch('file_system_id');
	});
	const selectedFileSystemId = form.watch('file_system_id');

	useEffect(() => {
		setConfigJson('');
	}, [selectedFileSystemId, showMineFileSystemAddDialog]);

	return (
		<>
			<Dialog
				open={showMineFileSystemAddDialog}
				onOpenChange={setShowMineFileSystemAddDialog}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-3xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>
							{t('setting_file_system_page_file_system_add_title')}
						</DialogTitle>
						<DialogDescription>
							{t('setting_file_system_page_file_system_add_description')}
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form
							className='flex min-h-0 flex-1 flex-col'
							id='install_form'
							onSubmit={handleSubmit}>
							<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
								<div className='flex flex-col gap-5'>
									<FormField
										control={form.control}
										name='file_system_id'
										render={({ field }) => (
											<FormItem>
												<div className='grid grid-cols-12 gap-2'>
													<FormLabel className='col-span-3'>
														{t(
															'setting_file_system_page_file_system_form_file_system_id',
														)}
													</FormLabel>
													<div className='col-span-9'>
														<Select
															onValueChange={(value) =>
																field.onChange(Number(value))
															}
															value={
																field.value ? String(field.value) : undefined
															}>
															<SelectTrigger className='w-full'>
																<SelectValue
																	placeholder={t(
																		'setting_file_system_page_file_system_form_file_system_id_placeholder',
																	)}
																/>
															</SelectTrigger>
															<SelectContent>
																{!isFetchingProvideFileSystems &&
																!isRefetchingProvideFileSystems &&
																(provideFileSystems?.data?.length ?? 0) === 0 ? (
																	<ResourceSelectEmptyState
																		icon={HardDrive}
																		title={t(
																			'setting_default_file_system_empty_title',
																		)}
																		description={t(
																			'setting_default_file_system_empty_description',
																		)}
																	/>
																) : (
																	<SelectGroup>
																		{provideFileSystems?.data.map((item) => {
																			return (
																				<SelectItem
																					key={item.id}
																					value={String(item.id)}
																					className='w-full'>
																					{locale === 'zh'
																						? item.name_zh
																						: item.name}
																				</SelectItem>
																			);
																		})}
																	</SelectGroup>
																)}
															</SelectContent>
														</Select>
													</div>
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>

									{selectedFileSystemId ? (
										<Alert>
											<InfoIcon className='h-4 w-4' />
											<AlertDescription>
												{locale === 'zh'
													? selectedFileSystem?.description_zh
													: selectedFileSystem?.description}
											</AlertDescription>
										</Alert>
									) : null}

							<FormField
								control={form.control}
								name='title'
								render={({ field }) => (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('setting_file_system_page_file_system_form_title')}
											</FormLabel>
											<div className='col-span-9'>
												<Input
													{...field}
													placeholder={t(
														'setting_file_system_page_file_system_form_title_placeholder'
													)}
													value={field.value || ''}
												/>
											</div>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='description'
								render={({ field }) => (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t(
													'setting_file_system_page_file_system_form_description'
												)}
											</FormLabel>
											<div className='col-span-9'>
												<Textarea
													{...field}
													placeholder={t(
														'setting_file_system_page_file_system_form_description_placeholder'
													)}
													value={field.value || ''}
												/>
											</div>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
									{selectedFileSystem ? (
										<FileSystemConfigFields
											fileSystemId={selectedFileSystem.id}
											demoConfig={selectedFileSystem.demo_config}
											value={configJson}
											onChange={setConfigJson}
										/>
									) : null}
								</div>
							</div>
							<DialogFooter className='sticky bottom-0 z-10 flex flex-row items-center justify-end border-t border-border/60 bg-background px-6 py-4'>
						<DialogClose asChild>
							<Button type='button' variant={'secondary'}>
								{t('cancel')}
							</Button>
						</DialogClose>
						<Button
							type='submit'
							form='install_form'
							disabled={mutateInstallFileSystem.isPending}>
							{t('confirm')}
							{mutateInstallFileSystem.isPending && (
								<Loader2 className='animate-spin' />
							)}
						</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
			<Card className='h-full'>
				<CardContent
					className='flex-1 flex flex-col justify-center items-center text-sm rounded cursor-pointer'
					onClick={() => {
						setShowMineFileSystemAddDialog(true);
					}}>
					<div className='mb-3 p-3 bg-muted rounded-full'>
						<PlusIcon className='h-12 w-12' />
					</div>
					<p>{t('setting_file_system_page_file_system_add_title')}</p>
				</CardContent>
			</Card>
		</>
	);
};
export default MineFileSystemAddCard;
