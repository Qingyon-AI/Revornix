import z from 'zod';
import { Button } from '../ui/button';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAllMineSections } from '@/service/section';
import MultipleSelector, { Option } from '../ui/multiple-selector';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { getRssServerDetail, updateRssServer } from '@/service/rss';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Skeleton } from '../ui/skeleton';
import { useEffect, useState } from 'react';

const UpdateRss = ({ rss_id }: { rss_id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const [showUpdateDialog, setShowUpdateDialog] = useState(false);

	const formSchema = z.object({
		rss_id: z.number(),
		title: z.string(),
		description: z.string(),
		address: z.string(),
		section_ids: z.array(z.number()),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			rss_id: rss_id,
			title: '',
			description: '',
			address: '',
			section_ids: [],
		},
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
		mutationFn: updateRssServer,
		onSuccess(data, variables, context) {
			toast.success('更新成功');
			queryClient.invalidateQueries({
				queryKey: ['searchMyRssServers', ''],
			});
			queryClient.invalidateQueries({
				queryKey: ['getRssServerDetail', rss_id],
			});
			setShowUpdateDialog(false);
		},
		onError(error, variables, context) {
			toast.error('更新失败');
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

	const { data } = useQuery({
		queryKey: ['getRssServerDetail', rss_id],
		queryFn: async () => {
			return await getRssServerDetail({ rss_id: rss_id });
		},
	});

	useEffect(() => {
		if (!data) return;
		form.reset({
			rss_id: rss_id,
			title: data.title,
			description: data.description,
			address: data.address,
			section_ids: data.sections?.map((section) => section.id) || [],
		});
	}, [data]);

	return (
		<Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
			<DialogTrigger asChild>
				<Button>更新</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[80vh] overflow-auto'>
				<DialogHeader>
					<DialogTitle>更新RSS</DialogTitle>
					<DialogDescription>
						更新后，原订阅涉及的自动爬取会停止，但保留已抓取文档。
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form id='update-form' className='space-y-5' onSubmit={handleSubmit}>
						<FormField
							name='title'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>标题</FormLabel>
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
											<FormLabel className='col-span-3'>描述</FormLabel>
											<Textarea {...field} className='col-span-9' />
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<FormField
							name='address'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>源</FormLabel>
											<Input {...field} className='col-span-9' />
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
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>专栏</FormLabel>
												<div className='col-span-9'>
													<MultipleSelector
														defaultOptions={sections.data.map((section) => {
															return {
																label: section.title,
																value: section.id,
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
														emptyIndicator={
															<p className='text-center text-sm leading-10 text-gray-600 dark:text-gray-400'>
																暂无专栏
															</p>
														}
													/>
												</div>
											</div>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						) : (
							<Skeleton className='h-10' />
						)}
					</form>
				</Form>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant='secondary'>取消</Button>
					</DialogClose>
					<Button type='submit' form='update-form'>
						确认
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default UpdateRss;
