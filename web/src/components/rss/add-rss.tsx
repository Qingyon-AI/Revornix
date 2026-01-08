import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import MultipleSelector from '../ui/multiple-selector';
import { Skeleton } from '../ui/skeleton';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAllMineSections } from '@/service/section';
import { createRssServer } from '@/service/rss';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Info, Loader2, PlusCircle, Trash, UploadIcon } from 'lucide-react';
import Parser from 'rss-parser';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { Separator } from '../ui/separator';
import { useUserContext } from '@/provider/user-provider';
import { FileService } from '@/lib/file';
import { getUserFileSystemDetail } from '@/service/file-system';

const AddRss = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [uploadingCover, setUploadingCover] = useState(false);
	const [tempFile, setTempFile] = useState<File>();

	const { mainUserInfo } = useUserContext();

	const [testing, startTest] = useTransition();
	const [filling, startFill] = useTransition();

	const formSchema = z.object({
		title: z.string().min(1),
		description: z.string().optional().nullable(),
		cover: z.string().optional().nullable(),
		address: z.string().url(),
		section_ids: z.array(z.number()),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			cover: '',
			address: '',
			section_ids: [],
		},
	});

	const { data: userFileSystemDetail } = useQuery({
		queryKey: ['getUserFileSystemDetail', mainUserInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	const { data: sections } = useQuery({
		queryKey: ['getMineDocumentSections'],
		queryFn: getAllMineSections,
	});

	const getSectionByValue = (value: number): Option | undefined => {
		if (!sections) return;
		return sections.data
			.map((section) => {
				return { label: section.title, value: section.id };
			})
			.find((section) => section.value === value);
	};

	const mutateAddRssServer = useMutation({
		mutationFn: createRssServer,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				queryKey: ['searchMyRssServers', ''],
			});
			setShowAddDialog(false);
			form.reset();
		},
		onError(error, variables, context) {
			toast.error(error.message);
			console.error(error);
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
		mutateAddRssServer.mutate(values);
	};

	const onFormValidateError = (errors: any) => {
		toast.error(t('form_validate_failed'));
		console.error(errors);
	};

	const fillForm = () => {
		startFill(async () => {
			const isValidate = await form.trigger('address');
			if (!isValidate) {
				return;
			}
			form.setValue('cover', undefined);
			setTempFile(undefined);

			const response = await fetch(form.getValues('address'));

			if (!response.ok) {
				toast.error(t('rss_test_failed'));
				return;
			}

			const response_text = await response.text();
			const parser = new Parser();
			const res = await parser.parseString(response_text);

			const { title, description, image } = res;
			title && form.setValue('title', title);
			description && form.setValue('description', description);
			image && form.setValue('cover', image.url);
		});
	};

	const testConnectivity = () => {
		startTest(async () => {
			const isValidate = await form.trigger('address');
			if (!isValidate) {
				return;
			}
			const response = await fetch(form.getValues('address'));
			if (response.ok) {
				toast.success(t('rss_test_successful'));
			} else {
				toast.error(t('rss_test_failed'));
			}
		});
	};

	const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}
		if (!mainUserInfo?.default_user_file_system) {
			toast.error('No user default file system found');
			return;
		}
		setUploadingCover(true);
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const fileName = `files/${name}.${suffix}`;
		await fileService.uploadFile(fileName, file);
		setTempFile(file);
		form.setValue('cover', fileName);
		setUploadingCover(false);
	};

	return (
		<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
			<DialogTrigger asChild>
				<Button>
					{t('rss_add')}
					<PlusCircle />
				</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[80vh] flex flex-col'>
				<DialogHeader>
					<DialogTitle>{t('rss_add')}</DialogTitle>
					<DialogDescription>{t('rss_add_tips')}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						id='add-form'
						className='space-y-5 flex-1 overflow-auto p-1'
						onSubmit={handleSubmit}>
						<FormField
							name='address'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('rss_form_address')}
											</FormLabel>
											<Input {...field} className='col-span-9' />
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<FormField
							name='cover'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('rss_form_cover')}
											</FormLabel>
											<div className='col-span-9 rounded border w-full h-32 overflow-hidden relative flex justify-center items-center'>
												{field.value && tempFile && (
													<>
														<img
															src={URL.createObjectURL(tempFile)}
															alt='cover'
															className='w-full h-full object-cover rounded'
														/>
														<div className='absolute left-0 top-0 w-full h-full flex justify-center items-center rounded'>
															<Button
																size={'icon'}
																className='text-muted-foreground'
																onClick={() => {
																	form.setValue('cover', '');
																	setTempFile(undefined);
																}}>
																<Trash />
															</Button>
														</div>
													</>
												)}
												{field.value && !tempFile && (
													<>
														<img
															src={field.value}
															alt='cover'
															className='w-full h-full object-cover rounded'
														/>
														<div className='absolute left-0 top-0 w-full h-full flex justify-center items-center rounded'>
															<Button
																size={'icon'}
																className='text-muted-foreground'
																onClick={() => {
																	form.setValue('cover', '');
																}}>
																<Trash />
															</Button>
														</div>
													</>
												)}
												{!field.value && (
													<label className='w-full h-full flex flex-col gap-1 justify-center items-center hover:bg-card'>
														<UploadIcon className='size-4 text-muted-foreground' />
														<p className='flex flex-row gap-1 text-xs text-muted-foreground'>
															<span>Upload</span>
															{uploadingCover && (
																<Loader2 className='size-4 animate-spin' />
															)}
														</p>
														<input
															disabled={uploadingCover}
															accept={'image/*'}
															type='file'
															className='hidden'
															onChange={handleUploadFile}
														/>
													</label>
												)}
											</div>
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<FormField
							name='title'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('rss_form_title')}
											</FormLabel>
											<div className='col-span-9'>
												<Input {...field} />
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
												{t('rss_form_description')}
											</FormLabel>
											<Textarea
												{...field}
												className='col-span-9'
												value={field.value || ''}
											/>
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						{sections ? (
							<FormField
								control={form.control}
								name='section_ids'
								render={({ field }) => {
									return (
										<FormItem className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('rss_form_sections')}
											</FormLabel>
											<div className='col-span-9'>
												<MultipleSelector
													placeholder={t('rss_form_sections_placeholder')}
													options={sections.data.map((section) => {
														return {
															label: section.title,
															value: section.id.toString(),
														};
													})}
													onChange={(value) => {
														field.onChange(
															value.map(({ label, value }) => value)
														);
													}}
													value={
														field.value &&
														field.value
															.map((id) => getSectionByValue(id))
															.filter((option) => !!option)
													}
												/>
											</div>
										</FormItem>
									);
								}}
							/>
						) : (
							<Skeleton className='h-10' />
						)}
					</form>
				</Form>

				<Separator />

				<DialogFooter className='w-full flex flex-row justify-between! items-center'>
					<div className='flex flex-row gap-3 items-center h-5'>
						<Button
							variant={'link'}
							className='text-xs p-0 m-0'
							onClick={testConnectivity}
							disabled={testing}>
							{t('rss_test')}
							{testing && <Loader2 className='size-4 animate-spin' />}
						</Button>
						<Separator orientation={'vertical'} />
						<div className='flex flex-row gap-1'>
							<Button
								variant={'link'}
								className='text-xs p-0 m-0'
								onClick={fillForm}
								disabled={filling}>
								{t('rss_auto_fill')}
								{filling && <Loader2 className='animate-spin' />}
							</Button>
							<Tooltip>
								<TooltipTrigger>
									<Info size={15} />
								</TooltipTrigger>
								<TooltipContent>{t('rss_auto_fill_tips')}</TooltipContent>
							</Tooltip>
						</div>
					</div>

					<div className='flex flex-row items-center gap-3'>
						<DialogClose asChild>
							<Button variant={'secondary'}>{t('cancel')}</Button>
						</DialogClose>
						<div className='flex flex-row items-center gap-1'>
							<Button type='submit' form='add-form'>
								{t('submit')}
							</Button>
						</div>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default AddRss;
