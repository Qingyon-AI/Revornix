import { getQueryClient } from '@/lib/get-query-client';
import {
	createDocumentNote,
	getDocumentDetail,
	searchDocumentNotes,
} from '@/service/document';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '../ui/skeleton';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'nextjs-toploader/app';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';

const DocumentNotes = ({ id }: { id: string }) => {
	const t = useTranslations();
	const formSchema = z.object({
		content: z.string().min(5, t('document_note_content_no_less_than')),
	});
	const router = useRouter();
	const { userInfo } = useUserContext();
	const form = useForm({
		defaultValues: {
			content: '',
		},
		resolver: zodResolver(formSchema),
	});
	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: Number(id) }),
	});
	const queryClient = getQueryClient();
	const [noteSubmitting, setNoteSubmitting] = useState(false);
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();
	const { data, isFetchingNextPage, isFetching, fetchNextPage, hasNextPage } =
		useInfiniteQuery({
			enabled: !!document,
			queryKey: ['searchDocumentNotes', keyword],
			queryFn: (pageParam) => searchDocumentNotes({ ...pageParam.pageParam }),
			initialPageParam: {
				limit: 10,
				keyword: keyword,
				document_id: document!.id,
			},
			getNextPageParam: (lastPage) => {
				return lastPage.has_more
					? {
							start: lastPage.next_start,
							limit: lastPage.limit,
							keyword: keyword,
							document_id: document!.id,
					  }
					: undefined;
			},
		});

	const mutateAddNote = useMutation({
		mutationFn: () => {
			return createDocumentNote({
				document_id: Number(id),
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
				queryKey: ['searchDocumentNotes', keyword],
			});
			toast.success(t('document_note_submit_success'));
			form.reset();
		},
	});

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

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateAddNote.mutate();
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const notes = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);

	return (
		<div className='mx-5 p-5 bg-black/5 dark:bg-white/5 rounded'>
			<h1 className='font-bold text-lg mb-3'>{t('document_notes')}</h1>
			{document?.creator?.id !== userInfo?.id && (
				<p className='text-xs text-muted-foreground mb-3'>
					{t('document_notes_tips')}
				</p>
			)}
			{document?.creator?.id === userInfo?.id && (
				<>
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
													{noteSubmitting && (
														<Loader2 className='animate-spin' />
													)}
												</Button>
											</div>
										</FormItem>
									);
								}}
							/>
						</form>
					</Form>
					<Separator className='mb-3' />
				</>
			)}
			<div className='flex flex-col gap-2'>
				{notes &&
					notes.map((note) => {
						return (
							<div
								key={note.id}
								className='text-sm rounded p-5 bg-white dark:bg-black shadow-inner'>
								<p>{note.content}</p>
								<div className='flex flex-row items-center justify-between mt-2'>
									<div
										className='flex flex-row items-center'
										onClick={() => router.push(`/user/detail/${note.user.id}`)}>
										<img
											src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${note.user.avatar?.name}`}
											className='w-5 h-5 rounded-full mr-2 object-cover'
										/>
										<p className='text-xs text-muted-foreground'>
											{note.user.nickname}
										</p>
									</div>
									<p className='text-xs text-muted-foreground'>
										{format(note.update_time, 'MM-dd HH:mm')}
									</p>
								</div>
							</div>
						);
					})}
			</div>
			{isFetching && !data && (
				<div className='flex flex-col gap-3'>
					{[...Array(12)].map((number, index) => {
						return <Skeleton className='w-full h-20' key={index} />;
					})}
				</div>
			)}
			{isFetchingNextPage && data && (
				<div className='flex flex-col gap-3'>
					{[...Array(12)].map((number, index) => {
						return <Skeleton className='w-full h-20' key={index} />;
					})}
				</div>
			)}
			{!isFetching && notes && notes.length === 0 && (
				<div className='text-muted-foreground text-sm'>
					{t('document_notes_empty')}
				</div>
			)}
			<div ref={bottomRef}></div>
		</div>
	);
};

export default DocumentNotes;
