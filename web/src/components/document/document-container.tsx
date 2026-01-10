'use client';

import WebsiteDocumentDetail from '@/components/document/website-document-detail';
import DocumentInfo from './document-info';
import { Card } from '@/components/ui/card';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	generateDocumentPodcast,
	getDocumentDetail,
	readDocument,
} from '@/service/document';
import FileDocumentDetail from './file-document-detail';
import QuickDocumentDetail from './quick-note-document-detail';
import { useUserContext } from '@/provider/user-provider';
import { getQueryClient } from '@/lib/get-query-client';
import { DocumentDetailResponse } from '@/generated';
import { useEffect } from 'react';
import { DocumentCategory, DocumentPodcastStatus } from '@/enums/document';
import DocumentGraph from './document-graph';
import { Button } from '../ui/button';
import { Expand, Loader2, OctagonAlert } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useTranslations } from 'next-intl';
import AudioPlayer from '../ui/audio-player';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

const DocumentContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();

	const {
		data: document,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const mutateGeneratePodcast = useMutation({
		mutationFn: () =>
			generateDocumentPodcast({
				document_id: id,
			}),
		onSuccess(data, variables, onMutateResult, context) {
			toast.success(t('document_podcast_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', id],
			});
		},
		onError(error, variables, onMutateResult, context) {
			toast.error(t('document_podcast_generate_task_submitted_failed'));
			console.error(error);
		},
	});

	const mutateRead = useMutation({
		mutationFn: () =>
			readDocument({
				document_id: id,
				status: true,
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
					is_read: true,
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

	useEffect(() => {
		if (!document || document.is_read || !mainUserInfo) return;
		if (mainUserInfo?.default_read_mark_reason === 0) {
			mutateRead.mutate();
		}
	}, [document?.id, mainUserInfo]); // 注意此处依赖必须是document?.id，而不是document本身，因为有其他部分代码会修改document的状态，导致useEffect再次执行

	const handleFinishRead = () => {
		if (!document || document.is_read) return;
		if (mainUserInfo?.default_read_mark_reason === 1) {
			mutateRead.mutate();
		}
	};

	return (
		<div className='px-5 pb-5 md:h-full w-full md:grid md:grid-cols-12 md:gap-5 relative'>
			{/* 此处的min-h-0是因为父级的grid布局会导致子元素的h-full无法准确继承到父级的实际高度，导致其高度被内容撑开 */}
			<div className='md:col-span-8 md:h-full relative min-h-0'>
				{isError && (
					<div className='text-sm text-muted-foreground h-full w-full flex justify-center items-center'>
						{error.message}
					</div>
				)}
				{document?.category === DocumentCategory.WEBSITE && (
					<WebsiteDocumentDetail onFinishRead={handleFinishRead} id={id} />
				)}
				{document?.category === DocumentCategory.FILE && (
					<FileDocumentDetail onFinishRead={handleFinishRead} id={id} />
				)}
				{document?.category === DocumentCategory.QUICK_NOTE && (
					<QuickDocumentDetail onFinishRead={handleFinishRead} id={id} />
				)}
			</div>
			<div className='md:col-span-4 md:py-0 md:h-full flex flex-col gap-5 min-h-0 relative'>
				<Card className='py-0 md:flex-2 overflow-auto relative'>
					<DocumentInfo id={id} />
				</Card>
				<Card className='py-0 md:flex-1 relative'>
					<Dialog>
						<DialogTrigger asChild>
							<Button
								className='absolute top-2 left-2 z-10'
								size={'icon'}
								variant={'outline'}>
								<Expand size={4} className='text-muted-foreground' />
							</Button>
						</DialogTrigger>
						<DialogContent className='max-w-[80vw]! h-[80vh] flex flex-col'>
							<DialogHeader>
								<DialogTitle>{t('document_graph')}</DialogTitle>
								<DialogDescription>
									{t('document_graph_description')}
								</DialogDescription>
							</DialogHeader>
							<div className='flex-1'>
								<DocumentGraph document_id={id} />
							</div>
						</DialogContent>
					</Dialog>

					<DocumentGraph document_id={id} />
				</Card>

				{!document?.podcast_task && (
					<>
						<Alert className='bg-destructive/10 dark:bg-destructive/20'>
							<AlertDescription>
								<span className='inline-flex'>
									{t('document_podcast_unset')}
								</span>
								<Button
									variant={'link'}
									size='sm'
									className='text-muted-foreground underline underline-offset-3 p-0 m-0 ml-auto'
									onClick={() => mutateGeneratePodcast.mutate()}
									disabled={
										mutateGeneratePodcast.isPending ||
										!mainUserInfo?.default_podcast_user_engine_id
									}>
									{t('document_podcast_generate')}
									{mutateGeneratePodcast.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
							</AlertDescription>
						</Alert>
						{!mainUserInfo?.default_podcast_user_engine_id && (
							<Alert className='bg-destructive/10 dark:bg-destructive/20'>
								<OctagonAlert className='h-4 w-4 text-destructive!' />
								<AlertDescription>
									{t('document_create_auto_podcast_engine_unset')}
								</AlertDescription>
							</Alert>
						)}
					</>
				)}

				{document?.podcast_task && (
					<Card className='p-5 relative flex flex-col gap-5'>
						{document?.podcast_task?.status ===
							DocumentPodcastStatus.GENERATING && (
							<div className='text-center text-muted-foreground text-xs p-3'>
								{t('document_podcast_processing')}
							</div>
						)}
						{document?.podcast_task?.status === DocumentPodcastStatus.SUCCESS &&
							document?.podcast_task?.podcast_file_name && (
								<AudioPlayer
									src={document?.podcast_task?.podcast_file_name}
									cover={
										document.cover ??
										'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
									}
									title={document.title ?? 'Unkown Title'}
									artist={'AI Generated'}
								/>
							)}
						{document?.podcast_task?.status ===
							DocumentPodcastStatus.FAILED && (
							<div className='text-center text-muted-foreground text-xs p-3'>
								{t('document_podcast_failed')}
							</div>
						)}
					</Card>
				)}
			</div>
		</div>
	);
};

export default DocumentContainer;
