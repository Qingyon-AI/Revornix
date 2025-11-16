'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { searchSectionComment } from '@/service/section';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';
import CustomImage from '../ui/custom-image';

const SectionCommentsList = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();

	const router = useRouter();
	const [keyword, setKeyword] = useState('');

	const { ref: bottomRef, inView } = useInView();

	const { data, isFetchingNextPage, isFetching, fetchNextPage, hasNextPage } =
		useInfiniteQuery({
			queryKey: ['searchSectionComment', keyword],
			queryFn: (pageParam) => searchSectionComment({ ...pageParam.pageParam }),
			initialPageParam: {
				limit: 10,
				keyword: keyword,
				section_id: section_id,
			},
			getNextPageParam: (lastPage) => {
				return lastPage.has_more
					? {
							start: lastPage.next_start,
							limit: lastPage.limit,
							keyword: keyword,
							section_id: section_id,
					  }
					: undefined;
			},
		});

	const comments = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);

	return (
		<div className='flex flex-col gap-2'>
			{comments &&
				comments.map((comment) => {
					return (
						<div
							key={comment.id}
							className='text-sm rounded p-5 bg-muted dark:bg-black'>
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
									{format(comment.create_time, 'MM-dd HH:mm')}
								</p>
							</div>
						</div>
					);
				})}
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

export default SectionCommentsList;
