import { Card, CardContent } from '@/components/ui/card';
import { Button } from '../ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { Loader2, PlusIcon } from 'lucide-react';
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
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useState } from 'react';
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
import { getProvideEngines, installEngine } from '@/service/engine';
import { Separator } from '../ui/separator';

const MineEngineAddCard = ({}: {}) => {
	const t = useTranslations();
	const { refreshMainUserInfo } = useUserContext();
	const [showMineEngineAddDialog, setShowMineEngineAddDialog] = useState(false);
	const formSchema = z.object({
		engine_id: z.number().int(),
		title: z.string(),
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
	const mutateInstallEngine = useMutation({
		mutationFn: installEngine,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['mine-engine'],
			});
			refreshMainUserInfo();
			form.reset();
			setShowMineEngineAddDialog(false);
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
		mutateInstallEngine.mutateAsync({
			engine_id: values.engine_id,
			title: values.title,
			description: values.description,
			config_json: values.config_json,
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<Dialog
				open={showMineEngineAddDialog}
				onOpenChange={setShowMineEngineAddDialog}>
				<DialogContent
					className='max-h-[80vh] flex flex-col'
					onOpenAutoFocus={(e) => e.preventDefault()}>
					<DialogHeader>
						<DialogTitle>
							{t('setting_engine_page_engine_add_title')}
						</DialogTitle>
						<DialogDescription>
							{t('setting_engine_page_engine_add_description')}
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form
							className='flex flex-col gap-5 flex-1 overflow-auto'
							id='install_form'
							onSubmit={handleSubmit}>
							<FormField
								control={form.control}
								name='engine_id'
								render={({ field }) => (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('setting_engine_page_engine_form_engine_id')}
											</FormLabel>
											<div className='col-span-9'>
												<Select
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
													value={field.value ? String(field.value) : undefined}>
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
								)}
							/>
							<FormField
								control={form.control}
								name='title'
								render={({ field }) => (
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
								)}
							/>
							<FormField
								control={form.control}
								name='description'
								render={({ field }) => (
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
								)}
							/>
							{provideEngines?.data.find((item) => {
								return item.id === form.watch('engine_id');
							})?.demo_config && (
								<>
									<FormField
										name='config_json'
										control={form.control}
										render={({ field }) => {
											return (
												<FormItem>
													<div className='grid grid-cols-12 gap-2'>
														<FormLabel className='col-span-3'>
															{t('setting_engine_page_engine_form_config_json')}
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
											{
												provideEngines?.data.find((item) => {
													return item.id === form.watch('engine_id');
												})?.demo_config
											}
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
							form='install_form'
							disabled={mutateInstallEngine.isPending}>
							{t('confirm')}
							{mutateInstallEngine.isPending && (
								<Loader2 className='animate-spin' />
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Card>
				<CardContent
					className='flex-1 flex flex-col justify-center items-center text-sm rounded cursor-pointer'
					onClick={() => {
						setShowMineEngineAddDialog(true);
					}}>
					<div className='mb-3 p-3 bg-muted rounded-full'>
						<PlusIcon className='h-12 w-12' />
					</div>
					<p>{t('setting_engine_page_engine_add_title')}</p>
				</CardContent>
			</Card>
		</>
	);
};
export default MineEngineAddCard;
