import { getDocumentDetail, searchDocumentNotes, deleteDocumentNote } from '@/service/document';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '../ui/skeleton';
import { useRouter } from 'nextjs-toploader/app';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import DocumentCommentForm from './document-comment-form';
import { Clock3, Loader2, StickyNote, TrashIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { replacePath } from '@/lib/utils';
import { formatInUserTimeZone } from '@/lib/time';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Button } from '../ui/button';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
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
	const queryClient = getQueryClient();

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

	const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
	const [openDeleteId, setOpenDeleteId] = useState<number | null>(null);

	const handleDeleteNote = async (noteId: number) => {
		setDeletingNoteId(noteId);
		try {
			await deleteDocumentNote({ document_note_ids: [noteId] });
			toast.success(t('document_note_delete_success'));
			queryClient.invalidateQueries({ queryKey: ['searchDocumentNotes', id, keyword] });
			setOpenDeleteId(null);
		} catch {
			toast.error(t('document_note_delete_failed'));
		} finally {
			setDeletingNoteId(null);
		}
	};

	return (
		<div className='flex h-full min-h-0 flex-col gap-4'>
			<div className='shrink-0'>
				<DocumentCommentForm documentId={id} commentSearchKeyword={keyword} />
			</div>

			<div className='min-h-0 flex-1 overflow-y-auto'>
				{!isFetching && notes.length === 0 ? (
					<Empty className='min-h-full rounded-3xl border border-dashed border-border/70 bg-muted/20'>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<StickyNote />
							</EmptyMedia>
							<EmptyTitle>{t('document_notes_empty')}</EmptyTitle>
							<EmptyDescription>
								{t('document_notes_description')}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className='flex flex-col gap-3'>
						{notes.map((note, index) => {
							const isOwner = mainUserInfo?.id === note.user.id;
							return (
								<div
									key={note.id}
									ref={index === notes.length - 1 ? bottomRef : undefined}
									className='rounded-3xl border border-border/60 bg-card/55 px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm'>
									<div className='mb-3 flex items-start justify-between gap-3'>
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

										{isOwner && (
											<AlertDialog
												open={openDeleteId === note.id}
												onOpenChange={(o) =>
													setOpenDeleteId(o ? note.id : null)
												}>
												<AlertDialogTrigger asChild>
													<Button
														variant='ghost'
														size='icon'
														className='size-8 shrink-0 rounded-xl text-muted-foreground hover:text-destructive'>
														<TrashIcon className='size-4' />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															{t('document_note_delete_confirm')}
														</AlertDialogTitle>
														<AlertDialogDescription>
															{t('document_note_delete_description')}
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel
															disabled={deletingNoteId === note.id}>
															{t('cancel')}
														</AlertDialogCancel>
														<Button
															variant='destructive'
															onClick={() => handleDeleteNote(note.id)}
															disabled={deletingNoteId === note.id}
															className='rounded-xl'>
															{deletingNoteId === note.id ? (
																<Loader2 className='size-4 animate-spin' />
															) : (
																<TrashIcon className='size-4' />
															)}
															{t('delete')}
														</Button>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										)}
									</div>
									<p className='whitespace-pre-wrap wrap-break-word text-sm leading-6 text-foreground/92'>
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
