'use client';

import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocument, createLabel, getLabels } from '@/service/document';
import { useState } from 'react';
import {
	AlertCircleIcon,
	Info,
	Loader2,
	OctagonAlert,
	Sparkles,
} from 'lucide-react';
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
import MultipleSelector from '@/components/ui/multiple-selector';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '../ui/switch';
import { useRouter } from 'nextjs-toploader/app';
import { getAllMineSections } from '@/service/section';
import AddDocumentLabelDialog from '@/components/document/add-document-label-dialog';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUserContext } from '@/provider/user-provider';
import Link from 'next/link';
import { settingAnchorHrefs } from '@/lib/setting-navigation';
import { useSearchParams } from 'next/navigation';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { invalidateDocumentListQueries } from '@/lib/document-cache';
import SelectorSkeleton from './selector-skeleton';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';

const AddLink = () => {
	const queryClient = getQueryClient();
	const searchParams = useSearchParams();
	const sectionId = searchParams.get('section_id');
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { documentReaderModel, websiteParseEngine, podcastEngine } =
		useDefaultResourceAccess();
	const formSchema = z.object({
		category: z.number(),
		url: z.string().url(),
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
			url: '',
			category: 1,
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
		mutationKey: ['createDocument', 'link'],
		mutationFn: createDocument,
		onSuccess: (data) => {
			void invalidateDocumentListQueries(queryClient, mainUserInfo?.id);
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

	const documentReaderUnavailable =
		documentReaderModel.loading ||
		!documentReaderModel.configured ||
		documentReaderModel.subscriptionLocked;
	const websiteParseEngineUnavailable =
		websiteParseEngine.loading ||
		!websiteParseEngine.configured ||
		websiteParseEngine.subscriptionLocked;
	const podcastEngineUnavailable =
		podcastEngine.loading ||
		!podcastEngine.configured ||
		podcastEngine.subscriptionLocked;

	return (
		<>
			<AddDocumentLabelDialog
				open={showAddLabelDialog}
				onOpenChange={setShowAddLabelDialog}
			/>

			<Form {...form}>
				<form onSubmit={onSubmitMessageForm} className='flex h-full min-h-0 flex-col overflow-hidden'>
					<div className='flex w-full min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1'>
						{!websiteParseEngine.configured && (
							<Alert>
								<AlertCircleIcon />
								<AlertTitle>
									{t('document_create_link_engine_unset')}
								</AlertTitle>
								<AlertDescription>
									<p>
										{t('document_create_link_engine_unset_description_1')}
										<Link
											href={settingAnchorHrefs.defaultWebsiteParseEngine}
											className='inline-block underline underline-offset-2 font-bold'>
											{t('document_create_link_engine_unset_description_2')}
										</Link>
										{t('document_create_link_engine_unset_description_3')}
									</p>
								</AlertDescription>
							</Alert>
						)}
						{websiteParseEngine.subscriptionLocked && (
							<Alert>
								<AlertCircleIcon />
								<AlertTitle>{t('default_resource_unavailable_title')}</AlertTitle>
								<AlertDescription>
									<p>
										{t('default_resource_subscription_locked')}{' '}
										<Link
											href={settingAnchorHrefs.defaultWebsiteParseEngine}
											className='inline-block font-bold underline underline-offset-2'>
											{t('revornix_ai_default_model_goto')}
										</Link>
									</p>
								</AlertDescription>
							</Alert>
						)}
						<FormField
							name='url'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<Textarea
											placeholder={t('document_create_link_placeholder')}
											{...field}
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
													options={labels.data.map((label) => {
														return {
															label: label.name,
															value: label.id.toString(),
														};
													})}
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
								<SelectorSkeleton />
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
												disabled={documentReaderUnavailable && !field.value}
												checked={field.value}
												onCheckedChange={(e) => {
													field.onChange(e);
												}}
											/>
											{documentReaderUnavailable && (
												<Tooltip>
													<TooltipTrigger>
														<OctagonAlert className='h-4 w-4 text-destructive!' />
													</TooltipTrigger>
													<TooltipContent>
														{documentReaderModel.subscriptionLocked
															? t('default_resource_subscription_locked')
															: t('document_create_auto_tag_engine_unset')}
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
													disabled={documentReaderUnavailable && !field.value}
													checked={field.value}
													onCheckedChange={(e) => {
														field.onChange(e);
													}}
												/>
											</div>
											<FormDescription>
												{t('document_create_ai_summary_description')}
											</FormDescription>
											{documentReaderUnavailable && (
												<Alert className='bg-destructive/10 dark:bg-destructive/20'>
													<OctagonAlert className='h-4 w-4 text-destructive!' />
													<AlertDescription>
														{documentReaderModel.subscriptionLocked
															? t('default_resource_subscription_locked')
															: t('document_create_ai_summary_engine_unset')}
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
													disabled={podcastEngineUnavailable && !field.value}
													checked={field.value}
													onCheckedChange={(e) => {
														field.onChange(e);
													}}
												/>
											</div>
											<FormDescription>
												{t('document_create_auto_podcast_description')}
											</FormDescription>
											{podcastEngineUnavailable && (
												<Alert className='bg-destructive/10 dark:bg-destructive/20'>
													<OctagonAlert className='h-4 w-4 text-destructive!' />
													<AlertDescription>
														{podcastEngine.subscriptionLocked
															? t('default_resource_subscription_locked')
															: t('document_create_auto_podcast_engine_unset')}
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
														value.map(({ label, value }) => Number(value))
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
							<SelectorSkeleton />
						)}
					</div>
					<Button
						type='submit'
						className='mt-5 w-full shrink-0'
						disabled={
							mutateCreateDocument.isPending ||
							websiteParseEngineUnavailable ||
							(form.watch('auto_tag') && documentReaderUnavailable) ||
							(form.watch('auto_summary') && documentReaderUnavailable) ||
							(form.watch('auto_podcast') && podcastEngineUnavailable) ||
							!form.watch('url')
						}>
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

export default AddLink;
