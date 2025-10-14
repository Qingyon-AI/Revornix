'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Separator } from '../ui/separator';
import { searchSectionComment } from '@/service/section';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useTranslations } from 'next-intl';
import SectionCommentForm from './section-comment-form';
import SectionCommentsList from './section-comments-list';

const SectionComments = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const [keyword, setKeyword] = useState('');

	const { ref: bottomRef, inView } = useInView();

	const { isFetching, fetchNextPage, hasNextPage } = useInfiniteQuery({
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

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);

	return (
		<div className='rounded flex flex-col h-full'>
			<p className='font-bold text-lg mb-3'>{t('section_comments')}</p>
			<div className='flex-1 overflow-auto'>
				<SectionCommentsList section_id={section_id} />
			</div>
			<Separator className='mb-3' />
			<SectionCommentForm section_id={section_id} />
			<div ref={bottomRef}></div>
		</div>
	);
};

export default SectionComments;
