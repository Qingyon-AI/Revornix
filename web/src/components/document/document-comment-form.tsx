import { createDocumentNote, getDocumentDetail } from '@/service/document';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { Loader2 } from 'lucide-react';

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
				queryKey: ['searchDocumentNotes', commentSearchKeyword],
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
			<form onSubmit={handleSubmitNote}>
				<FormField
					name='content'
					control={form.control}
					render={({ field }) => {
						return (
							<FormItem className='mb-3'>
								<Textarea
									{...field}
									placeholder={t('document_note_placeholder')}
									className='shadow-none bg-white dark:bg-black'
								/>
								<FormMessage />
								<div className='w-full flex justify-between items-center mb-3'>
									<p className='text-muted-foreground text-sm'>
										{t('document_note_content_no_less_than')}
									</p>
									<Button size={'sm'} disabled={noteSubmitting}>
										{t('document_note_submit')}
										{noteSubmitting && <Loader2 className='animate-spin' />}
									</Button>
								</div>
							</FormItem>
						);
					}}
				/>
			</form>
		</Form>
	);
};

export default DocumentCommentForm;
