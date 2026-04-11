'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircleIcon, Loader2, RefreshCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SectionProcessStatus } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getSectionDetail, triggerSectionProcess } from '@/service/section';

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

	const isQueued =
		section?.process_task?.status === SectionProcessStatus.WAIT_TO;
	const isProcessing =
		section?.process_task?.status === SectionProcessStatus.PROCESSING;
	const isRunning = isQueued || isProcessing;
	const needsImageEngine = Boolean(section?.auto_illustration);
	const needsPodcastEngine = Boolean(section?.auto_podcast);
	const canTrigger =
		Boolean(mainUserInfo?.default_user_file_system) &&
		Boolean(selectedModelId) &&
		(!needsImageEngine || Boolean(selectedImageEngineId)) &&
		(!needsPodcastEngine || Boolean(selectedPodcastEngineId)) &&
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
				{iconOnly ? <span className='sr-only'>{buttonLabel}</span> : buttonLabel}
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
						<div className='space-y-3 pt-2'>
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
						</div>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							disabled={mutation.isPending || !canTrigger}
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
