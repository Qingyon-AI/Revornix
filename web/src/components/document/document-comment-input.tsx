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
import { createDocumentComment } from '@/service/document';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
	document_id: number;
	parent_id?: number;
	rootIdForInvalidation?: number;
	placeholder?: string;
	autoFocus?: boolean;
	compact?: boolean;
	onCancel?: () => void;
	onSuccess?: () => void;
};

const DocumentCommentInput = ({
	document_id,
	parent_id,
	rootIdForInvalidation,
	placeholder,
	autoFocus,
	compact = false,
	onCancel,
	onSuccess,
}: Props) => {
	const t = useTranslations();
	const commentFormSchema = z.object({
		content: z
			.string()
			.min(1, t('document_comment_content_needed'))
			.max(1000, t('document_comment_content_no_more_than')),
	});

	const queryClient = getQueryClient();
	const [submitting, setSubmitting] = useState(false);
	const form = useForm({
		resolver: zodResolver(commentFormSchema),
		defaultValues: { content: '' },
	});

	const mutateAdd = useMutation({
		mutationFn: () =>
			createDocumentComment({
				document_id,
				content: form.getValues('content'),
				parent_id,
			}),
		onMutate() {
			setSubmitting(true);
		},
		onError() {
			toast.error(t('document_comment_submit_failed'));
			setSubmitting(false);
		},
		onSuccess() {
			setSubmitting(false);
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey[0] === 'searchDocumentComment' &&
						query.queryKey[3] === document_id
					);
				},
			});
			if (rootIdForInvalidation !== undefined) {
				queryClient.invalidateQueries({
					predicate(query) {
						return (
							query.queryKey[0] === 'searchDocumentCommentReplies' &&
							query.queryKey[1] === rootIdForInvalidation
						);
					},
				});
			}
			toast.success(t('document_comment_submit_success'));
			form.reset();
			onSuccess?.();
		},
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		return form.handleSubmit(onValid, onInvalid)(event);
	};

	const onValid = async () => {
		await mutateAdd.mutateAsync();
	};

	const onInvalid = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<Form {...form}>
			<form onSubmit={handleSubmit} className='shrink-0'>
				<FormField
					name='content'
					control={form.control}
					render={({ field }) => (
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
										compact
											? 'min-h-[56px] max-h-32 overflow-y-auto'
											: 'min-h-[88px] max-h-44 overflow-y-auto'
									)}
									placeholder={
										placeholder ?? t('document_comment_content_placeholder')
									}
									{...field}
									onKeyDown={(e) => {
										if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
											e.preventDefault();
											form.handleSubmit(onValid, onInvalid)();
										}
									}}
								/>
								<div className='mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-2'>
									<div className='flex items-center gap-2 text-xs text-muted-foreground'>
										<div className='flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background/70'>
											<CornerDownLeft className='size-3.5' />
										</div>
										<span>{t('document_comment_submit_shortcut')}</span>
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
											size='sm'
											type='submit'
											className='rounded-2xl px-4 text-xs'
											disabled={submitting}>
											{t('document_comment_submit')}
											<SendIcon />
											{submitting && <Loader2 className='animate-spin' />}
										</Button>
									</div>
								</div>
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
};

export default DocumentCommentInput;
