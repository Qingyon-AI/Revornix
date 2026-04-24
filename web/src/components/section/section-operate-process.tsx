'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	AlertCircleIcon,
	Loader2,
	Play,
	RefreshCcw,
	Square,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SectionProcessStatus } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import {
	cancelSectionProcess,
	getSectionDetail,
	triggerSectionProcess,
} from '@/service/section';

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
import AIModelSelect from '@/components/ai/model-select';
import EngineSelect from '@/components/ai/engine-select';
import { EngineCategory } from '@/enums/engine';

const SectionOperateProcess = ({
	section_id,
	className,
	onTriggerClick,
	iconOnly = false,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
	iconOnly?: boolean;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [selectedModelId, setSelectedModelId] = useState<number | null>(
		mainUserInfo?.default_document_reader_model_id ?? null,
	);
	const [selectedImageEngineId, setSelectedImageEngineId] = useState<number | null>(
		mainUserInfo?.default_image_generate_engine_id ?? null,
	);
	const [selectedPodcastEngineId, setSelectedPodcastEngineId] = useState<number | null>(
		mainUserInfo?.default_podcast_user_engine_id ?? null,
	);

	useEffect(() => {
		setSelectedModelId(mainUserInfo?.default_document_reader_model_id ?? null);
	}, [mainUserInfo?.default_document_reader_model_id]);

	useEffect(() => {
		setSelectedImageEngineId(
			mainUserInfo?.default_image_generate_engine_id ?? null,
		);
	}, [mainUserInfo?.default_image_generate_engine_id]);

	useEffect(() => {
		setSelectedPodcastEngineId(
			mainUserInfo?.default_podcast_user_engine_id ?? null,
		);
	}, [mainUserInfo?.default_podcast_user_engine_id]);

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: () => getSectionDetail({ section_id }),
	});

	const mutation = useMutation({
		mutationFn: () =>
			triggerSectionProcess({
				section_id,
				model_id: selectedModelId ?? undefined,
				image_engine_id: selectedImageEngineId ?? undefined,
				podcast_engine_id: selectedPodcastEngineId ?? undefined,
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

	const cancelMutation = useMutation({
		mutationFn: () => cancelSectionProcess({ section_id }),
		onSuccess() {
			toast.success(t('cancel'));
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section_id],
			});
			queryClient.invalidateQueries({
				queryKey: ['searchSectionDocument', section_id],
			});
		},
		onError(error) {
			toast.error(error.message || t('something_wrong'));
		},
	});

	const isQueued =
		section?.process_task?.status === SectionProcessStatus.WAIT_TO;
	const isProcessing =
		section?.process_task?.status === SectionProcessStatus.PROCESSING;
	const isSuccess =
		section?.process_task?.status === SectionProcessStatus.SUCCESS;
	const isFailed =
		section?.process_task?.status === SectionProcessStatus.FAILED;
	const isRunning = isQueued || isProcessing;
	const hasSourceMaterial =
		Boolean(section?.md_file_name) || (section?.documents_count ?? 0) > 0;
	const needsImageEngine = Boolean(section?.auto_illustration);
	const needsPodcastEngine = Boolean(section?.auto_podcast);
	const canSubmitTrigger =
		hasSourceMaterial &&
		Boolean(mainUserInfo?.default_user_file_system) &&
		Boolean(selectedModelId) &&
		(!needsImageEngine || Boolean(selectedImageEngineId)) &&
		(!needsPodcastEngine || Boolean(selectedPodcastEngineId)) &&
		!isRunning;
	const isStopping = cancelMutation.isPending;
	const canOpenConfirm =
		hasSourceMaterial && !isRunning && !mutation.isPending && !isStopping;
	const actionLabel = isRunning
		? t('section_process_action_cancel')
		: isSuccess
			? t('section_process_action_reprocess')
			: isFailed
				? t('section_process_action_retry')
				: t('section_process_action_start');
	const dialogTitle = isSuccess
		? t('section_process_confirm_reprocess_title')
		: isFailed
			? t('section_process_confirm_retry_title')
			: t('section_process_confirm_start_title');
	const dialogDescription = isSuccess
		? t('section_process_confirm_reprocess_description')
		: isFailed
			? t('section_process_confirm_retry_description')
			: t('section_process_confirm_start_description');
	const requirementMessages = [
		!hasSourceMaterial ? t('section_process_requirement_source') : null,
		!mainUserInfo?.default_user_file_system
			? t('section_process_requirement_file_system')
			: null,
		!selectedModelId ? t('section_process_requirement_model') : null,
		needsImageEngine && !selectedImageEngineId
			? t('section_process_requirement_image_engine')
			: null,
		needsPodcastEngine && !selectedPodcastEngineId
			? t('section_process_requirement_podcast_engine')
			: null,
	].filter(Boolean);
	const buttonTitle = !hasSourceMaterial
		? t('section_process_disabled_no_source')
		: isRunning
			? t('section_process_action_cancel')
			: actionLabel;
	const statusHint = isQueued
		? t('section_process_status_waiting_hint')
		: isProcessing
			? t('section_process_status_processing_hint')
			: isSuccess
				? t('section_process_status_success_hint')
				: isFailed
					? t('section_process_status_failed_hint')
					: t('section_process_status_idle_hint');
	const buttonIcon = mutation.isPending || isProcessing || isStopping ? (
		<Loader2 className='animate-spin' />
	) : isRunning ? (
		<Square />
	) : isSuccess || isFailed ? (
		<RefreshCcw />
	) : (
		<Play />
	);

	return (
		<>
			<Button
				title={buttonTitle}
				variant='ghost'
				className={cn(
					'w-full flex-1 text-xs',
					isRunning
						? 'text-destructive hover:text-destructive'
						: isFailed
							? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300'
							: null,
					className,
				)}
				disabled={isRunning ? isStopping : !canOpenConfirm}
				onClick={() => {
					if (isRunning) {
						cancelMutation.mutate();
						return;
					}
					setConfirmOpen(true);
				}}>
				{buttonIcon}
				{iconOnly ? (
					<span className='sr-only'>{actionLabel}</span>
				) : isRunning ? (
					actionLabel
				) : (
					actionLabel
				)}
			</Button>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className='mb-2 flex flex-row items-center gap-2'>
							<div className='mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 sm:mx-0'>
								<AlertCircleIcon className='size-4 text-destructive' />
							</div>
							{dialogTitle}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{dialogDescription}
						</AlertDialogDescription>
						<div className='space-y-3 pt-2'>
							<div className='rounded-xl border border-border/60 bg-muted/35 px-3 py-2 text-sm text-muted-foreground'>
								{statusHint}
							</div>
							<div>
								<p className='mb-1 text-sm text-muted-foreground'>{t('use_model')}</p>
								<AIModelSelect
									value={selectedModelId}
									onChange={setSelectedModelId}
									className='w-full'
									placeholder={t('setting_default_model_choose')}
								/>
							</div>
							{needsImageEngine ? (
								<div>
									<p className='mb-1 text-sm text-muted-foreground'>{t('setting_default_engine')}</p>
									<EngineSelect
										category={EngineCategory.IMAGE_GENERATE}
										value={selectedImageEngineId}
										onChange={setSelectedImageEngineId}
										className='w-full'
										placeholder={t('setting_default_engine_choose')}
									/>
								</div>
							) : null}
							{needsPodcastEngine ? (
								<div>
									<p className='mb-1 text-sm text-muted-foreground'>{t('setting_default_engine')}</p>
									<EngineSelect
										category={EngineCategory.TTS}
										value={selectedPodcastEngineId}
										onChange={setSelectedPodcastEngineId}
										className='w-full'
										placeholder={t('setting_default_engine_choose')}
									/>
								</div>
							) : null}
							{requirementMessages.length > 0 ? (
								<div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300'>
									{requirementMessages.join(' ')}
								</div>
							) : null}
						</div>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							disabled={mutation.isPending || !canSubmitTrigger}
							onClick={() => mutation.mutate()}>
							{actionLabel}
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
