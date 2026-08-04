'use client';

import { Loader2, Trash } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getQueryClient } from '@/lib/get-query-client';
import { deleteDocument } from '@/service/document';

/**
 * 批量删除文档。后端的删除接口本来就收 `document_ids` 数组，所以这里是一次请求，
 * 不是 N 次 —— 不会出现「删到一半失败」的中间态。
 */
const DocumentBulkDeleteAction = ({
	documentIds,
	onDeleted,
}: {
	documentIds: number[];
	onDeleted: (ids: number[]) => void;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [confirmOpen, setConfirmOpen] = useState(false);

	const mutation = useMutation({
		mutationFn: () => deleteDocument({ document_ids: documentIds }),
		onSuccess: async () => {
			const count = documentIds.length;
			onDeleted(documentIds);
			setConfirmOpen(false);
			toast.success(t('selection_delete_success', { count }));
			// 文档会同时出现在「我的 / 收藏 / 未读 / 最近」几个列表里，逐个精确失效不如
			// 让这些查询整体重取 —— 删除本来就是低频操作。
			await Promise.all(
				[
					'searchMyDocument',
					'searchMyStarDocument',
					'searchUserUnreadDocument',
					'searchUserRecentReadDocument',
					'getDocumentLabelSummary',
				].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
			);
		},
		onError: (error) => {
			toast.error(error.message || t('something_wrong'));
		},
	});

	return (
		<>
			<Button
				variant='destructive'
				size='sm'
				className='h-8 rounded-full'
				disabled={mutation.isPending}
				onClick={() => setConfirmOpen(true)}>
				{mutation.isPending ? (
					<Loader2 className='size-4 animate-spin' />
				) : (
					<Trash className='size-4' />
				)}
				{t('selection_delete')}
			</Button>
			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t('selection_delete_documents_title')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t('selection_delete_documents_description', {
								count: documentIds.length,
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							disabled={mutation.isPending}
							onClick={(e) => {
								// 交给 mutation 控制关闭时机，否则失败时对话框已经没了。
								e.preventDefault();
								mutation.mutate();
							}}>
							{t('selection_delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default DocumentBulkDeleteAction;
