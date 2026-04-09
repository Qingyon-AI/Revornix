'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	AudioLines,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Presentation,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
	SectionPodcastStatus,
	SectionProcessStatus,
	UserSectionRole,
} from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { useUserContext } from '@/provider/user-provider';
import {
	generateSectionPpt,
	generateSectionPodcast,
	getMineUserRoleAndAuthority,
	getSectionDetail,
} from '@/service/section';
import { getSectionCoverSrc } from '@/lib/section-cover';

import AudioPlayer from '../ui/audio-player';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import ImagePreview from '../ui/image-preview';
import { Skeleton } from '../ui/skeleton';
import AudioStatusCard from '../ui/audio-status-card';
import TaskStateCard from '../ui/task-state-card';
import EngineSelect from '@/components/ai/engine-select';
import AIModelSelect from '@/components/ai/model-select';
import { EngineCategory } from '@/enums/engine';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';

const fallbackCover =
	'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png';

const SectionMedia = ({
	section_id,
	surfaceCardClassName,
}: {
	section_id: number;
	surfaceCardClassName?: string;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const [pptSlideIndex, setPptSlideIndex] = useState(0);
	const [selectedPodcastEngineId, setSelectedPodcastEngineId] = useState<number | null>(
		mainUserInfo?.default_podcast_user_engine_id ?? null,
	);
	const [selectedPptModelId, setSelectedPptModelId] = useState<number | null>(
		mainUserInfo?.default_document_reader_model_id ?? null,
	);
	const [selectedPptImageEngineId, setSelectedPptImageEngineId] = useState<number | null>(
		mainUserInfo?.default_image_generate_engine_id ?? null,
	);
	const [isPodcastDialogOpen, setIsPodcastDialogOpen] = useState(false);
	const [isPptDialogOpen, setIsPptDialogOpen] = useState(false);

	useEffect(() => {
		setSelectedPodcastEngineId(
			mainUserInfo?.default_podcast_user_engine_id ?? null,
		);
	}, [mainUserInfo?.default_podcast_user_engine_id]);

	useEffect(() => {
		setSelectedPptModelId(mainUserInfo?.default_document_reader_model_id ?? null);
	}, [mainUserInfo?.default_document_reader_model_id]);

	useEffect(() => {
		setSelectedPptImageEngineId(
			mainUserInfo?.default_image_generate_engine_id ?? null,
		);
	}, [mainUserInfo?.default_image_generate_engine_id]);

	const { data: section, isPending } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: () => getSectionDetail({ section_id }),
		refetchInterval: (query) =>
			query.state.data?.ppt_preview?.status === 'processing' ||
			query.state.data?.ppt_preview?.status === 'wait_to'
				? 1500
				: false,
	});
	const {
		data: sectionUserRoleAndAuthority,
		isFetched: isRoleFetched,
		isError: isRoleError,
	} = useQuery({
		queryKey: ['getMineUserRoleAndAuthority', section_id],
		queryFn: () => getMineUserRoleAndAuthority({ section_id }),
		enabled: mainUserInfo?.id !== undefined,
		retry: false,
	});

	const mutateGeneratePodcast = useMutation({
		mutationFn: () =>
			generateSectionPodcast({
				section_id,
				engine_id: selectedPodcastEngineId ?? undefined,
			}),
		onSuccess() {
			setIsPodcastDialogOpen(false);
			toast.success(t('section_podcast_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section_id],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserInfo'],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserComputeLedger'],
			});
		},
		onError() {
			toast.error(t('section_podcast_generate_task_submitted_failed'));
		},
	});
	const mutateGeneratePpt = useMutation({
		mutationFn: () =>
			generateSectionPpt({
				section_id,
				model_id: selectedPptModelId ?? undefined,
				image_engine_id: selectedPptImageEngineId ?? undefined,
			}),
		onSuccess() {
			setIsPptDialogOpen(false);
			toast.success(t('section_ppt_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section_id],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserInfo'],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserComputeLedger'],
			});
		},
		onError() {
			toast.error(t('section_ppt_generate_task_submitted_failed'));
		},
	});
	const pptPreview = section?.ppt_preview;
	const pptSlides = pptPreview?.slides ?? [];
	const readyPptSlides = pptSlides.filter((slide) => Boolean(slide.image_url));
	const displayPptSlides = readyPptSlides.length > 0 ? readyPptSlides : pptSlides;
	const currentPptSlide =
		displayPptSlides.length > 0
			? displayPptSlides[Math.min(pptSlideIndex, displayPptSlides.length - 1)]
			: null;

	useEffect(() => {
		if (displayPptSlides.length === 0) {
			if (pptSlideIndex !== 0) {
				setPptSlideIndex(0);
			}
			return;
		}
		if (pptSlideIndex > displayPptSlides.length - 1) {
			setPptSlideIndex(displayPptSlides.length - 1);
		}
	}, [displayPptSlides.length, pptSlideIndex]);

	if (isPending && !section) {
		return (
			<Card
				className={`gap-0 overflow-hidden py-0 ${
					surfaceCardClassName ??
					'rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur'
				}`}>
				<div className='flex items-stretch gap-4 p-4 sm:p-5'>
					<Skeleton className='size-12 shrink-0 rounded-[18px]' />
					<div className='min-w-0 flex-1 space-y-3'>
						<Skeleton className='h-6 w-20 rounded-full' />
						<div className='space-y-2'>
							<Skeleton className='h-6 w-44 rounded-full' />
							<Skeleton className='h-4 w-full rounded-full' />
							<Skeleton className='h-4 w-4/5 rounded-full' />
						</div>
						<Skeleton className='h-10 w-28 rounded-full' />
					</div>
					<div className='hidden shrink-0 items-end gap-1 self-stretch rounded-[20px] border border-border/50 bg-background/40 px-3 py-3 sm:flex'>
						<Skeleton className='h-3 w-1.5 rounded-full' />
						<Skeleton className='h-6 w-1.5 rounded-full' />
						<Skeleton className='h-9 w-1.5 rounded-full' />
						<Skeleton className='h-5 w-1.5 rounded-full' />
						<Skeleton className='h-8 w-1.5 rounded-full' />
						<Skeleton className='h-4 w-1.5 rounded-full' />
					</div>
				</div>
			</Card>
		);
	}

	if (!section) {
		return null;
	}

	const creatorId = section.creator?.id;
	const isCreatorById =
		creatorId !== undefined && creatorId === mainUserInfo?.id;
	const isOwner =
		isCreatorById ||
		sectionUserRoleAndAuthority?.role === UserSectionRole.CREATOR;
	const ownershipResolved =
		mainUserInfo !== undefined &&
		(isCreatorById || isRoleFetched || isRoleError);
	const canGeneratePodcast = Boolean(selectedPodcastEngineId);
	const canGeneratePpt =
		Boolean(selectedPptModelId) && Boolean(selectedPptImageEngineId);
	const canSubmitPpt = canGeneratePpt && Boolean(section.md_file_name);
	const cover = getSectionCoverSrc(section) ?? fallbackCover;
	const hasPendingAutoPodcastFlow =
		section.auto_podcast &&
		canGeneratePodcast &&
		!section.podcast_task &&
		section.process_task != null &&
		section.process_task.status < SectionProcessStatus.SUCCESS;
	const freshnessState = getSectionFreshnessState(section);
	const podcastHintMessages = [
		freshnessState.podcastStale ? t('section_podcast_stale_hint') : null,
		isOwner && !canGeneratePodcast ? t('section_form_auto_podcast_engine_unset') : null,
	].filter((message): message is string => Boolean(message));
	const podcastHint =
		podcastHintMessages.length > 0 ? (
			<div className='space-y-3'>
				{podcastHintMessages.map((message) => (
					<p key={message}>{message}</p>
				))}
			</div>
		) : undefined;
	const pptHintMessages = [
		freshnessState.pptStale ? t('section_ppt_stale_hint') : null,
		isOwner && !selectedPptModelId ? t('section_ppt_reader_model_unset') : null,
		isOwner && !selectedPptImageEngineId ? t('section_ppt_image_engine_unset') : null,
	].filter((message): message is string => Boolean(message));
	const pptHint =
		pptHintMessages.length > 0 ? (
			<div className='space-y-3'>
				{pptHintMessages.map((message) => (
					<p key={message}>{message}</p>
				))}
			</div>
		) : undefined;
	const pptSettingsAction = null;
	const pptDialogActionLabel = pptPreview
		? t('section_ppt_regenerate')
		: t('section_ppt_generate');

	return (
		<div className='space-y-4'>
			{hasPendingAutoPodcastFlow ? (
				<AudioStatusCard
					badge={t('document_podcast_status_todo')}
					title={t('section_podcast_wait_to')}
					description={t('section_podcast_wait_to_description')}
					tone='warning'
					className={surfaceCardClassName}
				/>
			) : null}

			{ownershipResolved && !isOwner && !section.podcast_task && !hasPendingAutoPodcastFlow ? (
				<AudioStatusCard
					badge={t('document_podcast_status_todo')}
					title={t('section_podcast_user_unable')}
					description={t('section_podcast_placeholder_description')}
					tone='default'
					className={surfaceCardClassName}
				/>
			) : null}

			{isOwner && !section.podcast_task && !hasPendingAutoPodcastFlow ? (
				<AudioStatusCard
					badge={t('document_podcast_status_todo')}
					title={t('section_podcast_unset')}
					description={t('section_podcast_placeholder_description')}
					actionLabel={t('section_podcast_generate')}
					onAction={() => setIsPodcastDialogOpen(true)}
					actionDisabled={false}
					actionLoading={mutateGeneratePodcast.isPending}
					tone={canGeneratePodcast ? 'warning' : 'danger'}
					className={surfaceCardClassName}
					hint={podcastHint}
				/>
			) : null}

			{section.podcast_task?.status === SectionPodcastStatus.GENERATING ? (
				<AudioStatusCard
					badge={t('document_podcast_status_doing')}
					title={t('section_podcast_processing')}
					description={t('section_podcast_processing_description')}
					icon={Loader2}
					tone='default'
					actionLoading
					className={surfaceCardClassName}
					spinning
				/>
			) : null}

			{section.podcast_task?.status === SectionPodcastStatus.WAIT_TO ? (
				<AudioStatusCard
					badge={t('document_podcast_status_todo')}
					title={t('section_podcast_wait_to')}
					description={t('section_podcast_wait_to_description')}
					tone='warning'
					className={surfaceCardClassName}
				/>
			) : null}

			{section.podcast_task?.status === SectionPodcastStatus.SUCCESS &&
			section.podcast_task.podcast_file_name ? (
				<TaskStateCard
					icon={AudioLines}
					badge={
						freshnessState.podcastStale
							? t('document_status_stale')
							: t('document_podcast_status_success')
					}
					title={t('section_podcast_ready')}
					tone={freshnessState.podcastStale ? 'warning' : 'success'}
					className={surfaceCardClassName}
					hint={podcastHint}
					action={
						isOwner ? (
							<Button
								variant='outline'
								className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
								onClick={() => setIsPodcastDialogOpen(true)}
								disabled={false}>
								{t('section_podcast_regenerate')}
							</Button>
						) : undefined
					}>
					<div className='rounded-[20px] border border-border/60 bg-background/40 p-3 sm:p-4'>
						<AudioPlayer
							src={section.podcast_task.podcast_file_name}
							cover={cover}
							title={section.title ?? 'Unkown Title'}
							artist={'AI Generated'}
						/>
					</div>
				</TaskStateCard>
			) : null}

			{section.podcast_task?.status === SectionPodcastStatus.FAILED ? (
				<AudioStatusCard
					badge={t('document_podcast_status_failed')}
					title={t('section_podcast_failed')}
					description={t('section_podcast_failed_description')}
					actionLabel={isOwner ? t('section_podcast_regenerate') : undefined}
					onAction={isOwner ? () => setIsPodcastDialogOpen(true) : undefined}
					actionDisabled={false}
					actionLoading={mutateGeneratePodcast.isPending}
					tone='danger'
					hint={podcastHint}
					className={surfaceCardClassName}
				/>
			) : null}

			{ownershipResolved && !isOwner && !pptPreview ? (
				<TaskStateCard
					icon={Presentation}
					badge={t('section_ppt_status_idle')}
					title={t('section_ppt_user_unable')}
					description={t('section_ppt_placeholder_description')}
					tone='default'
					className={surfaceCardClassName}
				/>
			) : null}

			{isOwner && !pptPreview ? (
				<TaskStateCard
					icon={Presentation}
					badge={t('section_ppt_status_idle')}
					title={t('section_ppt_ready_to_generate')}
					description={t('section_ppt_placeholder_description')}
					tone={canGeneratePpt ? 'warning' : 'danger'}
					hint={pptHint}
					className={surfaceCardClassName}
					action={
						<>
							{pptSettingsAction}
							<Button
								variant='outline'
								className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
								onClick={() => setIsPptDialogOpen(true)}
								disabled={false}>
								{t('section_ppt_generate')}
							</Button>
						</>
					}
				/>
			) : null}

			{pptPreview?.status === 'processing' || pptPreview?.status === 'wait_to' ? (
				<TaskStateCard
					icon={Loader2}
					badge={
						pptPreview?.status === 'wait_to'
							? t('section_ppt_status_idle')
							: t('section_ppt_status_processing')
					}
					title={
						pptPreview?.status === 'wait_to'
							? t('section_ppt_waiting')
							: t('section_ppt_processing')
					}
					description={
						pptPreview?.status === 'wait_to'
							? t('section_ppt_waiting_description')
							: t('section_ppt_processing_description')
					}
					tone='default'
					spinning
					hint={pptHint}
					className={surfaceCardClassName}>
					{currentPptSlide ? (
						<div className='space-y-3'>
							<div className='overflow-hidden rounded-[20px] border border-border/60 bg-background/40'>
								{currentPptSlide.image_url ? (
									<ImagePreview
										src={currentPptSlide.image_url}
										alt={currentPptSlide.title}
										imageClassName='aspect-video w-full object-cover'
									/>
								) : (
									<div className='flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.05),rgba(15,23,42,0.12))] px-6 text-center text-sm leading-7 text-muted-foreground'>
										{t('section_ppt_slide_generating')}
									</div>
								)}
							</div>
							<div className='flex items-center justify-between gap-3'>
								<div className='min-w-0'>
									<p className='truncate text-sm font-semibold text-foreground'>
										{currentPptSlide.title}
									</p>
									<p className='truncate text-xs text-muted-foreground'>
										{t('section_ppt_slide_count', {
											current: Math.min(
												pptSlideIndex + 1,
												displayPptSlides.length,
											),
											total: displayPptSlides.length,
										})}
									</p>
								</div>
							</div>
						</div>
					) : null}
				</TaskStateCard>
			) : null}

			{pptPreview?.status === 'success' ? (
				<TaskStateCard
					icon={Presentation}
					badge={
						freshnessState.pptStale
							? t('document_status_stale')
							: t('section_ppt_status_success')
					}
					title={pptPreview.title || t('section_ppt_preview_title')}
					description={
						pptPreview.subtitle || t('section_ppt_preview_description')
					}
					tone={freshnessState.pptStale ? 'warning' : 'success'}
					hint={pptHint}
					className={surfaceCardClassName}
					action={
						<>
							{pptSettingsAction}
							{pptPreview.pptx_url ? (
							<Button
									asChild
									variant='outline'
									className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'>
									<a
										href={pptPreview.pptx_url}
										target='_blank'
										rel='noreferrer'>
										{t('section_ppt_download')}
									</a>
								</Button>
							) : null}
							{isOwner ? (
								<Button
									variant='outline'
									className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
									onClick={() => setIsPptDialogOpen(true)}
									disabled={false}>
									{t('section_ppt_regenerate')}
								</Button>
							) : null}
						</>
					}>
					{currentPptSlide ? (
						<div className='space-y-3'>
							<div className='overflow-hidden rounded-[20px] border border-border/60 bg-background/40'>
								{currentPptSlide.image_url ? (
									<ImagePreview
										src={currentPptSlide.image_url}
										alt={currentPptSlide.title}
										imageClassName='aspect-video w-full object-cover'
									/>
								) : null}
							</div>
							<div className='flex items-center gap-2'>
								<Button
									type='button'
									size='icon'
									variant='outline'
									className='size-8 rounded-full'
									onClick={() =>
										setPptSlideIndex((current) =>
											Math.max(0, current - 1),
										)
									}
									disabled={pptSlideIndex <= 0}>
									<ChevronLeft className='size-4' />
								</Button>
								<div className='min-w-0 flex-1'>
									<p className='truncate text-sm font-semibold text-foreground'>
										{currentPptSlide.title}
									</p>
									<p className='line-clamp-2 text-xs leading-5 text-muted-foreground'>
										{currentPptSlide.summary}
									</p>
								</div>
								<p className='shrink-0 text-xs text-muted-foreground'>
									{t('section_ppt_slide_count', {
										current: pptSlideIndex + 1,
										total: displayPptSlides.length,
									})}
								</p>
								<Button
									type='button'
									size='icon'
									variant='outline'
									className='size-8 rounded-full'
									onClick={() =>
										setPptSlideIndex((current) =>
											Math.min(displayPptSlides.length - 1, current + 1),
										)
									}
									disabled={pptSlideIndex >= displayPptSlides.length - 1}>
									<ChevronRight className='size-4' />
								</Button>
							</div>
							{displayPptSlides.length > 1 ? (
								<div className='flex flex-wrap gap-2'>
									{displayPptSlides.map((slide, index) => (
										<button
											key={slide.id}
											type='button'
											onClick={() => setPptSlideIndex(index)}
											className={`min-w-0 rounded-full border px-3 py-1 text-xs transition-colors ${
												index === pptSlideIndex
													? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
													: 'border-border/60 bg-background/55 text-muted-foreground hover:bg-background'
											}`}>
											<span className='truncate'>
												{index + 1}. {slide.title}
											</span>
										</button>
									))}
								</div>
							) : null}
						</div>
					) : null}
				</TaskStateCard>
			) : null}

			{pptPreview?.status === 'failed' ? (
				<TaskStateCard
					icon={Presentation}
					badge={t('section_ppt_status_failed')}
					title={t('section_ppt_failed')}
					description={
						pptPreview.error_message || t('section_ppt_failed_description')
					}
					tone='danger'
					hint={pptHint}
					className={surfaceCardClassName}
					action={
						isOwner ? (
							<>
								{pptSettingsAction}
								<Button
									variant='outline'
									className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
								onClick={() => setIsPptDialogOpen(true)}
								disabled={false}>
								{t('section_ppt_regenerate')}
							</Button>
						</>
						) : undefined
					}
				/>
			) : null}
			<ResourceConfirmDialog
				open={isPodcastDialogOpen}
				onOpenChange={setIsPodcastDialogOpen}
				title={t('section_podcast_generate')}
				description={t('resource_dialog_podcast_description')}
				confirmLabel={t('section_podcast_generate')}
				confirmDisabled={!selectedPodcastEngineId}
				confirmLoading={mutateGeneratePodcast.isPending}
				onConfirm={() => {
					mutateGeneratePodcast.mutate();
				}}>
				<div className='space-y-2'>
					<p className='text-sm font-medium text-foreground'>{t('use_engine')}</p>
					<EngineSelect
						category={EngineCategory.TTS}
						value={selectedPodcastEngineId}
						onChange={setSelectedPodcastEngineId}
						className='w-full'
						placeholder={t('setting_default_engine_choose')}
					/>
				</div>
			</ResourceConfirmDialog>
			<ResourceConfirmDialog
				open={isPptDialogOpen}
				onOpenChange={setIsPptDialogOpen}
				title={pptDialogActionLabel}
				description={t('resource_dialog_ppt_description')}
				confirmLabel={pptDialogActionLabel}
				confirmDisabled={!selectedPptModelId || !selectedPptImageEngineId || !section.md_file_name}
				confirmLoading={mutateGeneratePpt.isPending}
				onConfirm={() => {
					mutateGeneratePpt.mutate();
				}}>
				<div className='space-y-4'>
					<div className='space-y-2'>
						<p className='text-sm font-medium text-foreground'>{t('use_model')}</p>
						<AIModelSelect
							value={selectedPptModelId}
							onChange={setSelectedPptModelId}
							className='w-full'
							placeholder={t('setting_default_model_choose')}
						/>
					</div>
					<div className='space-y-2'>
						<p className='text-sm font-medium text-foreground'>{t('use_engine')}</p>
						<EngineSelect
							category={EngineCategory.IMAGE_GENERATE}
							value={selectedPptImageEngineId}
							onChange={setSelectedPptImageEngineId}
							className='w-full'
							placeholder={t('setting_default_engine_choose')}
						/>
					</div>
				</div>
			</ResourceConfirmDialog>
		</div>
	);
};

export default SectionMedia;
