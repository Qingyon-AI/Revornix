'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import {
	Check,
	ChevronsUpDown,
	Copy,
	ExternalLink,
	InfoIcon,
	ShareIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { UserDocumentAuthority } from '@/enums/document';
import { getQueryClient } from '@/lib/get-query-client';
import { getSiteOrigin } from '@/lib/seo-metadata';
import { cn } from '@/lib/utils';
import {
	addDocumentUser,
	getDocumentDetail,
	getDocumentPublish,
	publishDocument,
} from '@/service/document';
import { searchUser } from '@/service/user';

import DocumentCollaboratorMember from './document-collaborator-member';
import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import NoticeBox from '../ui/notice-box';
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from '../ui/command';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';

const DocumentOperateShare = ({
	document_id,
	className,
	onTriggerClick,
	iconOnly = false,
}: {
	document_id: number;
	className?: string;
	onTriggerClick?: () => void;
	iconOnly?: boolean;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [keyword, setKeyword] = useState('');
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [selectedAuthority, setSelectedAuthority] = useState<0 | 1 | 2>(
		UserDocumentAuthority.READ_ONLY,
	);
	const [userSelectOpen, setUserSelectOpen] = useState(false);

	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id }),
	});
	const { data: publishInfo } = useQuery({
		queryKey: ['getDocumentPublish', document_id],
		queryFn: () => getDocumentPublish({ document_id }),
	});
	const {
		data: userPages,
		isFetchingNextPage,
		isFetching,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchUser', keyword],
		queryFn: (pageParam) => searchUser({ ...pageParam.pageParam }),
		initialPageParam: {
			filter_name: 'nickname',
			filter_value: keyword,
			limit: 20,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						filter_value: keyword,
						filter_name: 'nickname',
					}
				: undefined;
		},
		staleTime: 0,
	});

	const users = userPages?.pages.flatMap((page) => page.elements) ?? [];
	const isPublished = Boolean(publishInfo?.status);
	const publicDocumentUrl =
		typeof window !== 'undefined'
			? `${window.location.origin}/document/${document_id}`
			: `${getSiteOrigin()}/document/${document_id}`;
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

	const invalidateCollaborators = () => {
		queryClient.invalidateQueries({
			predicate(query) {
				return (
					query.queryKey[0] === 'getDocumentCollaborators' &&
					query.queryKey[1] === document_id
				);
			},
		});
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', document_id],
		});
	};

	const mutatePublishDocument = useMutation({
		mutationFn: (status: boolean) =>
			publishDocument({
				document_id,
				status,
			}),
		onSuccess(_, status) {
			toast.success(
				status
					? t('document_publish_enable_success')
					: t('document_publish_disable_success'),
			);
			queryClient.invalidateQueries({
				queryKey: ['getDocumentPublish', document_id],
			});
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', document_id],
			});
		},
		onError(error) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const mutateAddDocumentUser = useMutation({
		mutationFn: addDocumentUser,
		onSuccess() {
			toast.success(t('document_collaborator_add_success'));
			setSelectedUserId(null);
			setSelectedAuthority(UserDocumentAuthority.READ_ONLY);
			setKeyword('');
			invalidateCollaborators();
		},
		onError(error) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const handleCopyPublicLink = async () => {
		if (!isPublished) {
			toast.error(t('document_share_public_unavailable'));
			return;
		}

		try {
			await navigator.clipboard.writeText(publicDocumentUrl);
			toast.success(t('document_share_copy_success'));
		} catch (error) {
			console.error(error);
			toast.error(t('document_share_copy_failed'));
		}
	};

	const handleAddCollaborator = () => {
		if (!selectedUserId) {
			toast.error(t('document_collaborator_select_user_required'));
			return;
		}

		mutateAddDocumentUser.mutate({
			document_id,
			user_id: selectedUserId,
			authority: selectedAuthority,
		});
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					title={t('document_share')}
					className={cn('flex-1 w-full text-xs', className)}
					variant='ghost'
					onClick={onTriggerClick}>
					<ShareIcon />
					{iconOnly ? (
						<span className='sr-only'>{t('document_share')}</span>
					) : (
						t('document_share')
					)}
					{isPublished ? (
						<span className='relative flex size-2'>
							<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75' />
							<span className='relative inline-flex size-2 rounded-full bg-amber-500' />
						</span>
					) : null}
				</Button>
			</DialogTrigger>
			<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-3xl'>
				<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
					<DialogTitle>{t('document_share')}</DialogTitle>
				</DialogHeader>
				<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
					<div className='flex flex-col gap-5'>
						<Alert className='border-emerald-500/40 bg-emerald-600/10 text-emerald-600 dark:border-emerald-600/40 dark:bg-emerald-600/15 dark:text-emerald-400'>
							<InfoIcon />
							<AlertDescription>
								{t('document_share_description')}
							</AlertDescription>
						</Alert>

						<div className='rounded-[24px] border border-border/60 bg-background/45 p-4'>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<div className='space-y-1'>
									<p className='text-sm font-semibold text-foreground'>
										{t('document_publish')}
									</p>
									<p className='text-sm leading-6 text-muted-foreground'>
										{isPublished
											? t('document_share_public_ready')
											: t('document_publish_status_off')}
									</p>
								</div>
								<div className='flex flex-wrap gap-2'>
									<Button
										variant='outline'
										className='rounded-full'
										onClick={() => mutatePublishDocument.mutate(!isPublished)}
										disabled={mutatePublishDocument.isPending}>
										{isPublished
											? t('document_publish_disable')
											: t('document_publish_enable')}
									</Button>
									<Button
										variant='outline'
										className='rounded-full'
										onClick={handleCopyPublicLink}
										disabled={!isPublished}>
										<Copy className='size-4' />
										{t('document_share_copy_link')}
									</Button>
								</div>
							</div>
							{isPublished ? (
								<p className='mt-3 break-all rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-xs leading-5 text-muted-foreground'>
									{publicDocumentUrl}
								</p>
							) : null}
						</div>

						<div className='rounded-[24px] border border-border/60 bg-background/45 p-4'>
							<div className='space-y-1'>
								<p className='text-sm font-semibold text-foreground'>
									{t('document_collaborator_manage')}
								</p>
								<p className='text-sm leading-6 text-muted-foreground'>
									{t('document_collaborator_description')}
								</p>
							</div>

							<div className='mt-4 flex flex-col gap-3'>
								<div className='flex flex-col gap-2 rounded-[20px] border border-border/60 bg-background/55 p-3 lg:flex-row lg:items-center'>
									<Popover
										open={userSelectOpen}
										onOpenChange={setUserSelectOpen}
										modal={true}>
										<PopoverTrigger asChild>
											<Button
												variant='outline'
												role='combobox'
												className='flex w-full flex-1 flex-row justify-between overflow-hidden'>
												<span
													className={cn('truncate flex-1 text-left', {
														'text-muted-foreground font-normal':
															!selectedUserId,
													})}>
													{selectedUserId
														? (users.find((user) => user.id === selectedUserId)
																?.nickname ??
															t('document_collaborator_search_user'))
														: t('document_collaborator_search_user')}
												</span>
												<ChevronsUpDown className='ml-2 flex-shrink-0 opacity-50' />
											</Button>
										</PopoverTrigger>
										<PopoverContent align='start' className='p-0'>
											<Command shouldFilter={false}>
												<CommandInput
													placeholder={t(
														'document_collaborator_search_placeholder',
													)}
													className='h-9'
													onValueChange={setKeyword}
												/>
												<CommandList>
													{isFetching ? (
														<Skeleton className='h-12 w-full' />
													) : null}
													{!isFetching && users.length === 0 ? (
														<CommandEmpty>
															{t('document_collaborator_search_empty')}
														</CommandEmpty>
													) : null}
													{!isFetching && users.length > 0 ? (
														<>
															{users.map((user, index) => {
																const isLast = index === users.length - 1;
																return (
																	<CommandItem
																		key={user.id}
																		ref={isLast ? loadMoreRef : null}
																		value={user.id.toString()}
																		onSelect={(currentValue) => {
																			setSelectedUserId(Number(currentValue));
																			setUserSelectOpen(false);
																		}}>
																		<Avatar className='size-6'>
																			<AvatarImage
																				src={user.avatar}
																				alt='avatar'
																			/>
																			<AvatarFallback className='font-semibold'>
																				{user.nickname.slice(0, 1) ?? '?'}
																			</AvatarFallback>
																		</Avatar>
																		<p className='ml-2 text-xs'>
																			{user.nickname}
																		</p>
																		<Check
																			className={cn(
																				'ml-auto',
																				selectedUserId === user.id
																					? 'opacity-100'
																					: 'opacity-0',
																			)}
																		/>
																	</CommandItem>
																);
															})}
														</>
													) : null}
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
									<Select
										value={String(selectedAuthority)}
										onValueChange={(value) =>
											setSelectedAuthority(Number(value) as 0 | 1 | 2)
										}>
										<SelectTrigger className='w-full lg:w-[180px]'>
											<SelectValue
												placeholder={t('document_collaborator_authority')}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value='0'>
													{t('document_collaborator_authority_full_access')}
												</SelectItem>
												<SelectItem value='1'>
													{t('document_collaborator_authority_w_and_r')}
												</SelectItem>
												<SelectItem value='2'>
													{t('document_collaborator_authority_r_only')}
												</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
									<Button
										className='rounded-full lg:px-5'
										onClick={handleAddCollaborator}
										disabled={mutateAddDocumentUser.isPending}>
										{t('document_collaborator_invite')}
									</Button>
								</div>

								<Alert className='border-border/60 bg-background/40 text-muted-foreground'>
									<InfoIcon />
									<AlertDescription>
										{t('document_collaborator_permission_hint')}
									</AlertDescription>
								</Alert>

								<Separator />

								<DocumentCollaboratorMember document_id={document_id} />
							</div>
						</div>

						<div className='rounded-[24px] border border-border/60 bg-background/45 p-4'>
							<div className='space-y-1'>
								<p className='text-sm font-semibold text-foreground'>
									{t('document_share_related_sections')}
								</p>
								<p className='text-sm leading-6 text-muted-foreground'>
									{t('document_share_related_sections_description')}
								</p>
							</div>

							<div className='mt-4 flex flex-col gap-3'>
								{document?.sections?.length ? (
									document.sections.map((section) => {
										const href = section.publish_uuid
											? `/section/${section.publish_uuid}`
											: `/section/detail/${section.id}`;

										return (
											<div
												key={section.id}
												className='flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border/60 bg-background/55 p-3'>
												<div className='min-w-0 flex-1'>
													<div className='flex flex-wrap items-center gap-2'>
														<p className='truncate text-sm font-medium text-foreground'>
															{section.title}
														</p>
														<Badge
															variant='outline'
															className='rounded-full px-2.5 py-0.5 text-[11px] shadow-none'>
															{section.publish_uuid
																? t('section_publish_status_on')
																: t('admin_sections_publish_private')}
														</Badge>
													</div>
													<p className='mt-1 text-xs leading-5 text-muted-foreground'>
														{section.publish_uuid
															? isPublished
																? t(
																		'document_share_section_public_visible_hint',
																	)
																: t('document_share_section_public_hidden_hint')
															: t('document_share_section_private_hint')}
													</p>
												</div>
												<Button
													asChild
													variant='outline'
													className='rounded-full'>
													<Link href={href}>
														<ExternalLink className='size-4' />
														{section.publish_uuid
															? t('document_share_open_public_section')
															: t('document_share_open_section')}
													</Link>
												</Button>
											</div>
										);
									})
								) : (
									<NoticeBox>
										{t('document_share_related_sections_empty')}
									</NoticeBox>
								)}
							</div>
						</div>
					</div>
				</div>
				<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
					<DialogClose asChild>
						<Button variant='outline'>{t('cancel')}</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default DocumentOperateShare;
