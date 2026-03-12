import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { utils } from '@kinda/utils';
import z from 'zod';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import type { DocumentDetailResponse } from '@/generated';
import { getQueryClient } from '@/lib/get-query-client';
import { cn, diffValues } from '@/lib/utils';
import { createLabel, getDocumentDetail, getLabels, updateDocument } from '@/service/document';
import { getAllMineSections } from '@/service/section';
import { useUserContext } from '@/provider/user-provider';

import AddDocumentLabelDialog from './add-document-label-dialog';
import DocumentCoverUpdate from './document-cover-update';
import MultipleSelector from '../ui/multiple-selector';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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

const updateFormSchema = z.object({
	document_id: z.number().int(),
	cover: z.string().nullable().optional(),
	title: z.string().min(1),
	description: z.string().min(1),
	labels: z.array(z.number()),
	sections: z.array(z.number()),
});

type UpdateFormValues = z.infer<typeof updateFormSchema>;

const formBlockClassName =
	'space-y-3 rounded-2xl border border-border/60 bg-background/35 p-4';

const normalizeDocumentFormValues = (
	values: Partial<UpdateFormValues>,
): UpdateFormValues => {
	return {
		document_id: values.document_id ?? 0,
		cover: values.cover || null,
		title: values.title || '',
		description: values.description || '',
		labels: values.labels || [],
		sections: values.sections || [],
	};
};

const buildDocumentFormValues = (
	document_id: number,
	document?: DocumentDetailResponse,
): UpdateFormValues => {
	return normalizeDocumentFormValues({
		document_id,
		cover: document?.cover ?? null,
		title: document?.title,
		description: document?.description ?? '',
		labels: document?.labels?.map((label) => label.id),
		sections: document?.sections?.map((section) => section.id),
	});
};

