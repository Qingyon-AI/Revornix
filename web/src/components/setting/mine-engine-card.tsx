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

const MineEngineCard = ({ engine }: { engine: EngineInfo }) => {
	const t = useTranslations();
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
			toast.success('删除成功');
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
		console.log(values);
		mutateUpdateEngine.mutate({
			engine_id: engine.id,
			config_json: values.config_json,
		});
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
						<p className='bg-muted font-mono p-5 rounded text-xs break-all relative overflow-auto'>
							<div className='group absolute top-0 left-0 w-full h-full backdrop-blur rounded flex flex-col justify-center items-center hover:backdrop-blur-none transition-all'>
								<Eye className='text-muted-foreground opacity-50 group-hover:hidden' />
								<p className='text-muted-foreground opacity-50 group-hover:hidden'>配置查看</p>
							</div>
							{engine.config_json}
						</p>
					)}
					{!engine.config_json && (
						<p className='bg-muted font-mono p-5 rounded text-xs flex justify-center items-center h-full'>
							暂无配置
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
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant={'outline'} className='text-xs shadow-none'>
										删除
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>提醒</AlertDialogTitle>
										<AlertDialogDescription>
											确认删除吗？一旦删除将导致无法解析部分内容
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<Button
											variant={'destructive'}
											onClick={() => {
												mutateInstallEngine.mutate({
													engine_id: engine.id,
													status: false,
												});
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

							<Dialog>
								<DialogTrigger asChild>
									<Button variant={'outline'} className='text-xs shadow-none'>
										配置
									</Button>
								</DialogTrigger>

								<DialogContent>
									<DialogHeader>
										<DialogTitle>配置</DialogTitle>
										<DialogDescription>
											此处配置该引擎(
											{locale === 'en' ? engine.name : engine.name_zh}
											)的相关参数
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
																placeholder='请输入参数'
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
											<h3 className='text-xs text-muted-foreground'>范例</h3>
											<p className='rounded bg-muted p-5 font-mono text-sm'>
												{engine.demo_config}
											</p>
										</>
									)}
									<DialogFooter>
										<DialogClose asChild>
											<Button type='button' variant={'secondary'}>
												取消
											</Button>
										</DialogClose>
										<Button
											type='submit'
											form='update_form'
											disabled={mutateUpdateEngine.isPending}>
											确认
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
