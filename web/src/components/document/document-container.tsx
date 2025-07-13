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

const DocumentContainer = ({ id }: { id: number }) => {
	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});
	const queryClient = getQueryClient();
	const { userInfo } = useUserContext();
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

	useEffect(() => {
		if (!document || document.is_read) return;
		if (userInfo?.default_read_mark_reason === 0) {
			console.log('read');
			mutateRead.mutate();
		}
	}, [document, userInfo]);

	const handleFinishRead = () => {
		if (!document || document.is_read) return;
		if (userInfo?.default_read_mark_reason === 1) {
			mutateRead.mutate();
		}
	};

	return (
		<div className='h-full grid grid-cols-12 gap-5 px-5 pb-5'>
			<Card className='col-span-4 py-0 overflow-hidden h-full'>
				<DocumentInfo id={id} />
			</Card>
			<div className='col-span-8 h-full overflow-auto relative'>
				{document?.category === 1 && (
					<WebsiteDocumentDetail onFinishRead={handleFinishRead} id={id} />
				)}
				{document?.category === 0 && (
					<FileDocumentDetail onFinishRead={handleFinishRead} id={id} />
				)}
				{document?.category === 2 && (
					<QuickDocumentDetail onFinishRead={handleFinishRead} id={id} />
				)}
			</div>
		</div>
	);
};

export default DocumentContainer;
