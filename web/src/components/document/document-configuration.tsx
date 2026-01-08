import { useTranslations } from 'next-intl';
import z from 'zod';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { utils } from '@kinda/utils';
import {
	getLabels,
	getDocumentDetail,
	updateDocument,
} from '@/service/document';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import MultipleSelector from '../ui/multiple-selector';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import AddDocumentLabelDialog from './add-document-label-dialog';
import { getAllMineSections } from '@/service/section';

const DocumentConfiguration = ({
	document_id,
	className,
}: {
	document_id: number;
	className?: string;
}) => {
	const t = useTranslations();

	const updateFormSchema = z.object({
		document_id: z.number().int(),
		cover: z.string().optional(),
		title: z.string().min(1),
		description: z.string().min(1),
		labels: z.array(z.number()),
		sections: z.array(z.number()),
	});
	const id = document_id;

	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);

	const { data: labels } = useQuery({
		queryKey: ['getDocumentLabels'],
		queryFn: getLabels,
	});

	const { data: sections } = useQuery({
		queryKey: ['getMineDocumentSections'],
		queryFn: getAllMineSections,
	});

	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: async () => {
			return getDocumentDetail({ document_id: id });
		},
	});

	const form = useForm({
		defaultValues: {
			document_id: id,
			title: '',
			cover: undefined,
			description: '',
			labels: [],
			sections: [],
		},
		resolver: zodResolver(updateFormSchema),
	});

	const getLabelByValue = (value: number): Option | undefined => {
		if (!labels) return;
		return labels.data
			.map((label) => {
				return { label: label.name, value: label.id };
			})
			.find((label) => label.value === value);
	};

	const getSectionByValue = (value: number): Option | undefined => {
		if (!sections) return;
		return sections.data
			.map((section) => {
				return { label: section.title, value: section.id };
			})
			.find((section) => section.value === value);
	};

	const [updating, setUpdating] = useState<boolean>(false);

	const queryClient = getQueryClient();

	useEffect(() => {
		form.setValue('title', document?.title || '');
		form.setValue('description', document?.description || '');
		form.setValue('cover', document?.cover || undefined);
		form.setValue('labels', document?.labels?.map((label) => label.id) || []);
		form.setValue(
			'sections',
			document?.sections?.map((section) => section.id) || []
		);
	}, [document]);

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
			updateDocument({
				...values,
				cover: values.cover,
			})
		);
		if (err) {
			toast.error(t('document_update_failed'));
			setUpdating(false);
			return;
		}
		toast.success(t('document_update_success'));
		setUpdating(false);
		queryClient.invalidateQueries({ queryKey: ['getDocumentetail', id] });
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button className={cn('text-xs flex-1', className)} variant={'ghost'}>
					<Pencil />
				</Button>
			</SheetTrigger>
			<SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<SheetHeader>
					<SheetTitle>{t('document_configuration_title')}</SheetTitle>
					<SheetDescription>
						{t('document_configuration_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='px-5 flex flex-col gap-5 overflow-auto flex-1'>
					<Form {...form}>
						<form
							onSubmit={onSubmitUpdateForm}
							id='update-form'
							className='space-y-5'>
							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>
												{t('document_configuration_form_title')}
											</FormLabel>
											<Input
												{...field}
												placeholder={t(
													'document_configuration_form_title_placeholder'
												)}
											/>
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
											<FormLabel>
												{t('document_configuration_form_description')}
											</FormLabel>
											<Textarea
												{...field}
												placeholder={t(
													'document_configuration_form_description_placeholder'
												)}
											/>
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
											<AddDocumentLabelDialog
												open={showAddLabelDialog}
												onOpenChange={setShowAddLabelDialog}
											/>
											<FormLabel>
												{t('document_configuration_form_labels')}
											</FormLabel>
											{labels ? (
												<MultipleSelector
													options={labels.data.map((label) => {
														return {
															label: label.name,
															value: label.id.toString(),
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
															.map((id) => getLabelByValue(id))
															.filter((option) => !!option)
													}
													placeholder={t(
														'document_configuration_form_labels_placeholder'
													)}
												/>
											) : (
												<Skeleton className='h-10' />
											)}
											<div className='text-muted-foreground text-xs flex flex-row gap-0 items-center'>
												<span>
													{t('document_configuration_form_labels_empty_tips')}
												</span>
												<Button
													type='button'
													className='text-xs text-muted-foreground px-0 py-0 h-fit'
													variant={'link'}
													onClick={() => setShowAddLabelDialog(true)}>
													{t('document_configuration_form_label_create')}
												</Button>
											</div>
										</FormItem>
									);
								}}
							/>
							{sections ? (
								<FormField
									control={form.control}
									name='sections'
									render={({ field }) => {
										return (
											<FormItem className='space-y-0'>
												<FormLabel>
													{t('document_configuration_form_sections')}
												</FormLabel>
												{sections ? (
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
														placeholder={t(
															'document_configuration_form_sections_placeholder'
														)}
														emptyIndicator={
															<p className='text-center text-sm leading-10 text-gray-600 dark:text-gray-400'>
																{t(
																	'document_configuration_form_sections_empty'
																)}
															</p>
														}
													/>
												) : (
													<Skeleton className='h-10' />
												)}
											</FormItem>
										);
									}}
								/>
							) : (
								<Skeleton className='h-10' />
							)}
						</form>
					</Form>
				</div>
				<SheetFooter>
					<Button type='submit' form='update-form' disabled={updating}>
						{t('document_configuration_form_submit')}
						{updating && <Loader2 className='animate-spin' />}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};

export default DocumentConfiguration;