const DocumentConfiguration = ({
	document_id,
	className,
}: {
	document_id: number;
	className?: string;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const id = document_id;

	const initialValuesRef = useRef<UpdateFormValues | null>(null);
	const [open, setOpen] = useState(false);
	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);
	const [updating, setUpdating] = useState(false);

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

	const form = useForm<UpdateFormValues>({
		defaultValues: buildDocumentFormValues(id),
		resolver: zodResolver(updateFormSchema),
	});

	const documentInitialValues = useMemo(() => {
		if (!document) {
			return null;
		}
		return buildDocumentFormValues(id, document);
	}, [document, id]);

	useEffect(() => {
		if (!open || !documentInitialValues) {
			return;
		}
		if (form.formState.isDirty && initialValuesRef.current) {
			return;
		}

		form.reset(documentInitialValues);
		initialValuesRef.current = documentInitialValues;
	}, [documentInitialValues, form, form.formState.isDirty, open]);

	const queryClient = getQueryClient();

	const onSubmitUpdateForm = async (
		event: React.FormEvent<HTMLFormElement>,
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

	const onFormValidateSuccess = async (values: UpdateFormValues) => {
		if (!initialValuesRef.current) return;

		const normalizedValues = normalizeDocumentFormValues({
			...values,
			document_id: id,
		});
		const patch = diffValues(normalizedValues, initialValuesRef.current);

		if (Object.keys(patch).length === 0) {
			toast.info(t('form_no_change'));
			return;
		}

		setUpdating(true);

		const [, err] = await utils.to(
			updateDocument({
				document_id: id,
				...patch,
			}),
		);

		if (err) {
			toast.error(t('document_update_failed'));
			setUpdating(false);
			return;
		}

		form.reset(normalizedValues);
		initialValuesRef.current = normalizedValues;
		toast.success(t('document_update_success'));
		setUpdating(false);
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
			exact: true,
		});

		const documentListQueryKeys = [
			'searchMyDocument',
			'searchMyStarDocument',
			'searchUserUnreadDocument',
			'searchUserRecentReadDocument',
		] as const;

		documentListQueryKeys.forEach((queryKey) => {
			queryClient.invalidateQueries({
				queryKey: [queryKey, mainUserInfo?.id],
			});
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const mutateCreateDocumentLabel = useMutation({
		mutationKey: ['createDocumentLabel'],
		mutationFn: createLabel,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['getDocumentLabels'],
			});
		},
	});

	return (
		<Sheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (nextOpen && documentInitialValues) {
					form.reset(documentInitialValues);
					initialValuesRef.current = documentInitialValues;
				}
				setOpen(nextOpen);
			}}>
			<SheetTrigger asChild>
				<Button className={cn('flex-1 text-xs', className)} variant={'ghost'}>
					<Pencil />
				</Button>
			</SheetTrigger>
			<SheetContent className='flex h-full flex-col gap-0 overflow-hidden bg-card/95 pt-0 sm:max-w-xl'>
				<SheetHeader className='border-b border-border/60 px-5 pt-6 pb-3 pr-12 text-left'>
					<SheetTitle className='text-xl'>
						{t('document_configuration_title')}
					</SheetTitle>
					<SheetDescription className='max-w-md text-sm leading-6'>
						{t('document_configuration_description')}
					</SheetDescription>
				</SheetHeader>

				<div className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5'>
					<Form {...form}>
						<form
							onSubmit={onSubmitUpdateForm}
							id='update-form'
							className='space-y-4'>
							<DocumentCoverUpdate ownerId={document?.creator.id} />

							<FormField
								name='title'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className={formBlockClassName}>
											<FormLabel>
												{t('document_configuration_form_title')}
											</FormLabel>
											<Input
												className='bg-background/60'
												{...field}
												placeholder={t(
													'document_configuration_form_title_placeholder',
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
										<FormItem className={formBlockClassName}>
											<FormLabel>
												{t('document_configuration_form_description')}
											</FormLabel>
											<Textarea
												className='min-h-28 bg-background/60'
												{...field}
												placeholder={t(
													'document_configuration_form_description_placeholder',
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
										<FormItem className={formBlockClassName}>
											<AddDocumentLabelDialog
												open={showAddLabelDialog}
												onOpenChange={setShowAddLabelDialog}
											/>
											<FormLabel>
												{t('document_configuration_form_labels')}
											</FormLabel>
											{labels ? (
												<MultipleSelector
													onCreate={async ({ label }) => {
														await mutateCreateDocumentLabel.mutateAsync({
															name: label,
														});
													}}
													options={labels.data.map((label) => {
														return {
															label: label.name,
															value: label.id.toString(),
														};
													})}
													onChange={(value) => {
														field.onChange(
															value.map(({ value }) => Number(value)),
														);
													}}
													value={field.value.map((item) => item.toString())}
													placeholder={t(
														'document_configuration_form_labels_placeholder',
													)}
												/>
											) : (
												<Skeleton className='h-10' />
											)}
											<div className='flex flex-row items-center gap-0 text-xs text-muted-foreground'>
												<span>
													{t('document_configuration_form_labels_empty_tips')}
												</span>
												<Button
													type='button'
													className='h-fit px-0 py-0 text-xs text-muted-foreground'
													variant={'link'}
													onClick={() => setShowAddLabelDialog(true)}>
													{t('document_configuration_form_label_create')}
												</Button>
											</div>
											<FormMessage />
										</FormItem>
									);
								}}
							/>

							<FormField
								control={form.control}
								name='sections'
								render={({ field }) => {
									return (
										<FormItem className={formBlockClassName}>
											<FormLabel>
												{t('document_configuration_form_sections')}
											</FormLabel>
											{sections ? (
												<MultipleSelector
													options={sections.data.map((section) => {
														return {
															label: section.title,
															value: section.id.toString(),
														};
													})}
													onChange={(value) => {
														field.onChange(
															value.map(({ value }) => Number(value)),
														);
													}}
													value={field.value.map((item) => item.toString())}
													placeholder={t(
														'document_configuration_form_sections_placeholder',
													)}
												/>
											) : (
												<Skeleton className='h-10' />
											)}
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						</form>
					</Form>
				</div>

				<SheetFooter className='shrink-0 border-t border-border/60 bg-card/95 px-4 pb-4 pt-3 backdrop-blur sm:px-5 sm:pb-5'>
					<Button
						type='submit'
						form='update-form'
						disabled={updating}
						className='w-full rounded-2xl'>
						{t('document_configuration_form_submit')}
						{updating && <Loader2 className='animate-spin' />}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};

export default DocumentConfiguration;
