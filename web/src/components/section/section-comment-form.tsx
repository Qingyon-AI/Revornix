'use client';

import { Form, FormField, FormItem, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { CornerDownLeft, Loader2, SendIcon, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getQueryClient } from '@/lib/get-query-client';
import { z } from 'zod';
import { createSectionComment } from '@/service/section';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type SectionCommentFormProps = {
	section_id: number;
	parent_id?: number;
	rootIdForInvalidation?: number;
	placeholder?: string;
	autoFocus?: boolean;
	compact?: boolean;
	onCancel?: () => void;
	onSuccess?: () => void;
};

const SectionCommentForm = ({
	section_id,
	parent_id,
	rootIdForInvalidation,
	placeholder,
	autoFocus,
	compact = false,
	onCancel,
	onSuccess,
}: SectionCommentFormProps) => {
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
				parent_id: parent_id,
			});
		},
		onMutate() {
			setCommentSubmitting(true);
		},
		onError() {
			toast.error(t('section_comment_submit_failed'));
			setCommentSubmitting(false);
		},
		onSuccess() {
			setCommentSubmitting(false);
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey[0] === 'searchSectionComment' &&
						query.queryKey[3] === section_id
					);
				},
			});
			if (rootIdForInvalidation !== undefined) {
				queryClient.invalidateQueries({
					predicate(query) {
						return (
							query.queryKey[0] === 'searchSectionCommentReplies' &&
							query.queryKey[1] === rootIdForInvalidation
						);
					},
				});
			}
			toast.success(t('section_comment_submit_success'));
			form.reset();
			onSuccess?.();
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

	const onFormValidateSuccess = async () => {
		await mutateAddComment.mutateAsync();
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<Form {...form}>
			<form onSubmit={handleSubmitComment} className='shrink-0'>
				<FormField
					name='content'
					control={form.control}
					render={({ field }) => {
						return (
							<FormItem>
								<div
									className={cn(
										'rounded-3xl border border-border/70 bg-card/80 backdrop-blur-sm',
										compact ? 'p-2' : 'p-3'
									)}>
									<Textarea
										rows={compact ? 2 : 3}
										autoFocus={autoFocus}
										className={cn(
											'resize-none rounded-none border-none bg-transparent px-1 py-1.5 text-sm leading-6 shadow-none outline-none ring-0 placeholder:text-muted-foreground/80 focus-visible:ring-0 dark:bg-transparent',
											compact ? 'min-h-[56px] max-h-32 overflow-y-auto' : 'min-h-[88px] max-h-44 overflow-y-auto'
										)}
										placeholder={placeholder ?? t('section_comment_content_placeholder')}
										{...field}
										onKeyDown={(e) => {
											if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
												e.preventDefault();
												form.handleSubmit(
													onFormValidateSuccess,
													onFormValidateError
												)();
											}
										}}
									/>
									<div className='mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-2'>
										<div className='flex items-center gap-2 text-xs text-muted-foreground'>
											<div className='flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background/70'>
												<CornerDownLeft className='size-3.5' />
											</div>
											<span>{t('section_comment_submit_shortcut')}</span>
										</div>
										<div className='ml-auto flex items-center gap-2'>
											{onCancel && (
												<Button
													type='button'
													size='sm'
													variant='ghost'
													className='rounded-2xl px-3 text-xs'
													onClick={onCancel}>
													<X className='size-3.5' />
													{t('cancel')}
												</Button>
											)}
											<Button
												size={'sm'}
												type='submit'
												className='rounded-2xl px-4 text-xs'
												disabled={commentSubmitting}>
												{t('section_comment_submit')}
												<SendIcon />
												{commentSubmitting && (
													<Loader2 className='animate-spin' />
												)}
											</Button>
										</div>
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
