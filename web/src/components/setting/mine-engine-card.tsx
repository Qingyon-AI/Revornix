import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { installEngine, updateEngine } from '@/service/engine';
import { toast } from 'sonner';
import { Eye, Loader2 } from 'lucide-react';
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
import { EngineInfo } from '@/generated';
import { Separator } from '../ui/separator';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormMessage } from '../ui/form';
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
import { useState } from 'react';

const MineEngineCard = ({ engine }: { engine: EngineInfo }) => {
	const t = useTranslations();
	const [configDialogOpen, setConfigDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const locale = useLocale();
	const formSchema = z.object({
		config_json: z.string(),
	});
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			config_json: engine.config_json || '',
		},
	});
	const queryClient = getQueryClient();
	const mutateInstallEngine = useMutation({
		mutationFn: installEngine,
		onSuccess: () => {
			toast.success(t('setting_engine_page_mine_engine_delete_success'));
			queryClient.invalidateQueries({
				queryKey: ['mine-engine'],
			});
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
			engine_id: engine.id,
			config_json: values.config_json,
		});
		setConfigDialogOpen(false);
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<Card className='bg-muted/50'>
				<CardHeader>
					<CardTitle>
						{locale === 'en' ? engine.name : engine.name_zh}
					</CardTitle>
					<CardDescription>
						{locale === 'en' ? engine.description : engine.description_zh}
					</CardDescription>
				</CardHeader>
				<CardContent className='flex-1'>
					{engine.config_json && (
						<div className='bg-muted font-mono p-5 rounded text-xs break-all relative overflow-auto'>
							<div className='group absolute top-0 left-0 w-full h-full backdrop-blur rounded flex flex-col justify-center items-center hover:backdrop-blur-none transition-all'>
								<Eye className='text-muted-foreground opacity-50 group-hover:hidden' />
								<p className='text-muted-foreground opacity-50 group-hover:hidden'>
									{t('setting_engine_page_mine_engine_config_see')}
								</p>
							</div>
							{engine.config_json}
						</div>
					)}
					{!engine.config_json && (
						<p className='bg-muted font-mono p-5 rounded text-xs flex justify-center items-center h-full'>
							{t('setting_engine_page_mine_engine_config_empty')}
						</p>
					)}
				</CardContent>
				<CardFooter className='flex flex-col w-full gap-2'>
					<div className='w-full flex justify-between items-center'>
						<div>
							<p className='text-muted-foreground text-xs w-full mb-1'>
								{format(engine.create_time, 'MM-dd HH:mm')}
							</p>
							<p className='text-xs text-muted-foreground'>
								Created by Revornix
							</p>
						</div>
						<div className='flex flex-row gap-1 items-center'>
							<AlertDialog
								open={deleteDialogOpen}
								onOpenChange={setDeleteDialogOpen}>
								<AlertDialogTrigger asChild>
									<Button variant={'outline'} className='text-xs shadow-none'>
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
												const res = await mutateInstallEngine.mutateAsync({
													engine_id: engine.id,
													status: false,
												});
												if (res.success) {
													setDeleteDialogOpen(false);
												}
											}}
											disabled={mutateInstallEngine.isPending}>
											{t('confirm')}
											{mutateInstallEngine.isPending && (
												<Loader2 className='animate-spin' />
											)}
										</Button>
										<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>

							<Dialog
								open={configDialogOpen}
								onOpenChange={setConfigDialogOpen}>
								<DialogTrigger asChild>
									<Button variant={'outline'} className='text-xs shadow-none'>
										{t('config')}
									</Button>
								</DialogTrigger>

								<DialogContent>
									<DialogHeader>
										<DialogTitle>{t('config')}</DialogTitle>
										<DialogDescription>
											{t('setting_engine_page_mine_engine_config_description', {
												engine: locale === 'en' ? engine.name : engine.name_zh,
											})}
										</DialogDescription>
									</DialogHeader>
									<Form {...form}>
										<form onSubmit={handleSubmit} id='update_form'>
											<FormField
												name='config_json'
												control={form.control}
												render={({ field }) => {
													return (
														<FormItem>
															<Textarea
																placeholder={t(
																	'setting_engine_page_mine_engine_config_placeholder'
																)}
																className='font-mono'
																{...field}
															/>
															<FormMessage />
														</FormItem>
													);
												}}
											/>
										</form>
									</Form>
									{engine.demo_config && (
										<>
											<Separator />
											<h3 className='text-xs text-muted-foreground'>
												{t('setting_engine_page_mine_engine_config_demo')}
											</h3>
											<p className='rounded bg-muted p-5 font-mono text-sm'>
												{engine.demo_config}
											</p>
										</>
									)}
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
						</div>
					</div>
				</CardFooter>
			</Card>
		</>
	);
};
export default MineEngineCard;
