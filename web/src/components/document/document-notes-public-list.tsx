'use client';

import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { Clock3, StickyNote } from 'lucide-react';

import type { InifiniteScrollPagnitionDocumentNoteInfo } from '@/generated';
import { searchPublicDocumentNotes } from '@/service/document';
import { replacePath } from '@/lib/utils';
import { formatInUserTimeZone } from '@/lib/time';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ListItemSkeleton } from '../ui/skeleton';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '../ui/empty';

type Props = {
	document_id: number;
	initialData?: InifiniteScrollPagnitionDocumentNoteInfo;
};

const DocumentNotesPublicList = ({ document_id, initialData }: Props) => {
	const t = useTranslations();
	const router = useRouter();

	const keyword = '';
	const initialPageParam = {
		limit: 10,
		keyword,
		document_id,
	};

	const { ref: bottomRef, inView } = useInView();

	const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
		useInfiniteQuery({
			queryKey: ['searchPublicDocumentNotes', keyword, document_id],
			queryFn: (pageParam) =>
				searchPublicDocumentNotes({ ...pageParam.pageParam }),
			initialPageParam,
			initialData: initialData
				? {
						pages: [initialData],
						pageParams: [initialPageParam],
					}
				: undefined,
			retry: false,
			refetchOnWindowFocus: false,
			getNextPageParam: (lastPage) =>
				lastPage.has_more
					? {
							start: lastPage.next_start,
							limit: lastPage.limit,
							keyword,
							document_id,
						}
					: undefined,
		});

	const notes = data?.pages.flatMap((page) => page.elements) ?? [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage, fetchNextPage]);

	if (!isFetching && notes.length === 0) {
		return (
			<Empty className='rounded-3xl border border-dashed border-border/70 bg-muted/20'>
				<EmptyHeader>
					<EmptyMedia variant='icon'>
						<StickyNote />
					</EmptyMedia>
					<EmptyTitle>{t('document_notes_empty')}</EmptyTitle>
					<EmptyDescription>
						{t('seo_document_notes_empty_description')}
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className='flex flex-col gap-3'>
			{notes.map((note, index) => (
				<div
					key={note.id}
					ref={index === notes.length - 1 ? bottomRef : undefined}
					className='rounded-3xl border border-border/60 bg-card/55 px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm'>
					<div className='mb-3 flex items-start justify-between gap-3'>
						<div
							className='flex min-w-0 cursor-pointer items-center gap-3'
							onClick={() => router.push(`/user/detail/${note.user.id}`)}>
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
											{formatInUserTimeZone(note.create_time, 'MM-dd HH:mm')}
										</span>
									</div>
								) : null}
							</div>
						</div>
					</div>
					<p className='whitespace-pre-wrap wrap-break-word text-sm leading-6 text-foreground/92'>
						{note.content}
					</p>
				</div>
			))}

			{isFetching && !data && (
				<div className='flex flex-col gap-3'>
					{[...Array(6)].map((_, index) => (
						<ListItemSkeleton key={index} />
					))}
				</div>
			)}
			{isFetchingNextPage && data && (
				<div className='flex flex-col gap-3'>
					{[...Array(4)].map((_, index) => (
						<ListItemSkeleton key={index} />
					))}
				</div>
			)}
		</div>
	);
};

export default DocumentNotesPublicList;
