// import { useForm, useFormContext } from 'react-hook-form';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
// import { Form, FormField, FormItem, FormMessage } from '../ui/form';
// import { Input } from '../ui/input';
// import { Textarea } from '../ui/textarea';
// import MultipleSelector, { Option } from '../ui/multiple-selector';
// import { Button } from '../ui/button';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useEffect, useState } from 'react';
// import { z } from 'zod';
// import { addSection, getLabels } from '@/service/section';
// import { toast } from 'sonner';
// import { Loader2 } from 'lucide-react';

// const formSchema = z.object({
// 	title: z.string().min(1, { message: '专栏名称不能为空' }),
// 	description: z.string().min(1, { message: '专栏描述不能为空' }),
// 	labels: z.array(z.number()),
// 	documents: z.array(z.number()),
// });

// interface Label {
// 	id: number;
// 	name: string;
// }

// interface User {
// 	id: number;
// 	nickname: string;
// }

// interface Section {
// 	id: number;
// 	title: string;
// 	cover: string;
// 	description: string;
// 	fork_num: number;
// 	comment_num: number;
// 	update_time: string;
// 	labels: Label[];
// 	users: User[];
// }

const SectionAddDialog = ({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) => {
	// const [labels, setLabels] = useState<Label[]>([]);
	// const [formSubmitting, setFormSubmitting] = useState(false);
	// const form = useForm({
	// 	resolver: zodResolver(formSchema),
	// 	defaultValues: {
	// 		title: '',
	// 		description: '',
	// 		labels: [],
	// 		documents: [],
	// 	},
	// });

	// const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
	// 	// this part is for stopping parent forms to trigger their submit
	// 	if (event) {
	// 		// sometimes not true, e.g. React Native
	// 		if (typeof event.preventDefault === 'function') {
	// 			event.preventDefault();
	// 		}
	// 		if (typeof event.stopPropagation === 'function') {
	// 			// prevent any outer forms from receiving the event too
	// 			event.stopPropagation();
	// 		}
	// 	}

	// 	return form.handleSubmit(onFormValidateSuccess, onFormValidateError)(event);
	// };

	// const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
	// 	setFormSubmitting(true);
	// 	const [res, err] = await addSection(
	// 		values.title,
	// 		values.description,
	// 		values.labels,
	// 		values.documents
	// 	);
	// 	if (err) {
	// 		toast.error(err.message);
	// 		setFormSubmitting(false);
	// 		return;
	// 	}
	// 	setFormSubmitting(false);
	// 	onOpenChange(false);
	// };

	// const onFormValidateError = (errors: any) => {
	// 	console.error(errors);
	// 	toast.error('表单校验失败');
	// };

	// const getLabelByValue = (value: number): Option | undefined => {
	// 	return labels
	// 		.map((label) => {
	// 			return { label: label.name, value: label.id };
	// 		})
	// 		.find((label) => label.value === value);
	// };

	// const onGetLabels = async () => {
	// 	const [res, err] = await getLabels();
	// 	if (err) {
	// 		toast.error(err.message);
	// 		return;
	// 	}
	// 	setLabels(res.labels);
	// };

	// useEffect(() => {
	// 	onGetLabels();
	// }, []);

	return (
		<>
			{/* <Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>增加专栏</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={handleSubmit}>
							<div className='grid w-full gap-5'>
								<FormField
									name='title'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem>
												<Input placeholder='专栏名称' {...field} />
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
												<Textarea placeholder='描述一下专栏吧' {...field} />
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
											<FormItem>
												<MultipleSelector
													creatable
													defaultOptions={labels.map((label) => {
														return { label: label.name, value: label.id };
													})}
													onChange={(value) => {
														field.onChange(
															value.map(({ label, value }) => value)
														);
													}}
													value={field.value
														.map((id) => getLabelByValue(id))
														.filter((option) => !!option)}
													placeholder='请选择标签'
													emptyIndicator={
														<p className='text-center text-lg leading-10 text-gray-600 dark:text-gray-400'>
															no results found.
														</p>
													}
												/>
											</FormItem>
										);
									}}
								/>
								<Button type='submit' disabled={formSubmitting}>
									保存
									{formSubmitting && (
										<Loader2 className='size-4 animate-spin' />
									)}
								</Button>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog> */}
		</>
	);
};

export default SectionAddDialog;
