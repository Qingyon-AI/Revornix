import { useTranslations } from 'next-intl';
import { Skeleton } from '../ui/skeleton';
import { getSectionUser } from '@/service/section';
import { UserSectionRole } from '@/enums/section';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import { useRouter } from 'nextjs-toploader/app';
import { Ellipsis } from 'lucide-react';

const SectionInfoMember = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();

	const router = useRouter();

	const [keyword, setKeyword] = useState('');

	const {
		data: userPages,
		isFetchingNextPage,
		isFetching,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['getSectionMember', section_id, keyword],
		queryFn: (pageParam) => getSectionUser({ ...pageParam.pageParam }),
		initialPageParam: {
			section_id: section_id,
			keyword: keyword,
			limit: 20,
			filter_roles: [UserSectionRole.MEMBER],
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						section_id: section_id,
						keyword: keyword,
						start: lastPage.next_start,
						limit: lastPage.limit,
						filter_roles: [UserSectionRole.MEMBER],
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
			<div className='flex flex-wrap -space-x-1 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale'>
				{!isFetching && users && users.length === 0 && (
					<div className='text-xs text-muted-foreground'>
						{t('section_participants_empty')}
					</div>
				)}
				{!isFetching && users && users.length > 0 && (
					<>
						{users.slice(0, 40).map((user, index) => {
							return (
								<Avatar
									key={index}
									className='size-6'
									title={user.nickname ? user.nickname : 'Unknown User'}
									onClick={(e) => {
										router.push(`/user/detail/${user.id}`);
										e.preventDefault();
										e.stopPropagation();
									}}>
									<AvatarImage
										src={user.avatar}
										alt='user avatar'
										className='size-6 object-cover'
									/>
									<AvatarFallback className='size-6'>
										{user.nickname}
									</AvatarFallback>
								</Avatar>
							);
						})}
						<Sheet>
							<SheetTrigger asChild>
								<div className='size-6 z-10 rounded-full bg-muted flex justify-center items-center hover:cursor-pointer'>
									<Ellipsis />
								</div>
							</SheetTrigger>
							<SheetContent>
								<SheetHeader>
									<SheetTitle>{t('section_participants')}</SheetTitle>
									<Input
										className='w-full'
										placeholder={t('section_participants_search')}
										value={keyword}
										onChange={(e) => setKeyword(e.target.value)}
									/>
								</SheetHeader>
								{!isFetching && users && users.length === 0 && (
									<div className='flex-1 flex justify-center items-center text-xs text-muted-foreground'>
										{t('section_participants_empty')}
									</div>
								)}
								<div className='px-5 flex-1 overflow-auto text-xs text-muted-foreground gap-3 flex flex-col'>
									{!isFetching &&
										users &&
										users.map((user, index) => {
											const isLast = index === users.length - 1;
											return (
												<div
													ref={isLast ? loadMoreRef : null}
													key={index}
													className='bg-muted/50 flex flex-row items-center gap-5 rounded-lg p-3'
													onClick={(e) => {
														router.push(`/user/detail/${user.id}`);
														e.preventDefault();
														e.stopPropagation();
													}}>
													<Avatar
														key={index}
														title={
															user.nickname ? user.nickname : 'Unknown User'
														}>
														<AvatarImage src={user.avatar} alt='user avatar' />
														<AvatarFallback>{user.nickname}</AvatarFallback>
													</Avatar>
													<div className='flex flex-col'>
														<div className='mb-1'>{user.nickname}</div>
														<div>{user.slogan}</div>
													</div>
												</div>
											);
										})}
									{isFetching &&
										!userPages &&
										[...Array(20)].map((number, index) => {
											return (
												<Skeleton className='w-full h-12 mb-3' key={index} />
											);
										})}
									{/* ✅ 底部加载状态 */}
									{isFetchingNextPage &&
										userPages &&
										[...Array(20)].map((number, index) => {
											return (
												<Skeleton className='w-full h-12 mb-3' key={index} />
											);
										})}
								</div>
							</SheetContent>
						</Sheet>
					</>
				)}
			</div>
		</div>
	);
};

export default SectionInfoMember;
