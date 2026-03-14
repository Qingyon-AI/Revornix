import { getDocumentDetail, searchDocumentNotes } from '@/service/document';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '../ui/skeleton';
import { useRouter } from 'nextjs-toploader/app';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import DocumentCommentForm from './document-comment-form';
import { Alert, AlertDescription } from '../ui/alert';
import { Clock3, OctagonAlert, StickyNote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { replacePath } from '@/lib/utils';
import { formatInUserTimeZone } from '@/lib/time';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '../ui/empty';

const DocumentNotes = ({ id }: { id: number }) => {
	const t = useTranslations();

	const router = useRouter();
	const { mainUserInfo } = useUserContext();

	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const keyword = '';
	const { ref: bottomRef, inView } = useInView();
	const { data, isFetchingNextPage, isFetching, fetchNextPage, hasNextPage } =
		useInfiniteQuery({
			enabled: !!document,
			queryKey: ['searchDocumentNotes', id, keyword],
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
	}, [inView, isFetching, hasNextPage, fetchNextPage]);

	return (
		<div className='flex h-full min-h-0 flex-col gap-4'>
			{document?.creator?.id !== mainUserInfo?.id && (
				<Alert className='rounded-2xl border-destructive/30 bg-destructive/10 dark:bg-destructive/20'>
					<OctagonAlert className='h-4 w-4 text-destructive!' />
					<AlertDescription>{t('document_notes_tips')}</AlertDescription>
				</Alert>
			)}
			{document?.creator?.id === mainUserInfo?.id && (
				<div className='shrink-0'>
					<DocumentCommentForm documentId={id} commentSearchKeyword={keyword} />
				</div>
			)}

			<div className='min-h-0 flex-1 overflow-y-auto'>
				{!isFetching && notes.length === 0 ? (
					<Empty className='min-h-full rounded-3xl border border-dashed border-border/70 bg-muted/20'>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<StickyNote />
							</EmptyMedia>
							<EmptyTitle>{t('document_notes_empty')}</EmptyTitle>
							<EmptyDescription>
								{document?.creator?.id === mainUserInfo?.id
									? t('document_notes_description')
									: t('document_notes_tips')}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className='flex flex-col gap-3'>
						{notes.map((note, index) => {
							return (
								<div
									key={note.id}
									ref={index === notes.length - 1 ? bottomRef : undefined}
									className='rounded-3xl border border-border/60 bg-card/55 px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm'>
									<div className='mb-3 flex items-start gap-3'>
										<div
											className='flex min-w-0 cursor-pointer items-center gap-3'
											onClick={() =>
												router.push(`/user/detail/${note.user.id}`)
											}>
											<Avatar className='size-10 ring-1 ring-border/70'>
												<AvatarImage
													src={replacePath(note.user.avatar, note.user.id)}
													alt='avatar'
													className='size-10 object-cover'
												/>
												<AvatarFallback className='size-10 font-semibold'>
													{note.user.nickname.slice(0, 1) ?? '?'}
												</AvatarFallback>
											</Avatar>
											<div className='min-w-0 space-y-1'>
												<p className='truncate text-sm font-semibold'>
													{note.user.nickname}
												</p>
												{note.create_time ? (
													<div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
														<Clock3 className='size-3.5' />
														<span>
															{formatInUserTimeZone(
																note.create_time,
																'MM-dd HH:mm',
															)}
														</span>
													</div>
												) : null}
											</div>
										</div>
									</div>
									<p className='whitespace-pre-wrap break-words text-sm leading-6 text-foreground/92'>
										{note.content}
									</p>
								</div>
							);
						})}

						{isFetching && !data && (
							<div className='flex flex-col gap-3'>
								{[...Array(8)].map((_, index) => {
									return (
										<Skeleton className='h-28 w-full rounded-3xl' key={index} />
									);
								})}
							</div>
						)}
						{isFetchingNextPage && data && (
							<div className='flex flex-col gap-3'>
								{[...Array(4)].map((_, index) => {
									return (
										<Skeleton className='h-28 w-full rounded-3xl' key={index} />
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default DocumentNotes;
