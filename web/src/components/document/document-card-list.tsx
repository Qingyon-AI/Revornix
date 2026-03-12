'use client';

import { searchUserRecentReadDocument } from '@/service/document';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import DocumentCardSkeleton from './document-card-skeleton';
import DocumentCard from './document-card';
import { useUserContext } from '@/provider/user-provider';

const DocumentCardList = () => {
	const { mainUserInfo } = useUserContext();
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();
	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		enabled: !!mainUserInfo?.id,
		queryKey: ['searchUserRecentReadDocument', mainUserInfo?.id, keyword],
		queryFn: (pageParam) =>
			searchUserRecentReadDocument({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			keyword: keyword,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: keyword,
				  }
				: undefined;
		},
	});
	const documents = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage, fetchNextPage]);

	return (
		<>
			{isSuccess && documents.length === 0 && (
				<div className='flex flex-col items-center justify-center h-full'>
					<p className='text-sm text-muted-foreground'>暂无最近阅读</p>
				</div>
			)}
			<div className='grid grid-cols-1 gap-4 md:grid-cols-4 px-5 pb-5'>
				{documents &&
					documents.map((document, index) => {
						return (
							<div
								key={index}
								ref={index === documents.length - 1 ? bottomRef : undefined}>
								<DocumentCard document={document} />
							</div>
						);
					})}
				{isFetching && !data && (
					<>
						{[...Array(12)].map((number, index) => {
							return <DocumentCardSkeleton key={index} />;
						})}
					</>
				)}
				{isFetchingNextPage && data && (
					<>
						{[...Array(12)].map((number, index) => {
							return <DocumentCardSkeleton key={index} />;
						})}
					</>
				)}
			</div>
		</>
	);
};

export default DocumentCardList;
