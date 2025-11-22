'use client';

import { Form, FormField, FormItem, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Loader2, SendIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getQueryClient } from '@/lib/get-query-client';
import { z } from 'zod';
import { createSectionComment } from '@/service/section';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const SectionCommentForm = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const commentFormSchema = z.object({
		content: z
			.string()
			.min(1, t('section_comment_content_needed'))
			.max(1000, t('section_comment_content_no_more_than')),
	});

	const queryClient = getQueryClient();
	const [commentSubmitting, setCommentSubmitting] = useState(false);
	const form = useForm({
		resolver: zodResolver(commentFormSchema),
		defaultValues: {
			content: '',
		},
	});

	const mutateAddComment = useMutation({
		mutationFn: () => {
			return createSectionComment({
				section_id: section_id,
				content: form.getValues('content'),
			});
		},
		onMutate(variables) {
			setCommentSubmitting(true);
		},
		onError(error, variables, context) {
			toast.error(t('section_comment_submit_failed'));
			setCommentSubmitting(false);
		},
		onSuccess(data, variables, context) {
			setCommentSubmitting(false);
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey[0] === 'searchSectionComment' &&
						query.queryKey[2] === section_id
					);
				},
			});
			toast.success(t('section_comment_submit_success'));
			form.reset();
		},
	});

	const handleSubmitComment = async (
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
		values: z.infer<typeof commentFormSchema>
	) => {
		await mutateAddComment.mutateAsync();
		form.reset();
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<Form {...form}>
			<form onSubmit={handleSubmitComment}>
				<FormField
					name='content'
					control={form.control}
					render={({ field }) => {
						return (
							<FormItem className='mb-5'>
								<div className='bg-input/50 p-3 rounded-lg'>
									<Textarea
										className='dark:bg-transparent shadow-none p-0 border-none outline-none ring-0 focus-visible:ring-0 mb-2'
										placeholder={t('section_comment_content_placeholder')}
										{...field}
										onKeyDown={(e) => {
											if (e.metaKey && e.key === 'Enter') {
												e.preventDefault(); // 阻止换行
												form.handleSubmit(
													onFormValidateSuccess,
													onFormValidateError
												)();
											}
										}}
									/>
									<div className='flex flex-row items-center justify-between'>
										<Button
											size={'sm'}
											type='submit'
											className='text-xs ml-auto'
											disabled={commentSubmitting}>
											{t('section_comment_submit')}
											<SendIcon />
											{commentSubmitting && (
												<Loader2 className='animate-spin' />
											)}
										</Button>
									</div>
								</div>

								<FormMessage />
							</FormItem>
						);
					}}
				/>
			</form>
		</Form>
	);
};

export default SectionCommentForm;
