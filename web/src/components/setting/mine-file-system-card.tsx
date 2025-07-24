import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { useMutation } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { UserFileSystemInfo } from '@/generated';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
import { useEffect, useState } from 'react';
import {
	deleteUserFileSystem,
	installFileSystem,
	updateFileSystem,
} from '@/service/file-system';
import { useUserContext } from '@/provider/user-provider';
import { Input } from '../ui/input';

const MineFileSystemCard = ({
	user_file_system,
}: {
	user_file_system: UserFileSystemInfo;
}) => {
	const t = useTranslations();
	const { refreshUserInfo } = useUserContext();
	const [configDialogOpen, setConfigDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const formSchema = z.object({
		title: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		config_json: z.string().optional().nullable(),
	});
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			config_json: '',
		},
	});
	const queryClient = getQueryClient();
	const mutateInstallFileSystem = useMutation({
		mutationFn: installFileSystem,
		onSuccess: () => {
			toast.success(t('setting_file_system_install_success'));
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
			refreshUserInfo();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const mutateDeleteUserFileSystem = useMutation({
		mutationFn: deleteUserFileSystem,
		onSuccess: () => {
			toast.success(t('setting_file_system_delete_success'));
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
			refreshUserInfo();
		},
	});
	const mutateUpdateFileSystem = useMutation({
		mutationFn: updateFileSystem,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
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
		await mutateUpdateFileSystem.mutateAsync({
			user_file_system_id: user_file_system.id,
			config_json: values.config_json,
			title: values.title,
			description: values.description,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	useEffect(() => {
		if (!user_file_system) return;
		form.setValue('title', user_file_system.title);
		form.setValue('description', user_file_system.description);
		form.setValue('config_json', user_file_system.config_json);
	}, [user_file_system]);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>{user_file_system.title}</CardTitle>
					<CardDescription>{user_file_system.description}</CardDescription>
				</CardHeader>
				<CardFooter className='flex justify-end gap-2'>
					<Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
						<DialogTrigger asChild>
							<Button className='text-xs shadow-none'>{t('config')}</Button>
						</DialogTrigger>
						<DialogContent
							onOpenAutoFocus={(e) => e.preventDefault()}
							className='max-h-[80vh] overflow-auto'>
							<DialogHeader>
								<DialogTitle>{t('config')}</DialogTitle>
								<DialogDescription>
									{t(
										'setting_file_system_page_mine_file_system_config_description',
										{
											file_system: user_file_system.title ?? '未命名',
										}
									)}
								</DialogDescription>
							</DialogHeader>
							<Form {...form}>
								<form
									onSubmit={handleSubmit}
									id='update_form'
									className='space-y-5'>
									<FormField
										name='title'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<div className='grid grid-cols-12 gap-2'>
														<FormLabel className='col-span-3'>
															{t(
																'setting_file_system_page_file_system_form_title'
															)}
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
											);
										}}
									/>
									{user_file_system.demo_config && (
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
																		'setting_file_system_page_file_system_form_config_json'
																	)}
																</FormLabel>
																<div className='col-span-9'>
																	<Textarea
																		placeholder={t(
																			'setting_file_system_page_file_system_form_config_json_placeholder'
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
														'setting_file_system_page_mine_file_system_config_demo'
													)}
												</FormLabel>
												<div className='col-span-9 p-5 rounded bg-muted font-mono text-sm break-all'>
													{user_file_system.demo_config}
												</div>
											</div>
										</>
									)}
								</form>
							</Form>
							<DialogFooter>
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
					<AlertDialog
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}>
						<AlertDialogTrigger asChild>
							<Button variant={'secondary'} className='text-xs shadow-none'>
								{t('delete')}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{t('tip')}</AlertDialogTitle>
								<AlertDialogDescription>
									{t('setting_file_system_page_mine_file_system_delete_alert')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<Button
									variant={'destructive'}
									onClick={async () => {
										const res = await mutateDeleteUserFileSystem.mutateAsync({
											user_file_system_id: user_file_system.id,
										});
										if (res.success) {
											setDeleteDialogOpen(false);
										}
									}}
									disabled={mutateInstallFileSystem.isPending}>
									{t('confirm')}
									{mutateInstallFileSystem.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
								<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardFooter>
			</Card>
		</>
	);
};
export default MineFileSystemCard;
