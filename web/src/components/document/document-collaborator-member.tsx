'use client';

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getDocumentUser } from '@/service/document';

import DocumentCollaboratorMemberItem from './document-collaborator-member-item';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';

const DocumentCollaboratorMember = ({
	document_id,
}: {
	document_id: number;
}) => {
	const t = useTranslations();
	const [keyword, setKeyword] = useState('');

	const {
		data: userPages,
		isFetchingNextPage,
		isLoading,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['getDocumentCollaborators', document_id, keyword],
		queryFn: (pageParam) => getDocumentUser({ ...pageParam.pageParam }),
		initialPageParam: {
			document_id,
			keyword,
			limit: 10,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						document_id,
						keyword,
						start: lastPage.next_start ?? undefined,
						limit: lastPage.limit,
					}
				: undefined;
		},
		staleTime: 0,
	});

	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					fetchNextPage();
				}
			},
			{ rootMargin: '100px' },
		);

		if (loadMoreRef.current) {
			observer.observe(loadMoreRef.current);
		}

		return () => {
			if (loadMoreRef.current) {
				observer.unobserve(loadMoreRef.current);
			}
		};
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	const users = userPages?.pages.flatMap((page) => page.elements) ?? [];

	return (
		<div>
			<div className='mb-5 flex items-center justify-between gap-3'>
				<div className='text-sm font-bold'>{t('document_collaborators')}</div>
				<div className='relative w-full max-w-56'>
					<SearchIcon className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						className='pl-9'
						placeholder={t('document_collaborators_search')}
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
					/>
				</div>
			</div>
			{isLoading ? <Skeleton className='h-12 w-full' /> : null}
			{!isLoading && users.length === 0 ? (
				<div className='rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground'>
					{t('document_collaborators_empty')}
				</div>
			) : null}
			{!isLoading && users.length > 0 ? (
				<div className='flex max-h-56 flex-col gap-3 overflow-auto rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground'>
					{users.map((member, index) => {
						const isLast = index === users.length - 1;
						return (
							<div key={member.id} ref={isLast ? loadMoreRef : null}>
								<DocumentCollaboratorMemberItem
									document_id={document_id}
									user={member}
								/>
							</div>
						);
					})}
					{isFetchingNextPage ? (
						<div className='p-3 text-center text-xs text-muted-foreground'>
							{t('loading')}...
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
};

export default DocumentCollaboratorMember;
