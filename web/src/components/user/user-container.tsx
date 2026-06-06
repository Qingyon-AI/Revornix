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
import { searchPublicDocument } from '@/service/document';
import {
	SeoCommunityDocumentListItem,
	SeoCommunitySectionListItem,
} from '@/components/seo/community/seo-community-list-item';
import SectionCard from '../section/section-card';
import SectionCardSkeleton from '../section/section-card-skeleton';
import DocumentCard from '../document/document-card';
import DocumentCardSkeleton from '../document/document-card-skeleton';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import CardViewToggle from '../ui/card-view-toggle';
import { Separator } from '../ui/separator';
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
	BookMarked,
	Compass,
	FileText,
	Search,
	UserCheck,
	UserPlus,
	Users,
} from 'lucide-react';
import { cn, replacePath } from '@/lib/utils';
import { UserRole } from '@/enums/user';
import { useCardViewMode } from '@/hooks/use-card-view-mode';

type UserContentTab = 'documents' | 'sections';

const UserContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [tab, setTab] = useState<UserContentTab>('documents');
	const { viewMode, setViewMode } = useCardViewMode(
		`user-profile-${tab}-view-mode-v2`,
		'list',
	);
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
			keyword,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword,
						user_id: id,
					}
				: undefined;
		},
		enabled: tab === 'sections',
	});

	const {
		data: documentData,
		isFetchingNextPage: isFetchingNextDocumentPage,
		isFetching: isFetchingDocuments,
		isSuccess: isDocumentSuccess,
		fetchNextPage: fetchNextDocumentPage,
		hasNextPage: hasNextDocumentPage,
	} = useInfiniteQuery({
		queryKey: ['searchPublicDocument', keyword, id],
		queryFn: (pageParam) => searchPublicDocument({ ...pageParam.pageParam }),
		initialPageParam: {
			creator_id: id,
			limit: 12,
			keyword,
			desc: true,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start ?? undefined,
						limit: lastPage.limit,
						keyword,
						creator_id: id,
						desc: true,
					}
				: undefined;
		},
		enabled: tab === 'documents',
	});

	const mutateFollow = useMutation({
		mutationFn: async () => {
			if (!userInfo) return;
			return followUser({
				to_user_id: id,
				status: !userInfo.is_followed,
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

			const nextFollowStatus = !userInfo.is_followed;

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
		onError(error, _variables, context) {
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
	const documents = documentData?.pages.flatMap((page) => page.elements) || [];
	const totalDocuments = documentData?.pages[0]?.total ?? 0;
	const isOwnProfile = mainUserInfo?.id === id;

	useEffect(() => {
		if (tab !== 'sections') return;
		if (inView && !isFetchingSections && hasNextPage) {
			fetchNextPage();
		}
	}, [tab, inView, isFetchingSections, hasNextPage, fetchNextPage]);

	useEffect(() => {
		if (tab !== 'documents') return;
		if (inView && !isFetchingDocuments && hasNextDocumentPage) {
			fetchNextDocumentPage();
		}
	}, [
		tab,
		inView,
		isFetchingDocuments,
		hasNextDocumentPage,
		fetchNextDocumentPage,
	]);

	const roleMeta = useMemo(() => {
		switch (userInfo?.role) {
			case UserRole.ROOT:
				return {
					label: t('user_detail_role_root'),
					className:
						'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300',
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

	const renderFollowAction = () => {
		if (isOwnProfile) {
			return <CoverUpdate compact />;
		}

		if (userInfo?.is_followed) {
			return (
				<Button
					disabled={mutateFollow.isPending}
					variant='outline'
					className='rounded-xl bg-background/88 px-4 shadow-none backdrop-blur'
					onClick={() => mutateFollow.mutate()}>
					<UserCheck className='size-4' />
					{t('user_cancel_follow')}
				</Button>
			);
		}

		return (
			<Button
				disabled={mutateFollow.isPending}
				className='rounded-xl px-4 shadow-none'
				onClick={() => mutateFollow.mutate()}>
				<UserPlus className='size-4' />
				{t('user_follow')}
			</Button>
		);
	};

	const renderListSkeleton = (count: number) => {
		return [...Array(count)].map((_, index) => (
			<div key={index}>
				<div className='flex items-start gap-4 py-4'>
					<div className='min-w-0 flex-1 space-y-3'>
						<Skeleton className='h-5 w-64 max-w-full rounded-full' />
						<Skeleton className='h-4 w-full max-w-2xl rounded-full' />
						<Skeleton className='h-4 w-2/3 rounded-full' />
						<div className='flex gap-2'>
							<Skeleton className='h-6 w-20 rounded-full' />
							<Skeleton className='h-6 w-24 rounded-full' />
						</div>
					</div>
					<Skeleton className='hidden size-20 rounded-xl md:block' />
				</div>
				{index !== count - 1 ? <Separator className='my-3' /> : null}
			</div>
		));
	};

	return (
		<div className='flex w-full flex-col pb-6 pt-4'>
			{isFetchingUserInfo && !userInfo ? (
				<>
					<section className='mx-5 overflow-hidden rounded-xl border border-border/60 bg-background'>
						<Skeleton className='h-44 w-full rounded-none lg:h-52' />
						<div className='flex w-full gap-4 px-5 py-4'>
							<Skeleton className='size-20 rounded-full sm:size-24' />
							<div className='flex-1 space-y-3 py-2'>
								<Skeleton className='h-7 w-48 rounded-full' />
								<Skeleton className='h-4 w-full max-w-2xl rounded-full' />
								<Skeleton className='h-4 w-80 max-w-full rounded-full' />
							</div>
						</div>
					</section>
					<div className='w-full px-5'>
						{renderListSkeleton(4)}
					</div>
				</>
			) : userInfo ? (
				<>
					<section className='mx-5 overflow-hidden rounded-xl border border-border/60 bg-background'>
						<div
							className={cn(
								'relative h-44 w-full overflow-hidden lg:h-52',
								!coverSrc && 'bg-muted',
							)}>
							{coverSrc ? (
								<>
									<img
										src={coverSrc}
										alt={`${userInfo.nickname} cover`}
										className='h-full w-full object-cover'
									/>
									<div className='absolute inset-0 bg-gradient-to-t from-black/72 via-black/24 to-black/8 dark:from-black/64 dark:via-black/18 dark:to-black/4' />
									<div className='absolute inset-y-0 left-0 w-[72%] bg-gradient-to-r from-black/56 via-black/28 to-transparent dark:from-black/48 dark:via-black/20' />
									<div className='absolute inset-y-0 right-0 w-[38%] bg-gradient-to-l from-black/34 via-black/14 to-transparent dark:from-black/28 dark:via-black/10' />
								</>
							) : null}
							<div className='absolute inset-x-0 bottom-0'>
								<div className='flex w-full flex-col gap-4 px-5 pb-4 sm:flex-row sm:items-end sm:justify-between'>
									<div className='flex min-w-0 items-end gap-4'>
										<Avatar
											className='size-18 border-4 border-background/90 shadow-xl sm:size-22'
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
										<div className='min-w-0 space-y-2 pb-1'>
											<div className='flex flex-wrap items-center gap-2'>
												<h1
													className={cn(
														'break-words text-2xl font-semibold tracking-tight',
														coverSrc
															? 'text-white drop-shadow-sm'
															: 'text-foreground',
													)}>
													{userInfo.nickname}
												</h1>
												<Badge
													variant='outline'
													className={cn(
														'rounded-full bg-background/82 px-3 py-1 text-xs font-medium backdrop-blur',
														roleMeta.className,
													)}>
													{roleMeta.label}
												</Badge>
												<Badge
													variant='outline'
													className='rounded-full bg-background/82 px-3 py-1 text-xs text-muted-foreground backdrop-blur'>
													{relationshipLabel}
												</Badge>
											</div>
											<p
												className={cn(
													'max-w-[760px] text-sm leading-6',
													coverSrc
														? 'text-white/86 drop-shadow-sm'
														: 'text-muted-foreground',
												)}>
												{userInfo.slogan
													? userInfo.slogan
													: t('user_slogan_empty')}
											</p>
										</div>
									</div>
									<div className='z-10 flex shrink-0 items-center gap-3'>
										{renderFollowAction()}
									</div>
								</div>
							</div>
						</div>
						<div className='border-t border-border/60 bg-background/96'>
							<div className='flex w-full flex-wrap items-center gap-4 px-5 py-3 text-sm text-muted-foreground'>
								<div className='inline-flex items-center gap-1.5'>
									<Users className='size-4' />
									<span>
										{t('user_fans')} {userInfo.fans ?? 0}
									</span>
								</div>
								<div className='inline-flex items-center gap-1.5'>
									<UserCheck className='size-4' />
									<span>
										{t('user_follows')} {userInfo.follows ?? 0}
									</span>
								</div>
								<div className='inline-flex items-center gap-1.5'>
									<BookMarked className='size-4' />
									<span>
										{t('user_detail_section_total')} {totalSections}
									</span>
								</div>
								<div className='inline-flex items-center gap-1.5'>
									<FileText className='size-4' />
									<span>
										{t('user_detail_document_total')} {totalDocuments}
									</span>
								</div>
							</div>
						</div>
					</section>

					<div className='w-full'>
						<div className='sticky top-[var(--private-top-header-height,3.5rem)] z-20 border-b border-border/60 px-5 py-3 backdrop-blur'>
							<div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
								<div className='flex min-w-0 flex-wrap items-center gap-3'>
									<div className='inline-flex max-w-full rounded-xl border border-border/60 bg-background/65 p-0.5'>
										<Button
											type='button'
											variant='ghost'
											className={cn(
												'h-9 rounded-lg px-3 shadow-none',
												tab === 'documents'
													? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
													: 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
											)}
											onClick={() => {
												setTab('documents');
												setKeyword('');
											}}>
											<FileText className='mr-2 size-4' />
											{t('seo_community_documents_tab')}
										</Button>
										<Button
											type='button'
											variant='ghost'
											className={cn(
												'h-9 rounded-lg px-3 shadow-none',
												tab === 'sections'
													? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
													: 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
											)}
											onClick={() => {
												setTab('sections');
												setKeyword('');
											}}>
											<Compass className='mr-2 size-4' />
											{t('seo_community_sections_tab')}
										</Button>
									</div>
									<div className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
										{tab === 'documents' ? (
											<FileText className='size-4' />
										) : (
											<BookMarked className='size-4' />
										)}
										<span>
											{tab === 'documents'
												? t('user_detail_documents_result', {
														count: totalDocuments,
													})
												: t('user_detail_sections_result', {
														count: totalSections,
													})}
										</span>
										{keyword ? <span>"{keyword}"</span> : null}
									</div>
								</div>
								<div className='flex w-full min-w-0 gap-2 xl:max-w-[560px] xl:items-center'>
									<div className='relative flex-1'>
										<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
										<Input
											value={keyword}
											onChange={(e) => setKeyword(e.target.value)}
											placeholder={
												tab === 'documents'
													? t('user_detail_documents_search_placeholder')
													: t('user_detail_sections_search_placeholder')
											}
											className='h-10 rounded-xl border-border/60 bg-background/65 pl-9 shadow-none'
										/>
									</div>
									<CardViewToggle
										value={viewMode}
										onChange={setViewMode}
										className='h-10 shrink-0 rounded-xl border-border/60 bg-background/65 [&_button]:h-full [&_button]:w-10'
									/>
								</div>
							</div>
						</div>
						<div className='px-5 py-5'>
							{tab === 'sections' ? (
								isSuccess && sections.length === 0 && !isFetchingSections ? (
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
											<div>
												{sections.map((section, index) => (
													<div
														key={section.id}
														ref={
															index === sections.length - 1
																? bottomRef
																: undefined
														}>
														<SeoCommunitySectionListItem section={section} />
														{index !== sections.length - 1 ? (
															<Separator className='my-3' />
														) : null}
													</div>
												))}
												{isFetchingSections && !data
													? renderListSkeleton(4)
													: null}
												{isFetchingNextPage && data ? (
													<div className='mt-3'>{renderListSkeleton(2)}</div>
												) : null}
											</div>
										)}
										{viewMode === 'grid' && isFetchingSections && !data
											? [...Array(6)].map((_, index) => {
													return (
														<SectionCardSkeleton
															key={index}
															layout={viewMode}
														/>
													);
												})
											: null}
										{viewMode === 'grid' && isFetchingNextPage && data
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
								)
							) : isDocumentSuccess &&
								documents.length === 0 &&
								!isFetchingDocuments ? (
								<div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/50 px-6 text-center'>
									<div className='max-w-md'>
										<h3 className='text-lg font-semibold tracking-tight'>
											{keyword
												? t('user_detail_documents_search_empty')
												: t('user_documents_empty')}
										</h3>
										<p className='mt-2 text-sm leading-7 text-muted-foreground'>
											{keyword
												? `"${keyword}"`
												: t('user_detail_documents_description')}
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
										documents.map((document, index) => {
											return (
												<div
													className='h-full'
													key={document.id}
													ref={
														index === documents.length - 1
															? bottomRef
															: undefined
													}>
													<DocumentCard document={document} layout='grid' />
												</div>
											);
										})
									) : (
										<div>
											{documents.map((document, index) => (
												<div
													key={document.id}
													ref={
														index === documents.length - 1
															? bottomRef
															: undefined
													}>
													<SeoCommunityDocumentListItem document={document} />
													{index !== documents.length - 1 ? (
														<Separator className='my-3' />
													) : null}
												</div>
											))}
											{isFetchingDocuments && !documentData
												? renderListSkeleton(4)
												: null}
											{isFetchingNextDocumentPage && documentData ? (
												<div className='mt-3'>{renderListSkeleton(2)}</div>
											) : null}
										</div>
									)}
									{viewMode === 'grid' &&
									isFetchingDocuments &&
									!documentData
										? [...Array(6)].map((_, index) => {
												return (
													<DocumentCardSkeleton
														key={index}
														layout={viewMode}
													/>
												);
											})
										: null}
									{viewMode === 'grid' &&
									isFetchingNextDocumentPage &&
									documentData
										? [...Array(3)].map((_, index) => {
												return (
													<DocumentCardSkeleton
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
