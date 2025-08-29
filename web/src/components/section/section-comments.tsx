import { Form, FormField, FormItem, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { createSectionComment, searchSectionComment } from '@/service/section';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { z } from 'zod';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';
import CustomImage from '../ui/custom-image';

const SectionComments = ({ id }: { id: number }) => {
	const t = useTranslations();

	const commentFormSchema = z.object({
		content: z
			.string()
			.min(1, t('section_comment_content_needed'))
			.max(1000, t('section_comment_content_no_more_than')),
	});

	const queryClient = getQueryClient();
	const router = useRouter();
	const [keyword, setKeyword] = useState('');
	const [commentSubmitting, setCommentSubmitting] = useState(false);
	const form = useForm({
		resolver: zodResolver(commentFormSchema),
		defaultValues: {
			content: '',
		},
	});

	const { ref: bottomRef, inView } = useInView();

	const { data, isFetchingNextPage, isFetching, fetchNextPage, hasNextPage } =
		useInfiniteQuery({
			queryKey: ['searchSectionComment', keyword],
			queryFn: (pageParam) => searchSectionComment({ ...pageParam.pageParam }),
			initialPageParam: {
				limit: 10,
				keyword: keyword,
				section_id: id,
			},
			getNextPageParam: (lastPage) => {
				return lastPage.has_more
					? {
							start: lastPage.next_start,
							limit: lastPage.limit,
							keyword: keyword,
							section_id: id,
					  }
					: undefined;
			},
		});

	const mutateAddComment = useMutation({
		mutationFn: () => {
			return createSectionComment({
				section_id: id,
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
				queryKey: ['searchSectionComment', keyword],
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

	const comments = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);

	return (
		<div className='rounded flex flex-col bg-black/5 dark:bg-white/5  p-5 mx-5'>
			<p className='font-bold text-lg mb-3'>{t('section_comments')}</p>
			<Form {...form}>
				<form onSubmit={handleSubmitComment}>
					<FormField
						name='content'
						control={form.control}
						render={({ field }) => {
							return (
								<FormItem>
									<Textarea
										{...field}
										className='bg-white shadow-none dark:bg-black'></Textarea>
									<FormMessage />
									<div className='flex flex-row items-center justify-between mb-3'>
										<p className='text-muted-foreground text-xs'>
											{t('section_comment_content_no_more_than')}
										</p>
										<Button
											size={'sm'}
											type='submit'
											disabled={commentSubmitting}>
											{t('section_comment_submit')}
											{commentSubmitting && (
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
			<div className='flex flex-col gap-2'>
				{comments &&
					comments.map((comment) => {
						return (
							<div
								key={comment.id}
								className='text-sm rounded p-5 bg-white dark:bg-black shadow-inner'>
								<p>{comment.content}</p>
								<div className='flex flex-row items-center justify-between mt-2'>
									<div
										className='flex flex-row items-center'
										onClick={() =>
											router.push(`/user/detail/${comment.creator.id}`)
										}>
										<CustomImage
											src={comment.creator.avatar}
											className='w-5 h-5 rounded-full mr-2 object-cover'
										/>
										<p className='text-xs text-muted-foreground'>
											{comment.creator.nickname}
										</p>
									</div>
									<p className='text-xs text-muted-foreground'>
										{format(comment.update_time, 'MM-dd HH:mm')}
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
			{!isFetching && comments && comments.length === 0 && (
				<div className='text-muted-foreground text-sm'>
					{t('section_comments_empty')}
				</div>
			)}
			<div ref={bottomRef}></div>
		</div>
	);
};

export default SectionComments;
