'use client';

import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocument, createLabel, getLabels } from '@/service/document';
import { useState } from 'react';
import { Info, Loader2, OctagonAlert, Sparkles } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import AddLabelDialog from '@/components/document/add-document-label-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '../ui/switch';
import { useRouter } from 'nextjs-toploader/app';
import { getAllMineSections } from '@/service/section';
import { Textarea } from '../ui/textarea';
import { useTranslations } from 'next-intl';
import { useUserContext } from '@/provider/user-provider';
import { Alert, AlertDescription } from '../ui/alert';
import { useSearchParams } from 'next/navigation';
import MultipleSelector from '../ui/multiple-selector';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip } from '../ui/tooltip';
import { TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';

const AddQuickNote = () => {
	const searchParams = useSearchParams();
	const queryClient = getQueryClient();
	const sectionId = searchParams.get('section_id');
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const formSchema = z.object({
		category: z.number(),
		content: z.string(),
		title: z.optional(
			z.string().min(1, { message: t('document_create_title_needed') })
		),
		description: z.optional(
			z.string().min(1, { message: t('document_create_description_needed') })
		),
		from_plat: z.string(),
		labels: z.optional(z.array(z.number())),
		sections: z.array(z.number()),
		auto_summary: z.boolean(),
		auto_podcast: z.boolean(),
		auto_tag: z.boolean(),
	});
	const router = useRouter();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			content: '',
			category: 2,
			auto_summary: false,
			from_plat: 'revornix-web',
			labels: [],
			sections: sectionId ? [Number(sectionId)] : [],
			auto_podcast: false,
			auto_tag: false,
		},
	});
	const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);

	const { data: labels } = useQuery({
		queryKey: ['getDocumentLabels'],
		queryFn: getLabels,
	});

	const { data: sections } = useQuery({
		queryKey: ['getMineDocumentSections'],
		queryFn: getAllMineSections,
	});

	const mutateCreateDocument = useMutation({
		mutationKey: ['createDocument', 'quick-note'],
		mutationFn: createDocument,
		onSuccess: (data) => {
			toast.success(t('document_create_success'));
			router.push(`/document/detail/${data.document_id}`);
		},
		onError: (error) => {
			toast.error(t('document_create_failed'));
			console.error(error);
		},
	});

	const onSubmitMessageForm = async (
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

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateCreateDocument.mutate(values);
	};

	const onFormValidateError = (errors: any) => {
		toast.error(t('form_validate_failed'));
		console.error(errors);
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
		<>
			<AddLabelDialog
				open={showAddLabelDialog}
				onOpenChange={setShowAddLabelDialog}
			/>
			<Form {...form}>
				<form onSubmit={onSubmitMessageForm} className='flex flex-col h-full'>
					<div className='flex flex-col w-full gap-5 flex-1 mb-5'>
						<FormField
							control={form.control}
							name='content'
							render={({ field }) => {
								return (
									<FormItem className='w-full flex flex-col'>
										<Textarea
											{...field}
											placeholder={t('document_create_note_placeholded')}
											className='min-h-52'
										/>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<div className='flex md:flex-row md:items-center flex-col gap-5 w-full'>
							{labels ? (
								<FormField
									control={form.control}
									name='labels'
									render={({ field }) => {
										return (
											<FormItem className='gap-0 flex-1'>
												<MultipleSelector
													onCreate={async ({ label }) => {
														await mutateCreateDocumentLabel.mutateAsync({
															name: label,
														});
													}}
													options={labels.data.map((label) => ({
														label: label.name,
														value: label.id.toString(),
													}))}
													onChange={(value) => {
														field.onChange(
															value.map(({ label, value }) => Number(value))
														);
													}}
													value={
														field.value
															? field.value.map((item) => item.toString())
															: []
													}
													placeholder={t('document_create_label_placeholder')}
												/>
											</FormItem>
										);
									}}
								/>
							) : (
								<Skeleton className='h-10' />
							)}
							<FormField
								name='auto_tag'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className='p-2 rounded-md border border-input flex flex-row items-center relative'>
											<FormLabel htmlFor='auto_tag'>
												{t('document_create_auto_tag')}
												<Tooltip>
													<TooltipTrigger>
														<Info size={15} />
													</TooltipTrigger>
													<TooltipContent>
														{t('document_create_auto_tag_description')}
													</TooltipContent>
												</Tooltip>
											</FormLabel>
											<Switch
												id='auto_tag'
												className='ml-auto'
												disabled={
													!mainUserInfo?.default_document_reader_model_id
												}
												checked={field.value}
												onCheckedChange={(e) => {
													field.onChange(e);
												}}
											/>
											{!mainUserInfo?.default_document_reader_model_id && (
												<Tooltip>
													<TooltipTrigger>
														<OctagonAlert className='h-4 w-4 text-destructive!' />
													</TooltipTrigger>
													<TooltipContent>
														{t('document_create_auto_tag_engine_unset')}
													</TooltipContent>
												</Tooltip>
											)}
										</FormItem>
									);
								}}
							/>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
							<FormField
								name='auto_summary'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className='rounded-lg border border-input p-3'>
											<div className='flex flex-row gap-1 items-center'>
												<FormLabel className='flex flex-row gap-1 items-center'>
													{t('document_create_ai_summary')}
													<Sparkles size={15} />
												</FormLabel>
												<Switch
													disabled={
														!mainUserInfo?.default_document_reader_model_id
													}
													checked={field.value}
													onCheckedChange={(e) => {
														field.onChange(e);
													}}
												/>
											</div>
											<FormDescription>
												{t('document_create_ai_summary_description')}
											</FormDescription>
											{!mainUserInfo?.default_document_reader_model_id && (
												<Alert className='bg-destructive/10 dark:bg-destructive/20'>
													<OctagonAlert className='h-4 w-4 text-destructive!' />
													<AlertDescription>
														{t('document_create_ai_summary_engine_unset')}
													</AlertDescription>
												</Alert>
											)}
										</FormItem>
									);
								}}
							/>
							<FormField
								name='auto_podcast'
								control={form.control}
								render={({ field }) => {
									return (
										<FormItem className='rounded-lg border border-input p-3'>
											<div className='flex flex-row gap-1 items-center'>
												<FormLabel className='flex flex-row gap-1 items-center'>
													{t('document_create_auto_podcast')}
													<Sparkles size={15} />
												</FormLabel>
												<Switch
													disabled={
														!mainUserInfo?.default_podcast_user_engine_id
													}
													checked={field.value}
													onCheckedChange={(e) => {
														field.onChange(e);
													}}
												/>
											</div>
											<FormDescription>
												{t('document_create_auto_podcast_description')}
											</FormDescription>
											{!mainUserInfo?.default_podcast_user_engine_id && (
												<Alert className='bg-destructive/10 dark:bg-destructive/20'>
													<OctagonAlert className='h-4 w-4 text-destructive!' />
													<AlertDescription>
														{t('document_create_auto_podcast_engine_unset')}
													</AlertDescription>
												</Alert>
											)}
										</FormItem>
									);
								}}
							/>
						</div>
						{sections ? (
							<FormField
								control={form.control}
								name='sections'
								render={({ field }) => {
									return (
										<FormItem className='space-y-0'>
											<MultipleSelector
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
													field.value
														? field.value.map((item) => item.toString())
														: []
												}
												placeholder={t('document_create_section_choose')}
											/>
										</FormItem>
									);
								}}
							/>
						) : (
							<Skeleton className='h-10' />
						)}
					</div>
					<Button
						type='submit'
						className='w-full'
						disabled={mutateCreateDocument.isPending || !form.watch('content')}>
						{t('document_create_submit')}
						{mutateCreateDocument.isPending && (
							<Loader2 className='size-4 animate-spin' />
						)}
					</Button>
				</form>
			</Form>
		</>
	);
};

export default AddQuickNote;
