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
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const CreatePage = () => {
	const t = useTranslations();

	const formSchema = z.object({
		title: z.string().min(1, { message: t('section_create_title_needed') }),
		description: z
			.string()
			.min(1, { message: t('section_create_description_needed') }),
		cover_id: z.optional(z.number()),
		public: z.boolean(),
		labels: z.array(z.number()),
	});

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
			toast.error(t('section_create_failed'));
			return;
		}
		toast.success(t('section_create_success'));
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
		toast.error(t('form_validate_failed'));
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
												toast.error(t('section_create_cover_upload_failed'));
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
									<FormLabel>{t('section_create_form_title')}</FormLabel>
									<Input
										placeholder={t('section_create_form_title_placeholder')}
										{...field}
									/>
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
									<FormLabel>{t('section_create_form_description')}</FormLabel>
									<Textarea
										placeholder={t(
											'section_create_form_description_placeholder'
										)}
										{...field}
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
									<FormLabel>{t('section_create_form_labels')}</FormLabel>
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
											placeholder={t('section_create_form_labels_placeholder')}
											emptyIndicator={
												<p className='text-center text-sm leading-10 text-gray-600 dark:text-gray-400'>
													{t('section_create_form_labels_empty')}
												</p>
											}
										/>
									) : (
										<Skeleton className='h-10' />
									)}
									<div className='text-muted-foreground text-xs flex flex-row gap-0 items-center'>
										<span>{t('section_create_form_labels_empty_tips')}</span>
										<Button
											type='button'
											className='text-xs text-muted-foreground px-0 py-0 h-fit'
											variant={'link'}
											onClick={() => setShowAddLabelDialog(true)}>
											{t('section_create_form_label_create')}
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
											{t('section_create_form_public')}
										</FormLabel>
										<Switch
											checked={field.value}
											onCheckedChange={(e) => {
												field.onChange(e);
											}}
										/>
									</div>
									<FormDescription>
										{t('section_create_form_public_description')}
									</FormDescription>
								</FormItem>
							);
						}}
					/>
					<Button className='w-full' type='submit'>
						{t('section_create_form_submit')}
					</Button>
				</form>
			</Form>
		</div>
	);
};

export default CreatePage;
