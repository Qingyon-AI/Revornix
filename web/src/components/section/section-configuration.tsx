import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import CoverUpdate from './cover-update';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import { useForm, useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { utils } from '@kinda/utils';
import {
	getMineLabels,
	getSectionDetail,
	updateSection,
} from '@/service/section';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import MultipleSelector, { Option } from '../ui/multiple-selector';
import { Skeleton } from '../ui/skeleton';
import AddSectionLabelDialog from '../document/add-section-label-dialog';

const updateFormSchema = z.object({
	section_id: z.number().int(),
	cover: z.object({ id: z.number(), name: z.string() }).optional(),
	title: z.string().min(1),
	description: z.string().min(1),
	public: z.boolean(),
	labels: z.array(z.number()),
});

const SectionConfiguration = ({ section_id }: { section_id: string }) => {
	const id = section_id;

	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);

	const { data: labels } = useQuery({
		queryKey: ['getSectionLabels'],
		queryFn: getMineLabels,
	});

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: Number(id) });
		},
	});

	const form = useForm({
		defaultValues: {
			section_id: Number(id),
			title: '',
			cover: undefined,
			description: '',
			public: false,
			labels: [],
		},
		resolver: zodResolver(updateFormSchema),
	});

	useEffect(() => {
		form.setValue('title', section?.title || '');
		form.setValue('description', section?.description || '');
		form.setValue('public', section?.public || false);
		// @ts-expect-error
		form.setValue('cover', section?.cover || undefined);
		// @ts-expect-error
		form.setValue('labels', section?.labels?.map((label) => label.id) || []);
	}, [section]);

	const getLabelByValue = (value: number): Option | undefined => {
		if (!labels) return;
		return labels.data
			.map((label) => {
				return { label: label.name, value: label.id };
			})
			.find((label) => label.value === value);
	};

	const [updating, setUpdating] = useState<boolean>(false);

	const queryClient = getQueryClient();

	const onSubmitUpdateForm = async (
		event: React.FormEvent<HTMLFormElement>
	) => {
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

	const onFormValidateSuccess = async (
		values: z.infer<typeof updateFormSchema>
	) => {
		setUpdating(true);
		const [res, err] = await utils.to(
			updateSection({
				...values,
				cover_id: values.cover?.id,
			})
		);
		if (err) {
			toast.error('更新失败');
			setUpdating(false);
			return;
		}
		toast.success('更新成功');
		setUpdating(false);
		queryClient.invalidateQueries({ queryKey: ['getSectionDetail', id] });
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error('表单校验失败');
	};

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button className='text-xs'>专栏配置</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>专栏配置</SheetTitle>
					<SheetDescription>
						在这里可以配置该专栏的相关信息和权限。
					</SheetDescription>
				</SheetHeader>
				<div className='px-5 flex flex-col gap-5 overflow-auto'>
					<Form {...form}>
						<form
							onSubmit={onSubmitUpdateForm}
							id='update-form'
							className='space-y-5'>
							{section?.cover && <CoverUpdate />}
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>专栏标题</FormLabel>
											<Input {...field} placeholder='请输入专栏的标题' />
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
											<FormLabel>专栏描述</FormLabel>
											<Textarea {...field} placeholder='请输入专栏的描述' />
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
											<AddSectionLabelDialog
												open={showAddLabelDialog}
												onOpenChange={setShowAddLabelDialog}
											/>
											<FormLabel>专栏标签</FormLabel>
											{labels ? (
												<MultipleSelector
													defaultOptions={labels.data.map((label) => {
														return { label: label.name, value: label.id };
													})}
													onChange={(value) => {
														field.onChange(
															value.map(({ label, value }) => value)
														);
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
										<FormItem className='flex flex-row justify-between items-center'>
											<FormLabel>公开专栏</FormLabel>
											<Switch
												checked={field.value}
												onCheckedChange={(e) => {
													field.onChange(e);
												}}
											/>
										</FormItem>
									);
								}}
							/>
						</form>
					</Form>
				</div>
				<SheetFooter>
					<Button type='submit' form='update-form' disabled={updating}>
						保存
						{updating && <Loader2 className='animate-spin' />}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};

export default SectionConfiguration;
