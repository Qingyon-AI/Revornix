import { getDocumentDetail, searchDocumentNotes } from '@/service/document';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { useRouter } from 'nextjs-toploader/app';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import DocumentCommentForm from './document-comment-form';
import CustomImage from '../ui/custom-image';
import { Alert, AlertDescription } from '../ui/alert';
import { OctagonAlert } from 'lucide-react';

const DocumentNotes = ({ id }: { id: number }) => {
	const t = useTranslations();

	const router = useRouter();
	const { userInfo } = useUserContext();

	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

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
	const notes = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);

	return (
		<div className='h-full flex flex-col overflow-auto px-5'>
			{document?.creator?.id !== userInfo?.id && (
				<Alert className='bg-destructive/10 dark:bg-destructive/20 mb-5'>
					<OctagonAlert className='h-4 w-4 !text-destructive' />
					<AlertDescription>{t('document_notes_tips')}</AlertDescription>
				</Alert>
			)}
			{document?.creator?.id === userInfo?.id && (
				<div className='pt-1'>
					<DocumentCommentForm documentId={id} commentSearchKeyword={keyword} />
				</div>
			)}

			{notes && notes.length > 0 && (
				<div className='flex-1 flex flex-col gap-2 overflow-auto pb-5'>
					{notes.map((note) => {
						return (
							<div
								key={note.id}
								className='text-sm rounded p-5 bg-muted dark:bg-muted'>
								<p>{note.content}</p>
								<div className='flex flex-row items-center justify-between mt-2'>
									<div
										className='flex flex-row items-center'
										onClick={() => router.push(`/user/detail/${note.user.id}`)}>
										<CustomImage
											src={note.user.avatar}
											className='w-5 h-5 rounded-full mr-2 object-cover'
										/>
										<p className='text-xs text-muted-foreground'>
											{note.user.nickname}
										</p>
									</div>
									{note.create_time && (
										<p className='text-xs text-muted-foreground'>
											{format(note.create_time, 'MM-dd HH:mm')}
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}

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
				<div className='text-muted-foreground text-sm flex-1 flex justify-center items-center'>
					{t('document_notes_empty')}
				</div>
			)}
			<div ref={bottomRef}></div>
		</div>
	);
};

export default DocumentNotes;
