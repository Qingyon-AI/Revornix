'use client';

import { PhotoProvider, PhotoView } from 'react-photo-view';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	deleteDocument,
	getDocumentDetail,
	readDocument,
	starDocument,
	summaryDocumentContentByAi,
} from '@/service/document';
import { getQueryClient } from '@/lib/get-query-client';
import { LinkIcon, Loader2, Star, StarOff } from 'lucide-react';
import { DocumentDetailResponse } from '@/generated';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import DocumentNotes from './document-notes';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

const DocumentInfo = ({ id }: { id: string }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const router = useRouter();
	const [aiSummaizing, setAiSummaizing] = useState(false);
	const [showDeleteDocumentDialog, setShowDeleteDocumentDialog] =
		useState(false);

	const { data, isPending, isError, error, isRefetching } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: Number(id) }),
	});

	const mutateRead = useMutation({
		mutationFn: () =>
			readDocument({
				document_id: Number(id),
				status: !data?.is_read!,
			}),
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
					is_read: !old.is_read,
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
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ['getDocumentDetail', id] });
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey.includes('searchUserUnreadDocument'),
			});
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey.includes('searchUserRecentReadDocument'),
			});
		},
	});

	const mutateStar = useMutation({
		mutationFn: () =>
			starDocument({ document_id: Number(id), status: !data?.is_star! }),
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
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ['getDocumentDetail', id] });
			queryClient.invalidateQueries({
				predicate: (query) => query.queryKey.includes('searchMyStarDocument'),
			});
		},
	});

	const mutateDelete = useMutation({
		mutationKey: ['deleteDocument', id],
		mutationFn: () => deleteDocument({ document_ids: [Number(id)] }),
		onSuccess: () => {
			toast.success(t('document_delete_success'));
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey.includes('searchUserUnreadDocument'),
			});
			setShowDeleteDocumentDialog(false);
			router.back();
		},
		onError(error, variables, context) {
			toast.error(t('document_delete_failed'));
		},
	});

	const handleAiSummarize = async () => {
		if (data?.transform_task?.status === 3) {
			toast.error(t('ai_summary_failed_as_markdown_transform_failed'));
			return;
		}
		if (data?.transform_task?.status === 1) {
			toast.error(t('ai_summary_failed_as_markdown_transform_doing'));
			return;
		}
		if (data?.transform_task?.status === 0) {
			toast.error(t('ai_summary_failed_as_markdown_transform_waiting'));
			return;
		}
		setAiSummaizing(true);
		const [res, err] = await utils.to(
			summaryDocumentContentByAi({ document_id: Number(id) })
		);
		if (err) {
			toast.error(err.message);
			setAiSummaizing(false);
			return;
		}
		toast.success(t('ai_summary_success'));
		setAiSummaizing(false);
		queryClient.invalidateQueries({ queryKey: ['getDocumentDetail', id] });
	};

	return (
		<>
			{isPending && <Skeleton className='w-full h-full' />}
			{data && (
				<div className='relative h-full'>
					<div className='absolute top-0 right-0 w-full flex flex-row gap-2 justify-end p-5 rounded-t'>
						{data.category === 1 && data.website_info && (
							<Link
								href={data.website_info?.url ? data.website_info.url : ''}
								target='_blank'>
								<Button
									variant={'outline'}
									size={'sm'}
									className='text-xs rounded-full'>
									{t('website_document_go_to_origin')}
									<LinkIcon />
								</Button>
							</Link>
						)}
						{data.category === 0 && data.file_info && (
							<Link
								href={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${data.file_info?.file_name}`}
								target='_blank'>
								<Button
									variant={'outline'}
									size={'sm'}
									className='text-xs rounded-full'>
									{t('file_document_go_to_origin')}
									<LinkIcon />
								</Button>
							</Link>
						)}
						<Button
							variant={'outline'}
							size={'sm'}
							className='text-xs rounded-full'
							disabled={aiSummaizing}
							onClick={() => {
								handleAiSummarize();
							}}>
							{t('ai_summary')}
							{aiSummaizing && <Loader2 className='size-4 animate-spin' />}
						</Button>
						{data.is_star ? (
							<Button
								variant={'outline'}
								size={'sm'}
								onClick={() => mutateStar.mutate()}
								className='text-xs rounded-full'>
								{t('document_star_cancel')}
								<StarOff />
							</Button>
						) : (
							<Button
								variant={'outline'}
								size={'sm'}
								onClick={() => mutateStar.mutate()}
								className='text-xs rounded-full'>
								{t('document_star')}
								<Star />
							</Button>
						)}
						{data.is_read ? (
							<Button
								variant={'outline'}
								size={'sm'}
								onClick={() => mutateRead.mutate()}
								className='text-xs rounded-full'>
								{t('document_unread')}
							</Button>
						) : (
							<Button
								variant={'outline'}
								size={'sm'}
								onClick={() => mutateRead.mutate()}
								className='text-xs rounded-full'>
								{t('document_read')}
							</Button>
						)}

						<Dialog
							open={showDeleteDocumentDialog}
							onOpenChange={setShowDeleteDocumentDialog}>
							<DialogTrigger asChild>
								<Button
									size={'sm'}
									variant={'destructive'}
									className='text-xs rounded-full'>
									{t('document_delete')}
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
					</div>
					<div className='h-full overflow-auto pb-5'>
						<PhotoProvider>
							<PhotoView
								src={
									data.cover
										? data.cover
										: `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/images/cover.jpg`
								}>
								<div className='mb-5'>
									<img
										src={
											data.cover
												? data.cover
												: `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/images/cover.jpg`
										}
										alt='cover'
										className='w-full h-64 object-cover'
									/>
								</div>
							</PhotoView>
						</PhotoProvider>
						<div className='flex flex-row justify-between items-center px-5 mb-3'>
							<div className='font-bold text-lg'>
								{data.title ? data.title : t('document_no_title')}
							</div>
						</div>
						<div className='text-muted-foreground mb-3 px-5 text-sm/6'>
							{data.description
								? data.description
								: t('document_no_description')}
						</div>
						{data.creator && (
							<div
								className='flex flex-row items-center px-5 mb-3'
								onClick={() => router.push(`/user/detail/${data.creator!.id}`)}>
								<img
									src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${
										data.creator!.avatar?.name
									}`}
									className='w-5 h-5 rounded-full mr-2 object-cover'
								/>
								<p className='text-xs text-muted-foreground'>
									{data.creator!.nickname}
								</p>
							</div>
						)}
						<div className='text-muted-foreground mb-3 px-5 flex flex-row gap-1 items-center text-xs'>
							<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
								{t('document_from_plat') + ': '}
								{data.from_plat === 'qingyun-web'
									? t('document_from_plat_website')
									: data.from_plat === 'api'
									? t('document_from_plat_api')
									: t('document_from_plat_others')}
							</div>
							<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
								{t('document_category') + ': '}
								{data.category === 1
									? t('document_category_link')
									: data.category === 0
									? t('document_category_file')
									: data.category === 2
									? t('document_category_quick_note')
									: t('document_category_others')}
							</div>
						</div>
						<div className='text-muted-foreground mb-3 px-5 flex flex-row gap-1 items-center text-xs'>
							{data.sections?.map((section) => {
								return (
									<Link
										key={section.id}
										className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'
										href={`/section/detail/${section.id}`}>
										{`${t('document_related_sections')}: ${section.title}`}
									</Link>
								);
							})}
						</div>
						{data.labels && data.labels?.length > 0 && (
							<div className='flex flex-row items-center w-full overflow-auto px-5 gap-5 mb-3'>
								{data.labels?.map((label) => {
									return (
										<Badge variant={'outline'} key={label.id}>
											{`# ${label.name}`}
										</Badge>
									);
								})}
							</div>
						)}
						<div className='text-sm rounded bg-black/5 dark:bg-white/5 p-5 mx-5 mb-3'>
							<h1 className='text-lg font-bold mb-3'>{t('ai_summary')}</h1>
							<p className='text-muted-foreground text-sm/6'>
								{data.ai_summary ? data.ai_summary : t('ai_summary_empty')}
							</p>
						</div>
						<DocumentNotes id={id} />
					</div>
				</div>
			)}
		</>
	);
};

export default DocumentInfo;
