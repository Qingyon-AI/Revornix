import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PencilIcon } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
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
import MultipleSelector, { Option } from '../ui/multiple-selector';
import { Skeleton } from '../ui/skeleton';
import AddSectionLabelDialog from './add-section-label-dialog';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const SectionOperateConfiguration = ({
	section_id,
	className,
}: {
	section_id: number;
	className?: string;
}) => {
	const t = useTranslations();

	const updateFormSchema = z.object({
		section_id: z.number().int(),
		cover: z.string().optional(),
		title: z.string().min(1),
		description: z.string().min(1),
		public: z.boolean(),
		labels: z.array(z.number()),
	});
	const id = section_id;

	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);

	const { data: labels } = useQuery({
		queryKey: ['getSectionLabels'],
		queryFn: getMineLabels,
	});

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	const form = useForm({
		defaultValues: {
			section_id: id,
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
		form.setValue('cover', section?.cover || undefined);
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
				cover: values.cover,
			})
		);
		if (err) {
			toast.error(t('section_update_failed'));
			setUpdating(false);
			return;
		}
		toast.success(t('section_update_success'));
		setUpdating(false);
		queryClient.invalidateQueries({ queryKey: ['getSectionDetail', id] });
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button className={cn('text-xs', className)} variant={'ghost'}>
					<PencilIcon />
					{t('section_configuration_title')}
				</Button>
			</SheetTrigger>
			<SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<SheetHeader>
					<SheetTitle>{t('section_configuration_title')}</SheetTitle>
					<SheetDescription>
						{t('section_configuration_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='px-5 flex flex-col gap-5 overflow-auto flex-1'>
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
											<FormLabel>
												{t('section_configuration_form_title')}
											</FormLabel>
											<Input
												{...field}
												placeholder={t(
													'section_configuration_form_title_placeholder'
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
												{t('section_configuration_form_description')}
											</FormLabel>
											<Textarea
												{...field}
												placeholder={t(
													'section_configuration_form_description_placeholder'
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
											<AddSectionLabelDialog
												open={showAddLabelDialog}
												onOpenChange={setShowAddLabelDialog}
											/>
											<FormLabel>
												{t('section_configuration_form_labels')}
											</FormLabel>
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
													placeholder={t(
														'section_configuration_form_labels_placeholder'
													)}
													emptyIndicator={
														<p className='text-center text-sm leading-10 text-gray-600 dark:text-gray-400'>
															{t('section_configuration_form_labels_empty')}
														</p>
													}
												/>
											) : (
												<Skeleton className='h-10' />
											)}
											<div className='text-muted-foreground text-xs flex flex-row gap-0 items-center'>
												<span>
													{t('section_configuration_form_labels_empty_tips')}
												</span>
												<Button
													type='button'
													className='text-xs text-muted-foreground px-0 py-0 h-fit'
													variant={'link'}
													onClick={() => setShowAddLabelDialog(true)}>
													{t('section_configuration_form_label_create')}
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
										<FormItem className='flex flex-row justify-between items-center border rounded p-5 dark:bg-input/30'>
											<FormLabel>
												{t('section_configuration_formpublic')}
											</FormLabel>
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
						{t('section_configuration_form_submit')}
						{updating && <Loader2 className='animate-spin' />}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateConfiguration;
