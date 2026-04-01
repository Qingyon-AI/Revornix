'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircleIcon, Loader2, RefreshCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SectionProcessStatus } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getSectionDetail, triggerSectionProcess } from '@/service/section';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';

import { Button } from '../ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../ui/alert-dialog';

const SectionOperateProcess = ({
	section_id,
	className,
	onTriggerClick,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const { documentReaderModel } = useDefaultResourceAccess();
	const [confirmOpen, setConfirmOpen] = useState(false);

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: () => getSectionDetail({ section_id }),
	});

	const mutation = useMutation({
		mutationFn: () =>
			triggerSectionProcess({
				section_id,
			}),
		onSuccess() {
			toast.success(t('section_process_manual_trigger_success'));
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section_id],
			});
			queryClient.invalidateQueries({
				queryKey: ['searchSectionDocument', section_id],
			});
			onTriggerClick?.();
		},
		onError(error) {
			toast.error(error.message || t('section_process_manual_trigger_failed'));
		},
	});

	const isQueued =
		section?.process_task?.status === SectionProcessStatus.WAIT_TO;
	const isProcessing =
		section?.process_task?.status === SectionProcessStatus.PROCESSING;
	const isRunning = isQueued || isProcessing;
	const canTrigger =
		Boolean(mainUserInfo?.default_user_file_system) &&
		documentReaderModel.accessible &&
		!isRunning;
	const buttonLabel = mutation.isPending
		? t('section_process_status_doing')
		: isQueued
			? t('section_process_status_todo')
			: isProcessing
				? t('section_process_status_doing')
				: t('section_process_manual_trigger');

	return (
		<>
			<Button
				title={t('section_process_manual_trigger')}
				variant='ghost'
				className={cn('w-full flex-1 text-xs', className)}
				disabled={!canTrigger || mutation.isPending}
				onClick={() => setConfirmOpen(true)}>
				{mutation.isPending || isProcessing ? (
					<Loader2 className='animate-spin' />
				) : (
					<RefreshCcw />
				)}
				{buttonLabel}
			</Button>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className='mb-2 flex flex-row items-center gap-2'>
							<div className='mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 sm:mx-0'>
								<AlertCircleIcon className='size-4 text-destructive' />
							</div>
							{t('section_process_confirm_restart_title')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t('section_process_confirm_restart_description')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							disabled={mutation.isPending}
							onClick={() => mutation.mutate()}>
							{t('confirm')}
							{mutation.isPending && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default SectionOperateProcess;
