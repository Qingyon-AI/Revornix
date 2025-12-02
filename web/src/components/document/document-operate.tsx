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
import { FaBars } from 'react-icons/fa6';
import Link from 'next/link';
import { Button } from '../ui/button';
import {
	getDocumentDetail,
	deleteDocument,
	readDocument,
	starDocument,
	summaryDocumentContentByAi,
} from '@/service/document';
import { getQueryClient } from '@/lib/get-query-client';
import { DocumentDetailResponse } from '@/generated';
import { toast } from 'sonner';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import { utils } from '@kinda/utils';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import DocumentNotes from './document-notes';
import { DocumentCategory, DocumentMdConvertStatus } from '@/enums/document';
import DocumentConfiguration from './document-configuration';
import { useUserContext } from '@/provider/user-provider';

const DocumentOperate = ({ id }: { id: number }) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();
	const [aiSummaizing, setAiSummaizing] = useState(false);
	const [showDeleteDocumentDialog, setShowDeleteDocumentDialog] =
		useState(false);

	const { userInfo } = useUserContext();

	const { data } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const mutateRead = useMutation({
		mutationFn: () =>
			readDocument({
				document_id: id,
				status: !data?.is_read!,
			}),
		onMutate: async () => {
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
		onSettled: () => {
			queryClient.invalidateQueries({
				predicate: (query) => query.queryKey.includes('searchMyStarDocument'),
			});
		},
	});

	const mutateDelete = useMutation({
		mutationKey: ['deleteDocument', id],
		mutationFn: () => deleteDocument({ document_ids: [id] }),
		onSuccess: () => {
			toast.success(t('document_delete_success'));
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey.includes('searchUserUnreadDocument') ||
					query.queryKey.includes('searchMyDocument'),
			});
			setShowDeleteDocumentDialog(false);
			router.back();
		},
		onError(error, variables, context) {
			toast.error(t('document_delete_failed'));
		},
	});

	const handleAiSummarize = async () => {
		if (data?.convert_task?.status === DocumentMdConvertStatus.FAILED) {
			toast.error(t('ai_summary_failed_as_markdown_transform_failed'));
			return;
		}
		if (data?.convert_task?.status === DocumentMdConvertStatus.CONVERTING) {
			toast.error(t('ai_summary_failed_as_markdown_transform_doing'));
			return;
		}
		if (data?.convert_task?.status === DocumentMdConvertStatus.WAIT_TO) {
			toast.error(t('ai_summary_failed_as_markdown_transform_waiting'));
			return;
		}
		setAiSummaizing(true);
		const [res, err] = await utils.to(
			summaryDocumentContentByAi({ document_id: id })
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
			{data && (
				<div className='w-full flex justify-between'>
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
							onClick={() => mutateRead.mutate()}
							className='flex-1'>
							<FolderOutput />
						</Button>
					) : (
						<Button
							variant={'ghost'}
							title={t('document_read')}
							onClick={() => mutateRead.mutate()}
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
					{data.creator.id === userInfo?.id && (
						<>
							<Button
								variant={'ghost'}
								className='flex-1 w-full'
								disabled={aiSummaizing}
								title={t('ai_summary')}
								onClick={() => {
									handleAiSummarize();
								}}>
								<FaBars />
								{aiSummaizing && <Loader2 className='size-4 animate-spin' />}
							</Button>
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
