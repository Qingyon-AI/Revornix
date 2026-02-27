import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	FolderCheck,
	FolderOutput,
	LinkIcon,
	Loader2,
	NotebookPen,
	Star,
	StarOff,
	Trash,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '../ui/button';
import {
	getDocumentDetail,
	deleteDocument,
	readDocument,
	starDocument,
} from '@/service/document';
import { getQueryClient } from '@/lib/get-query-client';
import {
	DocumentDetailResponse,
	DocumentInfo,
	InifiniteScrollPagnitionDocumentInfo,
} from '@/generated';
import { toast } from 'sonner';
import { useState } from 'react';
import { InfiniteData, useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import DocumentNotes from './document-notes';
import { DocumentCategory } from '@/enums/document';
import DocumentConfiguration from './document-configuration';
import { useUserContext } from '@/provider/user-provider';
import { cn } from '@/lib/utils';
import {
	filterInfiniteDataElements,
	filterInfiniteQueryElements,
} from '@/lib/infinite-query-cache';

const DocumentOperate = ({
	id,
	className,
}: {
	id: number;
	className?: string;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();
	const [showDeleteDocumentDialog, setShowDeleteDocumentDialog] =
		useState(false);

	const { mainUserInfo } = useUserContext();
	const userUnreadDocumentQueryKey = [
		'searchUserUnreadDocument',
		mainUserInfo?.id,
	] as const;
	const userRecentReadDocumentQueryKey = [
		'searchUserRecentReadDocument',
		mainUserInfo?.id,
	] as const;
	const userMyStarDocumentQueryKey = [
		'searchMyStarDocument',
		mainUserInfo?.id,
	] as const;
	const userMyDocumentQueryKey = ['searchMyDocument', mainUserInfo?.id] as const;

	const mapDocumentDetailToListItem = (
		documentDetail: DocumentDetailResponse,
	): DocumentInfo => {
		return {
			id: documentDetail.id,
			creator_id: documentDetail.creator.id,
			category: documentDetail.category,
			title: documentDetail.title,
			from_plat: documentDetail.from_plat,
			create_time: documentDetail.create_time,
			update_time: documentDetail.update_time,
			cover: documentDetail.cover,
			description: documentDetail.description,
			labels: documentDetail.labels,
			sections: documentDetail.sections,
			users: documentDetail.users,
			convert_task: documentDetail.convert_task,
			embedding_task: documentDetail.embedding_task,
			graph_task: documentDetail.graph_task,
			podcast_task: documentDetail.podcast_task,
			summarize_task: documentDetail.summarize_task,
			transcribe_task: documentDetail.transcribe_task,
			process_task: documentDetail.process_task,
		};
	};

	const isDocumentInfiniteData = (
		value: unknown,
	): value is InfiniteData<InifiniteScrollPagnitionDocumentInfo> => {
		if (!value || typeof value !== 'object') return false;
		return Array.isArray(
			(value as InfiniteData<InifiniteScrollPagnitionDocumentInfo>).pages,
		);
	};

	const invalidateDocumentSummaryQueries = () => {
		queryClient.invalidateQueries({
			queryKey: userUnreadDocumentQueryKey,
			exact: true,
		});
		queryClient.invalidateQueries({
			queryKey: userRecentReadDocumentQueryKey,
			exact: true,
		});
		queryClient.invalidateQueries({
			queryKey: userMyStarDocumentQueryKey,
			exact: true,
		});
	};

	const matchDocumentInfiniteQueryFilter = (
		queryKey: readonly unknown[],
		documentItem: DocumentInfo,
	) => {
		const keyword =
			typeof queryKey[2] === 'string' ? queryKey[2].trim().toLowerCase() : '';
		const labelIds = Array.isArray(queryKey[4])
			? queryKey[4].filter((value): value is number => typeof value === 'number')
			: undefined;

		if (keyword) {
			const content =
				`${documentItem.title} ${documentItem.description ?? ''}`.toLowerCase();
			if (!content.includes(keyword)) {
				return false;
			}
		}

		if (labelIds && labelIds.length > 0) {
			const documentLabelIds = (documentItem.labels ?? []).map((label) => label.id);
			if (!labelIds.some((labelId) => documentLabelIds.includes(labelId))) {
				return false;
			}
		}

		return true;
	};

	const upsertDocumentInInfiniteCache = (
		baseQueryKey: 'searchUserRecentReadDocument' | 'searchUserUnreadDocument',
		documentItem: DocumentInfo,
	) => {
		const queryCaches = queryClient.getQueriesData<
			InfiniteData<InifiniteScrollPagnitionDocumentInfo>
		>({
			queryKey: [baseQueryKey, mainUserInfo?.id],
		});

		queryCaches.forEach(([queryKey, oldData]) => {
			if (!isDocumentInfiniteData(oldData)) return;

			const normalizedQueryKey = queryKey as readonly unknown[];
			const removedData = filterInfiniteDataElements<
				InifiniteScrollPagnitionDocumentInfo,
				DocumentInfo
			>(oldData, (item) => item.id !== documentItem.id);
			const dataWithoutTarget = removedData ?? oldData;

			const isMatched = matchDocumentInfiniteQueryFilter(
				normalizedQueryKey,
				documentItem,
			);
			if (!isMatched) {
				if (dataWithoutTarget !== oldData) {
					queryClient.setQueryData(queryKey, dataWithoutTarget);
				}
				return;
			}

			const pages = [...dataWithoutTarget.pages];
			if (pages.length === 0) return;

			const sortDesc = normalizedQueryKey[3] !== false;
			if (sortDesc) {
				pages[0] = {
					...pages[0],
					elements: [documentItem, ...pages[0].elements],
				};
			} else {
				const lastPageIndex = pages.length - 1;
				pages[lastPageIndex] = {
					...pages[lastPageIndex],
					elements: [...pages[lastPageIndex].elements, documentItem],
				};
			}

			queryClient.setQueryData(queryKey, {
				...dataWithoutTarget,
				pages,
			});
		});
	};

	const removeDocumentFromCache = () => {
		const queryKeys = [
			userMyDocumentQueryKey,
			userMyStarDocumentQueryKey,
			userUnreadDocumentQueryKey,
			userRecentReadDocumentQueryKey,
		] as const;

		queryKeys.forEach((queryKey) => {
			filterInfiniteQueryElements<
				InifiniteScrollPagnitionDocumentInfo,
				DocumentInfo
			>(queryClient, queryKey, (item) => item.id !== id);
		});
	};

	const { data } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const mutateRead = useMutation({
		mutationFn: (nextReadStatus: boolean) =>
			readDocument({
				document_id: id,
				status: nextReadStatus,
			}),
		onMutate: async (nextReadStatus) => {
			const previousDocument = queryClient.getQueryData<DocumentDetailResponse>(
				['getDocumentDetail', id]
			);
			queryClient.setQueryData(
				['getDocumentDetail', id],
				(old: DocumentDetailResponse | undefined) =>
					old
						? {
								...old,
								is_read: nextReadStatus,
							}
						: old
			);
			return { previousDocument };
		},
		onError: (error, variables, context) => {
			context &&
				queryClient.setQueryData(
					['getDocumentDetail', id],
					context.previousDocument
				);
		},
		onSuccess: (_, nextReadStatus) => {
			const currentDocument = queryClient.getQueryData<DocumentDetailResponse>([
				'getDocumentDetail',
				id,
			]);
			if (!currentDocument) return;

			const documentListItem = mapDocumentDetailToListItem(currentDocument);

			if (nextReadStatus) {
				filterInfiniteQueryElements<
					InifiniteScrollPagnitionDocumentInfo,
					DocumentInfo
				>(queryClient, userUnreadDocumentQueryKey, (item) => item.id !== id);
				upsertDocumentInInfiniteCache(
					'searchUserRecentReadDocument',
					documentListItem,
				);
				invalidateDocumentSummaryQueries();
				return;
			}

			filterInfiniteQueryElements<
				InifiniteScrollPagnitionDocumentInfo,
				DocumentInfo
			>(queryClient, userRecentReadDocumentQueryKey, (item) => item.id !== id);
			upsertDocumentInInfiniteCache(
				'searchUserUnreadDocument',
				documentListItem,
			);
			invalidateDocumentSummaryQueries();
		},
	});

	const mutateStar = useMutation({
		mutationFn: () =>
			starDocument({ document_id: id, status: !data?.is_star! }),
		onMutate: async () => {
			await queryClient.cancelQueries({
				queryKey: ['getDocumentDetail', id],
			});
			const previousDocument = queryClient.getQueryData<DocumentDetailResponse>(
				['getDocumentDetail', id]
			);
			queryClient.setQueryData(
				['getDocumentDetail', id],
				(old: DocumentDetailResponse) => ({
					...old,
					is_star: !old.is_star,
				})
			);
			return { previousDocument };
		},
		onError: (error, variables, context) => {
			context &&
				queryClient.setQueryData(
					['getDocumentDetail', id],
					context.previousDocument
				);
		},
		onSuccess: () => {
			const currentDocument = queryClient.getQueryData<DocumentDetailResponse>([
				'getDocumentDetail',
				id,
			]);
			if (!currentDocument?.is_star) {
				filterInfiniteQueryElements<
					InifiniteScrollPagnitionDocumentInfo,
					DocumentInfo
				>(queryClient, userMyStarDocumentQueryKey, (item) => item.id !== id);
			}
			queryClient.invalidateQueries({
				queryKey: userMyStarDocumentQueryKey,
			});
			invalidateDocumentSummaryQueries();
		},
	});

	const mutateDelete = useMutation({
		mutationKey: ['deleteDocument', id],
		mutationFn: () => deleteDocument({ document_ids: [id] }),
		onSuccess: () => {
			toast.success(t('document_delete_success'));
			removeDocumentFromCache();
			invalidateDocumentSummaryQueries();
			setShowDeleteDocumentDialog(false);
			router.back();
		},
		onError(error, variables, context) {
			toast.error(t('document_delete_failed'));
		},
	});

	return (
		<>
			{data && (
				<div className={cn('w-full flex justify-between', className)}>
					{data.category === DocumentCategory.WEBSITE && data.website_info && (
						<Link
							title={t('website_document_go_to_origin')}
							href={data.website_info?.url ? data.website_info.url : ''}
							className='flex-1 text-center'
							target='_blank'>
							<Button variant={'ghost'} className='w-full'>
								{/* {t('website_document_go_to_origin')} */}
								<LinkIcon />
							</Button>
						</Link>
					)}
					{data.category === DocumentCategory.FILE && data.file_info && (
						<Link
							title={t('file_document_go_to_origin')}
							target='_blank'
							className='flex-1 text-center'
							href={data.file_info?.file_name ?? '#'}>
							<Button variant={'ghost'} className='w-full'>
								<LinkIcon />
							</Button>
						</Link>
					)}
					{data.is_star ? (
						<Button
							title={t('document_star_cancel')}
							variant={'ghost'}
							onClick={() => mutateStar.mutate()}
							className='flex-1'>
							<StarOff />
						</Button>
					) : (
						<Button
							variant={'ghost'}
							title={t('document_star')}
							onClick={() => mutateStar.mutate()}
							className='flex-1'>
							<Star />
						</Button>
					)}
					{data.is_read ? (
						<Button
							variant={'ghost'}
							title={t('document_unread')}
							onClick={() => mutateRead.mutate(!Boolean(data.is_read))}
							className='flex-1'>
							<FolderOutput />
						</Button>
					) : (
						<Button
							variant={'ghost'}
							title={t('document_read')}
							onClick={() => mutateRead.mutate(!Boolean(data.is_read))}
							className='flex-1'>
							<FolderCheck />
						</Button>
					)}

					<Sheet>
						<SheetTrigger asChild>
							<Button
								title={t('document_notes_title')}
								variant={'ghost'}
								className='flex-1'>
								<NotebookPen />
							</Button>
						</SheetTrigger>
						<SheetContent className='flex flex-col'>
							<SheetHeader>
								<SheetTitle>{t('document_notes_title')}</SheetTitle>
								<SheetDescription>
									{t('document_notes_description')}
								</SheetDescription>
							</SheetHeader>
							<div className='flex-1 overflow-auto'>
								<DocumentNotes id={id} />
							</div>
						</SheetContent>
					</Sheet>
					{data.creator.id === mainUserInfo?.id && (
						<>
							<Dialog
								open={showDeleteDocumentDialog}
								onOpenChange={setShowDeleteDocumentDialog}>
								<DialogTrigger asChild>
									<Button
										title={t('document_delete')}
										variant={'ghost'}
										className='flex-1'>
										<Trash />
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>{t('document_delete')}</DialogTitle>
										<DialogDescription>
											{t('document_delete_alert_description')}
										</DialogDescription>
									</DialogHeader>
									<DialogFooter>
										<DialogClose asChild>
											<Button variant='outline'>
												{t('document_delete_cancel')}
											</Button>
										</DialogClose>
										<Button
											variant='destructive'
											onClick={() => mutateDelete.mutate()}
											disabled={mutateDelete.isPending}>
											{t('document_delete_confirm')}
											{mutateDelete.isPending && (
												<Loader2 className='size-4 animate-spin' />
											)}
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
							<DocumentConfiguration document_id={id} />
						</>
					)}
				</div>
			)}
		</>
	);
};

export default DocumentOperate;
