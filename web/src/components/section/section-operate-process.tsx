'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SectionProcessStatus } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getSectionDetail, triggerSectionProcess } from '@/service/section';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';

import { Button } from '../ui/button';

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
		<Button
			title={t('section_process_manual_trigger')}
			variant='ghost'
			className={cn('w-full flex-1 text-xs', className)}
			disabled={!canTrigger || mutation.isPending}
			onClick={() => mutation.mutate()}>
			{mutation.isPending || isProcessing ? (
				<Loader2 className='animate-spin' />
			) : (
				<RefreshCcw />
			)}
			{buttonLabel}
		</Button>
	);
};

export default SectionOperateProcess;
