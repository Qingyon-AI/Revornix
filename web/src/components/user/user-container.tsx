'use client';

import { followUser, getUserInfo } from '@/service/user';
import {
	InfiniteData,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { searchUserSection } from '@/service/section';
import SectionCard from '../section/section-card';
import SectionCardSkeleton from '../section/section-card-skeleton';
import SectionListTable from '../section/section-list-table';
import { ResourceCardSkeleton, Skeleton, UserCardSkeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import CardViewToggle from '../ui/card-view-toggle';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import CoverUpdate from './cover-update';
import {
	InifiniteScrollPagnitionUserPublicInfo,
	UserPublicInfo,
} from '@/generated';
import {
	filterInfiniteQueryElements,
	mapInfiniteQueryElements,
} from '@/lib/infinite-query-cache';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import {
	BookMarked,
	Search,
	Shield,
	Sparkles,
	UserCheck,
	UserPlus,
	Users,
} from 'lucide-react';
import { cn, replacePath } from '@/lib/utils';
import { UserRole } from '@/enums/user';
import { useCardViewMode } from '@/hooks/use-card-view-mode';

const UserContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { viewMode, setViewMode } = useCardViewMode('section-list-view-mode');
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const userFollowsQueryKey = ['getUserFollows', mainUserInfo?.id] as const;
	const userFansQueryKey = ['getUserFans', mainUserInfo?.id] as const;

	const { data: userInfo, isFetching: isFetchingUserInfo } = useQuery({
		queryKey: ['userInfo', id],
		queryFn: async () => {
			return getUserInfo({ user_id: id });
		},
	});

	const {
		data,
		isFetchingNextPage,
		isFetching: isFetchingSections,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchUserSection', keyword, id],
		queryFn: (pageParam) => searchUserSection({ ...pageParam.pageParam }),
		initialPageParam: {
			user_id: id,
			limit: 10,
			keyword: keyword,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: keyword,
						user_id: id,
					}
				: undefined;
		},
	});

	const mutateFollow = useMutation({
		mutationFn: async () => {
			if (!userInfo) return;
			return followUser({
				to_user_id: id,
				status: userInfo.is_followed ? false : true,
			});
		},
		onMutate() {
			if (!userInfo) return;

			const previousUserInfo = queryClient.getQueryData<UserPublicInfo>([
				'userInfo',
				id,
			]);
			const previousUserFollows = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionUserPublicInfo>
			>({
				queryKey: userFollowsQueryKey,
			});
			const previousUserFans = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionUserPublicInfo>
			>({
				queryKey: userFansQueryKey,
			});

			const isFollowed = !!userInfo.is_followed;
			const nextFollowStatus = !isFollowed;

			queryClient.setQueryData<UserPublicInfo>(['userInfo', id], (old) => {
				if (!old) return old;
				return {
					...old,
					is_followed: nextFollowStatus,
					fans: Math.max(0, (old.fans ?? 0) + (nextFollowStatus ? 1 : -1)),
				};
			});

			if (!nextFollowStatus) {
				filterInfiniteQueryElements<
					InifiniteScrollPagnitionUserPublicInfo,
					UserPublicInfo
				>(queryClient, userFollowsQueryKey, (item) => item.id !== id);
			} else {
				mapInfiniteQueryElements<
					InifiniteScrollPagnitionUserPublicInfo,
					UserPublicInfo
				>(queryClient, userFollowsQueryKey, (item) => {
					if (item.id !== id) return item;
					return {
						...item,
						is_followed: true,
					};
				});
			}

			mapInfiniteQueryElements<
				InifiniteScrollPagnitionUserPublicInfo,
				UserPublicInfo
			>(queryClient, userFansQueryKey, (item) => {
				if (item.id !== id) return item;
				return {
					...item,
					is_followed: nextFollowStatus,
				};
			});

			return { previousUserInfo, previousUserFollows, previousUserFans };
		},
		onError(error, variables, context) {
			toast.error(`${error.message}`);
			if (context?.previousUserInfo) {
				queryClient.setQueryData(['userInfo', id], context.previousUserInfo);
			}
			context?.previousUserFollows?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
			context?.previousUserFans?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
		},
		onSuccess() {
			queryClient.invalidateQueries({ queryKey: ['userInfo', id] });
			queryClient.invalidateQueries({ queryKey: userFollowsQueryKey });
			queryClient.invalidateQueries({ queryKey: userFansQueryKey });
			refreshMainUserInfo();
		},
	});

	const sections = data?.pages.flatMap((page) => page.elements) || [];
	const totalSections = data?.pages[0]?.total ?? 0;
	const isOwnProfile = mainUserInfo?.id === id;

	useEffect(() => {
		if (inView && !isFetchingSections && hasNextPage) {
			fetchNextPage();
		}
	}, [inView, isFetchingSections, hasNextPage, fetchNextPage]);

	const roleMeta = useMemo(() => {
		switch (userInfo?.role) {
			case UserRole.ROOT:
				return {
					label: t('user_detail_role_root'),
					className:
						'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
				};
			case UserRole.ADMIN:
				return {
					label: t('user_detail_role_admin'),
					className:
						'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
				};
			default:
				return {
					label: t('user_detail_role_user'),
					className: 'border-border/60 bg-background/75 text-muted-foreground',
				};
		}
	}, [t, userInfo?.role]);

	const relationshipLabel = isOwnProfile
		? t('user_detail_relationship_self')
		: userInfo?.is_followed
			? t('user_detail_relationship_following')
			: t('user_detail_relationship_not_following');

	const avatarSrc =
		userInfo?.avatar && userInfo.avatar.length > 0
			? replacePath(userInfo.avatar, userInfo.id)
			: undefined;
	const coverSrc =
		userInfo?.cover && userInfo.cover.length > 0
			? replacePath(userInfo.cover, userInfo.id)
			: undefined;

	return (
		<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 pb-6 pt-1 sm:px-5 lg:px-6'>
			{isFetchingUserInfo && !userInfo ? (
				<>
					<div className='rounded-xl border border-border/60 bg-card p-5 shadow-sm'>
						<Skeleton className='h-36 w-full rounded-lg sm:h-44' />
						<div className='mt-5 flex flex-col gap-4 sm:flex-row sm:items-end'>
							<Skeleton className='size-24 rounded-full' />
							<div className='flex-1 space-y-2'>
								<Skeleton className='h-7 w-52 rounded-full' />
								<Skeleton className='h-4 w-full max-w-xl rounded-full' />
							</div>
						</div>
					</div>
					<div className='grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]'>
						<ResourceCardSkeleton />
						<UserCardSkeleton />
					</div>
					<div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
						{[...Array(6)].map((_, index) => {
							return <SectionCardSkeleton key={index} />;
						})}
					</div>
				</>
			) : userInfo ? (
				<>
					<div className='relative overflow-hidden rounded-[30px] border border-border/60 bg-background/30 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.38)]'>
						<div className='relative h-52 w-full overflow-hidden sm:h-60'>
							{coverSrc ? (
								<img
									src={coverSrc}
									alt={`${userInfo.nickname} cover`}
									className='h-full w-full object-cover'
								/>
							) : null}
							<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_26%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.2),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.76))]' />
						</div>
						<div className='relative px-6 pb-6'>
							<div className='-mt-12 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between'>
								<div className='flex min-w-0 flex-col gap-5 md:flex-row'>
									<Avatar
										className='size-22 border-4 border-background shadow-lg md:size-26'
										title={userInfo.nickname || 'Unknown User'}>
										<AvatarImage
											className='object-cover'
											src={avatarSrc}
											alt='user avatar'
										/>
										<AvatarFallback className='text-2xl font-semibold'>
											{userInfo.nickname?.slice(0, 1) ?? '?'}
										</AvatarFallback>
									</Avatar>
									<div className='min-w-0 space-y-4 md:pt-14'>
										<div className='space-y-2'>
											<div className='flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground'>
												<Sparkles className='size-3' />
												<span>{t('website_title')}</span>
											</div>
											<div className='flex flex-wrap items-center gap-2'>
												<h1 className='truncate text-3xl font-semibold tracking-tight'>
													{userInfo.nickname}
												</h1>
												<Badge
													className={cn(
														'rounded-full border px-3 py-1 text-xs font-medium',
														roleMeta.className,
													)}>
													{roleMeta.label}
												</Badge>
												<Badge
													variant='outline'
													className='rounded-full bg-background/75 px-3 py-1 text-xs text-muted-foreground'>
													{relationshipLabel}
												</Badge>
											</div>
											<p className='max-w-3xl text-base leading-7 text-muted-foreground'>
												{userInfo.slogan
													? userInfo.slogan
													: t('user_slogan_empty')}
											</p>
										</div>
										<div className='flex flex-wrap gap-2.5'>
											<div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-sm text-muted-foreground'>
												<Users className='size-4' />
												<span>
													{t('user_fans')} {userInfo.fans ?? 0}
												</span>
											</div>
											<div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-sm text-muted-foreground'>
												<UserCheck className='size-4' />
												<span>
													{t('user_follows')} {userInfo.follows ?? 0}
												</span>
											</div>
											<div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-sm text-muted-foreground'>
												<BookMarked className='size-4' />
												<span>
													{t('user_detail_section_total')} {totalSections}
												</span>
											</div>
										</div>
									</div>
								</div>
								<div className='flex shrink-0 items-center gap-3'>
									{isOwnProfile ? (
										<CoverUpdate compact />
									) : userInfo.is_followed ? (
										<Button
											disabled={mutateFollow.isPending}
											variant='outline'
											className='rounded-2xl bg-background/80 px-5 shadow-sm'
											onClick={() => mutateFollow.mutate()}>
											<UserCheck className='size-4' />
											{t('user_cancel_follow')}
										</Button>
									) : (
										<Button
											disabled={mutateFollow.isPending}
											className='rounded-2xl px-5 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.55)]'
											onClick={() => mutateFollow.mutate()}>
											<UserPlus className='size-4' />
											{t('user_follow')}
										</Button>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className='grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]'>
						<Card className='rounded-[28px] border border-border/60 bg-card/85 py-0 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.34)] backdrop-blur'>
							<CardHeader className='px-6 pt-6'>
								<CardTitle className='text-xl tracking-tight'>
									{t('user_detail_public_profile')}
								</CardTitle>
								<CardDescription className='leading-6'>
									{t('user_detail_public_profile_description')}
								</CardDescription>
							</CardHeader>
							<CardContent className='px-6 pb-6'>
								<div className='grid gap-3 sm:grid-cols-4'>
									<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
										<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
											{t('user_detail_role')}
										</div>
										<div className='mt-3 flex items-center gap-2 text-base font-semibold'>
											<Shield className='size-4 text-muted-foreground' />
											<span>{roleMeta.label}</span>
										</div>
									</div>
									<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
										<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
											{t('user_detail_relationship')}
										</div>
										<div className='mt-3 text-base font-semibold'>
											{relationshipLabel}
										</div>
									</div>
									<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
										<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
											{t('user_fans')}
										</div>
										<div className='mt-3 text-base font-semibold'>
											{userInfo.fans ?? 0}
										</div>
									</div>
									<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
										<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
											{t('user_follows')}
										</div>
										<div className='mt-3 text-base font-semibold'>
											{userInfo.follows ?? 0}
										</div>
									</div>
								</div>
								<div className='mt-4 rounded-[24px] border border-dashed border-border/70 bg-background/60 p-5'>
									<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
										{t('account_slogan')}
									</div>
									<p className='mt-3 text-lg leading-8'>
										{userInfo.slogan ? userInfo.slogan : t('user_slogan_empty')}
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className='rounded-[28px] border border-border/60 bg-card/85 py-0 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.3)] backdrop-blur'>
							<CardHeader className='px-6 pt-6'>
								<CardTitle className='text-xl tracking-tight'>
									{t('user_detail_overview')}
								</CardTitle>
								<CardDescription className='leading-6'>
									{t('user_detail_overview_description')}
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-3 px-6 pb-6'>
								<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
									<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
										{t('user_detail_section_total')}
									</div>
									<div className='mt-2 text-3xl font-semibold'>
										{totalSections}
									</div>
								</div>
								<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
									<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
										{keyword
											? t('user_detail_sections_result', {
													count: totalSections,
												})
											: t('user_detail_sections_total', {
													count: totalSections,
												})}
									</div>
									<div className='mt-2 text-base leading-7 text-muted-foreground'>
										{keyword
											? `"${keyword}"`
											: t('user_detail_sections_description')}
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className='rounded-[30px] border border-border/60 bg-card/86 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.32)] backdrop-blur'>
						<div className='border-b border-border/60 px-5 py-5'>
							<div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
								<div className='space-y-2'>
									<div className='text-[11px] uppercase tracking-[0.22em] text-muted-foreground'>
										{t('user_detail_sections_title')}
									</div>
									<h2 className='text-2xl font-semibold tracking-tight'>
										{t('user_detail_sections_title')}
									</h2>
									<p className='text-sm leading-6 text-muted-foreground'>
										{t('user_detail_sections_description')}
									</p>
								</div>
								<div className='flex w-full max-w-md items-center gap-3'>
									<div className='relative flex-1'>
										<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
										<Input
											value={keyword}
											onChange={(e) => setKeyword(e.target.value)}
											placeholder={t('user_detail_sections_search_placeholder')}
											className='h-11 rounded-2xl border-border/60 bg-background/70 pl-9'
										/>
									</div>
									<CardViewToggle value={viewMode} onChange={setViewMode} />
								</div>
							</div>
						</div>
						<div className='px-5 py-5'>
							{isSuccess && sections.length === 0 && !isFetchingSections ? (
								<div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/50 px-6 text-center'>
									<div className='max-w-md'>
										<h3 className='text-lg font-semibold tracking-tight'>
											{keyword
												? t('user_detail_sections_search_empty')
												: t('user_sections_empty')}
										</h3>
										<p className='mt-2 text-sm leading-7 text-muted-foreground'>
											{keyword
												? `"${keyword}"`
												: t('user_detail_sections_description')}
										</p>
									</div>
								</div>
							) : (
								<div
									className={
										viewMode === 'grid'
											? 'grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4'
											: 'flex flex-col gap-4'
									}>
									{viewMode === 'grid' ? (
										sections.map((section, index) => {
											return (
												<div
													className='h-full'
													key={section.id}
													ref={
														index === sections.length - 1
															? bottomRef
															: undefined
													}>
													<SectionCard section={section} />
												</div>
											);
										})
									) : (
										<>
											<SectionListTable
												sections={sections}
												lastRowRef={bottomRef}
											/>
										</>
									)}
									{isFetchingSections && !data
										? [...Array(6)].map((_, index) => {
												return (
													<SectionCardSkeleton key={index} layout={viewMode} />
												);
											})
										: null}
									{isFetchingNextPage && data
										? [...Array(3)].map((_, index) => {
												return (
													<SectionCardSkeleton
														key={`next-${index}`}
														layout={viewMode}
													/>
												);
											})
										: null}
								</div>
							)}
						</div>
					</div>
				</>
			) : null}
		</div>
	);
};

export default UserContainer;
