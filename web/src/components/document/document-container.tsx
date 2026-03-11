'use client';

import WebsiteDocumentDetail from '@/components/document/website-document-detail';
import DocumentInfo from './document-info';
import { Card } from '@/components/ui/card';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getDocumentDetail, readDocument } from '@/service/document';
import FileDocumentDetail from './file-document-detail';
import QuickDocumentDetail from './quick-note-document-detail';
import { useUserContext } from '@/provider/user-provider';
import { getQueryClient } from '@/lib/get-query-client';
import {
	DocumentDetailResponse,
	DocumentInfo as DocumentListItem,
	InifiniteScrollPagnitionDocumentInfo,
} from '@/generated';
import { useEffect } from 'react';
import { DocumentCategory } from '@/enums/document';
import DocumentGraph from './document-graph';
import { Button } from '../ui/button';
import { Expand } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useTranslations } from 'next-intl';

import AudioDocumentDetail from './audio-document-detail';
import DocumentPodcast from './document-podcast';
import DocumentAudio from './document-audio';
import { filterInfiniteQueryElements } from '@/lib/infinite-query-cache';

const DocumentContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const userUnreadDocumentQueryKey = [
		'searchUserUnreadDocument',
		mainUserInfo?.id,
	] as const;
	const userRecentReadDocumentQueryKey = [
		'searchUserRecentReadDocument',
		mainUserInfo?.id,
	] as const;

	const {
		data: document,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
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
				['getDocumentDetail', id],
			);
			queryClient.setQueryData(
				['getDocumentDetail', id],
				(old: DocumentDetailResponse) => ({
					...old,
					is_read: true,
				}),
			);
			return { previousDocument };
		},
		onError: (error, variables, context) => {
			context &&
				queryClient.setQueryData(
					['getDocumentDetail', id],
					context.previousDocument,
				);
		},
		onSuccess: () => {
			filterInfiniteQueryElements<
				InifiniteScrollPagnitionDocumentInfo,
				DocumentListItem
			>(queryClient, userUnreadDocumentQueryKey, (item) => item.id !== id);
			queryClient.invalidateQueries({
				queryKey: userUnreadDocumentQueryKey,
				exact: true,
			});
			queryClient.invalidateQueries({
				queryKey: userRecentReadDocumentQueryKey,
				exact: true,
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
		<div className='relative w-full px-5 pb-5 md:grid md:h-full md:grid-cols-12 md:items-stretch md:gap-4'>
			{/* 此处的min-h-0是因为父级的grid布局会导致子元素的h-full无法准确继承到父级的实际高度，导致其高度被内容撑开 */}
			<div className='relative min-h-0 md:col-span-8 md:flex md:h-full md:flex-col'>
				<div className='overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm md:flex-1 md:min-h-0'>
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
					{document?.category === DocumentCategory.AUDIO && (
						<AudioDocumentDetail onFinishRead={handleFinishRead} id={id} />
					)}
				</div>
			</div>
			<div className='relative min-h-0 flex flex-col gap-4 md:col-span-4 md:h-full md:py-0'>
				<Card className='relative overflow-auto rounded-2xl border border-border/60 bg-card/80 py-0 shadow-sm backdrop-blur-sm md:flex-2 pt-5'>
					<DocumentInfo id={id} />
				</Card>
				<Card className='relative rounded-2xl border border-border/60 bg-card/80 py-0 shadow-sm backdrop-blur-sm md:flex-1'>
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

				{document && document?.category !== DocumentCategory.AUDIO && (
					<DocumentPodcast document_id={id} />
				)}
				{document && document?.category === DocumentCategory.AUDIO && (
					<DocumentAudio document_id={id} />
				)}
			</div>
		</div>
	);
};

export default DocumentContainer;
