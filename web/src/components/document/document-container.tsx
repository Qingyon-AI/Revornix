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
import { DocumentDetailResponse } from '@/generated';
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

const DocumentContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { userInfo } = useUserContext();

	const { data: document } = useQuery({
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
		if (!document || document.is_read || !userInfo) return;
		if (userInfo?.default_read_mark_reason === 0) {
			mutateRead.mutate();
		}
	}, [document?.id, userInfo]); // 注意此处依赖必须是document?.id，而不是document本身，因为有其他部分代码会修改document的状态，导致useEffect再次执行

	const handleFinishRead = () => {
		if (!document || document.is_read) return;
		if (userInfo?.default_read_mark_reason === 1) {
			mutateRead.mutate();
		}
	};

	const handleShowLargerGraph = () => {};

	return (
		<div className='px-5 pb-5 h-full w-full grid grid-cols-12 gap-5 relative'>
			{/* 此处的min-h-0是因为父级的grid布局会导致子元素的h-full无法准确继承到父级的实际高度，导致其高度被内容撑开 */}
			<div className='col-span-8 h-full relative min-h-0'>
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
			<div className='col-span-4 py-0 h-full flex flex-col gap-5 min-h-0 relative'>
				<Card className='py-0 flex-2 overflow-auto relative'>
					<DocumentInfo id={id} />
				</Card>
				<Card className='py-0 flex-1 relative'>
					<Dialog>
						<DialogTrigger asChild>
							<Button
								className='absolute top-2 left-2 z-10'
								size={'icon'}
								variant={'outline'}
								onClick={handleShowLargerGraph}>
								<Expand size={4} className='text-muted-foreground' />
							</Button>
						</DialogTrigger>
						<DialogContent className='!max-w-[80vw] h-[80vh] flex flex-col'>
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
			</div>
		</div>
	);
};

export default DocumentContainer;
