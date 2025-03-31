'use client';

import AddSectionLabelDialog from '@/components/document/add-section-label-dialog';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import ImageUpload from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import MultipleSelector, { Option } from '@/components/ui/multiple-selector';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getQueryClient } from '@/lib/get-query-client';
import { createAttachment } from '@/service/attachment';
import { createSection, getMineLabels } from '@/service/section';
import { zodResolver } from '@hookform/resolvers/zod';
import { utils } from '@kinda/utils';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
	title: z.string().min(1, { message: '专栏名称是必须的' }),
	description: z.string().min(1, { message: '专栏描述是必须的' }),
	cover_id: z.optional(z.number()),
	public: z.boolean(),
	labels: z.array(z.number()),
});

const CreatePage = () => {
	const queryClient = getQueryClient();
	const router = useRouter();
	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			cover_id: undefined,
			title: '',
			description: '',
			labels: [],
			public: false,
		},
	});

	const { data: labels } = useQuery({
		queryKey: ['getSectionLabels'],
		queryFn: getMineLabels,
	});

	const getLabelByValue = (value: number): Option | undefined => {
		if (!labels) return;
		return labels.data
			.map((label) => {
				return { label: label.name, value: label.id };
			})
			.find((label) => label.value === value);
	};

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
		const [res, err] = await utils.to(
			createSection({
				title: values.title,
				description: values.description,
				cover_id: values.cover_id,
				public: values.public,
				labels: values.labels,
			})
		);
		if (err || !res) {
			toast.error('创建失败');
			return;
		}
		toast.success('创建成功');
		queryClient.invalidateQueries({
			predicate: (query) => {
				return (
					query.queryKey.includes('searchPublicSection') ||
					query.queryKey.includes('searchMySection')
				);
			},
		});
		router.push(`/section/detail/${res.id}`);
	};

	const onFormValidateError = (error: any) => {
		toast.error('表单验证错误');
		console.error(error);
	};

	return (
		<div className='px-5 pb-5'>
			<AddSectionLabelDialog
				open={showAddLabelDialog}
				onOpenChange={setShowAddLabelDialog}
			/>
			<Form {...form}>
				<form onSubmit={onSubmitForm}>
					<FormField
						control={form.control}
						name='cover_id'
						render={({ field }) => {
							return (
								<FormItem className='mb-5 w-full p-5 flex justify-center items-center'>
									<ImageUpload
										onSuccess={async (fileName) => {
											const [res, err] = await utils.to(
												createAttachment({ name: fileName, description: '' })
											);
											if (err || !res) {
												toast.error('上传失败');
												return;
											}
											field.onChange(res.id);
										}}
										onDelete={() => {
											field.onChange(null);
										}}
									/>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name='title'
						render={({ field }) => {
							return (
								<FormItem className='mb-5'>
									<FormLabel>专栏名称</FormLabel>
									<Input placeholder='请输入专栏名称' {...field} />
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name='description'
						render={({ field }) => {
							return (
								<FormItem className='mb-5'>
									<FormLabel>专栏描述</FormLabel>
									<Textarea placeholder='请输入专栏描述' {...field} />
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name='labels'
						render={({ field }) => {
							return (
								<FormItem className='space-y-0 mb-5'>
									<FormLabel>专栏标签</FormLabel>
									{labels ? (
										<MultipleSelector
											defaultOptions={labels.data.map((label) => {
												return { label: label.name, value: label.id };
											})}
											onChange={(value) => {
												field.onChange(value.map(({ label, value }) => value));
											}}
											value={
												field.value &&
												field.value
													.map((id) => getLabelByValue(id))
													.filter((option) => !!option)
											}
											placeholder='请选择专栏的标签'
											emptyIndicator={
												<p className='text-center text-sm leading-10 text-gray-600 dark:text-gray-400'>
													找不到相应标签
												</p>
											}
										/>
									) : (
										<Skeleton className='h-10' />
									)}
									<div className='text-muted-foreground text-xs flex flex-row gap-0 items-center'>
										<span>没有找到你想要的标签？</span>
										<Button
											type='button'
											className='text-xs text-muted-foreground px-0 py-0 h-fit'
											variant={'link'}
											onClick={() => setShowAddLabelDialog(true)}>
											增加标签
										</Button>
									</div>
								</FormItem>
							);
						}}
					/>
					<FormField
						name='public'
						control={form.control}
						render={({ field }) => {
							return (
								<FormItem className='mb-5'>
									<div className='flex flex-row gap-1 items-center'>
										<FormLabel className='flex flex-row gap-1 items-center'>
											是否公开
										</FormLabel>
										<Switch
											checked={field.value}
											onCheckedChange={(e) => {
												field.onChange(e);
											}}
										/>
									</div>
									<FormDescription>
										选择公开的话所有人都可以看到这个专栏并且获取相关信息。
									</FormDescription>
								</FormItem>
							);
						}}
					/>
					<Button className='w-full' type='submit'>
						确认创建
					</Button>
				</form>
			</Form>
		</div>
	);
};

export default CreatePage;
