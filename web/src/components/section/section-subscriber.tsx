import { useTranslations } from 'next-intl';
import { Skeleton } from '../ui/skeleton';
import SectionMemberItem from './section-user-member-item';
import { getSectionUser } from '@/service/section';
import { UserSectionRole } from '@/enums/section';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

const SectionSubscriber = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();

	const [keyword, setKeyword] = useState('');

	const {
		data: userPages,
		isFetchingNextPage,
		isLoading,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['getSectionSubscriber', section_id, keyword],
		queryFn: (pageParam) => getSectionUser({ ...pageParam.pageParam }),
		initialPageParam: {
			section_id: section_id,
			keyword: keyword,
			limit: 10,
			filter_roles: [UserSectionRole.SUBSCRIBER],
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						section_id: section_id,
						keyword: keyword,
						start: lastPage.next_start,
						limit: lastPage.limit,
						filter_roles: [UserSectionRole.SUBSCRIBER],
				  }
				: undefined;
		},
		staleTime: 0, // ❌ 不认为缓存是新鲜的（始终重新请求）
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
			{
				rootMargin: '100px', // 提前100px加载
			}
		);

		if (loadMoreRef.current) {
			observer.observe(loadMoreRef.current);
		}

		return () => {
			if (loadMoreRef.current) {
				observer.unobserve(loadMoreRef.current);
			}
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const users = userPages?.pages.flatMap((page) => page.elements) ?? [];

	return (
		<div>
			<div className='mb-5 font-bold text-sm'>{t('section_subscribers')}</div>
			{isLoading && <Skeleton className='w-full h-64' />}
			{!isLoading && users && users.length === 0 && (
				<div className='text-xs text-muted-foreground text-center bg-muted rounded-lg p-3'>
					{t('section_subscribers_empty')}
				</div>
			)}
			{!isLoading && users && users.length > 0 && (
				<div className='bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground gap-3 flex flex-col max-h-40 overflow-auto'>
					{users.map((user, index) => {
						const isLast = index === users.length - 1;
						return (
							<div ref={isLast ? loadMoreRef : null} key={index}>
								<SectionMemberItem section_id={section_id} user={user} />
							</div>
						);
					})}
					{/* ✅ 底部加载状态 */}
					{isFetchingNextPage && (
						<div className='p-3 text-center text-xs text-muted-foreground'>
							{t('loading')}...
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SectionSubscriber;
