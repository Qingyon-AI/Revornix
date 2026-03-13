import { createDocumentNote } from '@/service/document';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import z from 'zod';
import { Form, FormField, FormItem, FormMessage } from '../ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useState } from 'react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { CornerDownLeft, Loader2, SendIcon } from 'lucide-react';

const DocumentCommentForm = ({
	documentId,
	commentSearchKeyword,
}: {
	documentId: number;
	commentSearchKeyword: string;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const formSchema = z.object({
		content: z.string().min(5, t('document_note_content_no_less_than')),
	});
	const form = useForm({
		defaultValues: {
			content: '',
		},
		resolver: zodResolver(formSchema),
	});
	const [noteSubmitting, setNoteSubmitting] = useState(false);
	const handleSubmitNote = async (event: React.FormEvent<HTMLFormElement>) => {
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

	const mutateAddNote = useMutation({
		mutationFn: () => {
			return createDocumentNote({
				document_id: documentId,
				content: form.getValues('content'),
			});
		},
		onMutate(variables) {
			setNoteSubmitting(true);
		},
		onError(error, variables, context) {
			toast.error(t('document_note_submit_failed'));
			setNoteSubmitting(false);
		},
		onSuccess(data, variables, context) {
			setNoteSubmitting(false);
			queryClient.invalidateQueries({
				queryKey: ['searchDocumentNotes', documentId, commentSearchKeyword],
			});
			toast.success(t('document_note_submit_success'));
			form.reset();
		},
	});

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateAddNote.mutate();
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<Form {...form}>
			<form onSubmit={handleSubmitNote} className='shrink-0'>
				<FormField
					name='content'
					control={form.control}
					render={({ field }) => {
						return (
							<FormItem>
								<div className='rounded-3xl border border-border/70 bg-card/80 p-3 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm'>
									<Textarea
										{...field}
										rows={4}
										placeholder={t('document_note_placeholder')}
										className='min-h-[120px] max-h-56 resize-none rounded-none border-none bg-transparent px-1 py-1.5 text-sm leading-6 shadow-none outline-none ring-0 placeholder:text-muted-foreground/80 focus-visible:ring-0 dark:bg-transparent'
										onKeyDown={(e) => {
											if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
												e.preventDefault();
												form.handleSubmit(
													onFormValidateSuccess,
													onFormValidateError,
												)();
											}
										}}
									/>
									<div className='mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3'>
										<div className='flex items-center gap-2 text-xs text-muted-foreground'>
											<div className='flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background/70'>
												<CornerDownLeft className='size-3.5' />
											</div>
											<span>{t('document_note_content_no_less_than')}</span>
										</div>
										<Button
											size='sm'
											type='submit'
											className='ml-auto rounded-2xl px-4 text-xs'
											disabled={noteSubmitting}>
											{t('document_note_submit')}
											<SendIcon />
											{noteSubmitting ? (
												<Loader2 className='animate-spin' />
											) : null}
										</Button>
									</div>
								</div>
								<FormMessage className='pt-2 text-xs' />
								</FormItem>
							);
						}}
				/>
			</form>
		</Form>
	);
};

export default DocumentCommentForm;
