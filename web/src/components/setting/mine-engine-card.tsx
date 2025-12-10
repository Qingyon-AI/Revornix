import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import {
	deleteEngine,
	getProvideEngines,
	updateEngine,
} from '@/service/engine';
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
import { UserEngineInfo } from '@/generated';
import { Separator } from '../ui/separator';
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
import { useUserContext } from '@/provider/user-provider';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';

const MineEngineCard = ({ user_engine }: { user_engine: UserEngineInfo }) => {
	const t = useTranslations();
	const { refreshMainUserInfo } = useUserContext();
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
	const {
		data: provideEngines,
		isFetching: isFetchingProvideEngines,
		isRefetching: isRefetchingProvideEngines,
	} = useQuery({
		queryKey: ['provide-engine'],
		queryFn: async () => {
			return await getProvideEngines({ keyword: '' });
		},
	});
	const mutateDeleteEngine = useMutation({
		mutationFn: deleteEngine,
		onSuccess: () => {
			toast.success(t('setting_engine_page_mine_engine_delete_success'));
			queryClient.invalidateQueries({
				queryKey: ['mine-engine'],
			});
			refreshMainUserInfo();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const mutateUpdateEngine = useMutation({
		mutationFn: updateEngine,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['mine-engine'],
			});
			toast.success(t('setting_engine_page_mine_engine_update_success'));
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
		await mutateUpdateEngine.mutateAsync({
			user_engine_id: user_engine.id,
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
		if (!user_engine) return;
		form.setValue('title', user_engine.title);
		form.setValue('description', user_engine.description);
		form.setValue('config_json', user_engine.config_json);
	}, [user_engine]);

	return (
		<>
			<Card className='bg-muted/50'>
				<CardHeader>
					<CardTitle>{user_engine.title}</CardTitle>
					<CardDescription>{user_engine.description}</CardDescription>
				</CardHeader>
				<CardFooter className='flex justify-end gap-2'>
					<Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
						<DialogTrigger asChild>
							<Button className='text-xs shadow-none'>{t('config')}</Button>
						</DialogTrigger>
						<DialogContent className='max-h-[80vh] flex flex-col'>
							<DialogHeader>
								<DialogTitle>{t('config')}</DialogTitle>
								<DialogDescription>
									{t('setting_engine_page_mine_engine_config_description', {
										engine: user_engine.title,
									})}
								</DialogDescription>
							</DialogHeader>
							<Form {...form}>
								<form
									onSubmit={handleSubmit}
									id='update_form'
									className='space-y-5 flex-1 overflow-auto'>
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('setting_engine_page_engine_form_engine_id')}
											</FormLabel>
											<div className='col-span-9'>
												<Select
													disabled
													value={user_engine.engine_id.toString()}>
													<SelectTrigger className='w-full'>
														<SelectValue
															placeholder={t(
																'setting_engine_page_engine_form_engine_id_placeholder'
															)}
														/>
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															{provideEngines?.data.map((item) => {
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
									<FormField
										name='title'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<div className='grid grid-cols-12 gap-2'>
														<FormLabel className='col-span-3'>
															{t('setting_engine_page_engine_form_title')}
														</FormLabel>
														<div className='col-span-9'>
															<Input
																{...field}
																placeholder={t(
																	'setting_engine_page_engine_form_title_placeholder'
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
															{t('setting_engine_page_engine_form_description')}
														</FormLabel>
														<div className='col-span-9'>
															<Textarea
																{...field}
																placeholder={t(
																	'setting_engine_page_engine_form_description_placeholder'
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
									{user_engine.demo_config && (
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
																		'setting_engine_page_engine_form_config_json'
																	)}
																</FormLabel>
																<div className='col-span-9'>
																	<Textarea
																		placeholder={t(
																			'setting_engine_page_engine_form_config_json_placeholder'
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
													{t('setting_engine_page_mine_engine_config_demo')}
												</FormLabel>
												<div className='col-span-9 p-5 rounded bg-muted font-mono text-sm break-all'>
													{user_engine.demo_config}
												</div>
											</div>
										</>
									)}
								</form>
							</Form>
							<Separator />
							<DialogFooter>
								<DialogClose asChild>
									<Button type='button' variant={'secondary'}>
										{t('cancel')}
									</Button>
								</DialogClose>
								<Button
									type='submit'
									form='update_form'
									disabled={mutateUpdateEngine.isPending}>
									{t('confirm')}
									{mutateUpdateEngine.isPending && (
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
									{t('setting_engine_page_mine_engine_delete_alert')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<Button
									variant={'destructive'}
									onClick={async () => {
										const res = await mutateDeleteEngine.mutateAsync({
											user_engine_id: user_engine.id,
										});
										if (res.success) {
											setDeleteDialogOpen(false);
										}
									}}
									disabled={mutateDeleteEngine.isPending}>
									{t('confirm')}
									{mutateDeleteEngine.isPending && (
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
export default MineEngineCard;
