'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SectionProcessStatus, UserSectionRole } from '@/enums/section';
import { EngineCategory } from '@/enums/engine';
import { getQueryClient } from '@/lib/get-query-client';
import { getSectionCoverSrc } from '@/lib/section-cover';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { useUserContext } from '@/provider/user-provider';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';
import EngineSelect from '@/components/ai/engine-select';
import AIModelSelect from '@/components/ai/model-select';
import {
	generateSectionPodcast,
	generateSectionPpt,
	getMineUserRoleAndAuthority,
	getSectionDetail,
} from '@/service/section';

import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import SectionMediaPodcastTask from './section-media-podcast-task';
import SectionMediaPptTask from './section-media-ppt-task';

const fallbackCover =
	'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png';

const SidebarTaskList = ({ items }: { items: ReactElement[] }) => (
	<div className='space-y-5'>
		{items.map((item, index) => (
			<div key={index} className='space-y-5'>
				{index > 0 ? <Separator className='bg-border/50' /> : null}
				{item}
			</div>
		))}
	</div>
);

const SectionMedia = ({
	section_id,
}: {
	section_id: number;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
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

	if (isPending && !section) {
		return (
			<div className='flex items-stretch gap-4 py-2'>
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

	const showPodcastTask =
		hasPendingAutoPodcastFlow ||
		Boolean(section.podcast_task) ||
		ownershipResolved;
	const showPptTask = Boolean(section.ppt_preview) || ownershipResolved;
	const taskItems: ReactElement[] = [];

	if (showPodcastTask) {
		taskItems.push(
			<SectionMediaPodcastTask
				key='podcast'
				section={section}
				isOwner={isOwner}
				ownershipResolved={ownershipResolved}
				canGeneratePodcast={canGeneratePodcast}
				hasPendingAutoPodcastFlow={hasPendingAutoPodcastFlow}
				podcastHint={podcastHint}
				podcastStale={freshnessState.podcastStale}
				cover={cover}
				isGeneratePending={mutateGeneratePodcast.isPending}
				onOpenDialog={() => setIsPodcastDialogOpen(true)}
			/>,
		);
	}

	if (showPptTask) {
		taskItems.push(
			<SectionMediaPptTask
				key='ppt'
				section={section}
				isOwner={isOwner}
				ownershipResolved={ownershipResolved}
				canGeneratePpt={canGeneratePpt}
				pptHint={pptHint}
				pptStale={freshnessState.pptStale}
				onOpenDialog={() => setIsPptDialogOpen(true)}
			/>,
		);
	}

	const pptDialogActionLabel = section.ppt_preview
		? t('section_ppt_regenerate')
		: t('section_ppt_generate');

	return (
		<div className='space-y-4'>
			{taskItems.length > 0 ? <SidebarTaskList items={taskItems} /> : null}

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
				confirmDisabled={
					!selectedPptModelId || !selectedPptImageEngineId || !section.md_file_name
				}
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
