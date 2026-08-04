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
import { deleteSection } from '@/service/section';

/**
 * 批量删除专栏。
 *
 * 和文档不同，专栏的删除接口一次只收一个 id，所以这里是 N 次请求。用
 * `allSettled` 是有意的：部分失败时（比如其中一个专栏并非本人创建）已经删掉的那些
 * 不该被回滚成「整体失败」，UI 要如实报「成功几个、失败几个」，并且只把真正删掉的
 * 那些从选中集合里摘掉。
 */
const SectionBulkDeleteAction = ({
	sectionIds,
	onDeleted,
}: {
	sectionIds: number[];
	onDeleted: (ids: number[]) => void;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [confirmOpen, setConfirmOpen] = useState(false);

	const mutation = useMutation({
		mutationFn: async () => {
			const results = await Promise.allSettled(
				sectionIds.map((section_id) => deleteSection({ section_id })),
			);
			const deleted = sectionIds.filter(
				(_, index) => results[index].status === 'fulfilled',
			);
			return { deleted, failed: sectionIds.length - deleted.length };
		},
		onSuccess: async ({ deleted, failed }) => {
			onDeleted(deleted);
			setConfirmOpen(false);
			if (failed > 0) {
				toast.error(
					t('selection_delete_partial', {
						success: deleted.length,
						failed,
					}),
				);
			} else {
				toast.success(t('selection_delete_success', { count: deleted.length }));
			}
			await Promise.all(
				['searchMySection', 'searchPublicSection', 'searchMySubscribedSection'].map(
					(key) => queryClient.invalidateQueries({ queryKey: [key] }),
				),
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
							{t('selection_delete_sections_title')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t('selection_delete_sections_description', {
								count: sectionIds.length,
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							disabled={mutation.isPending}
							onClick={(e) => {
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

export default SectionBulkDeleteAction;
