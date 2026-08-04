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
 * 批量删除专栏。接口收 id 数组，一次请求即原子 —— 和文档侧同一种可靠性，不会出现
 * 「删了一半」的中间态。
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
		mutationFn: () => deleteSection({ section_ids: sectionIds }),
		onSuccess: async () => {
			const count = sectionIds.length;
			onDeleted(sectionIds);
			setConfirmOpen(false);
			toast.success(t('selection_delete_success', { count }));
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
