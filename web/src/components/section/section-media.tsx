'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SectionPodcastStatus, UserSectionRole } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { replacePath } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import {
	generateSectionPodcast,
	getMineUserRoleAndAuthority,
	getSectionDetail,
} from '@/service/section';

import AudioPlayer from '../ui/audio-player';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import AudioStatusCard from '../ui/audio-status-card';

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

	const { data: section, isPending } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: () => getSectionDetail({ section_id }),
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
			}),
		onSuccess() {
			toast.success(t('section_podcast_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section_id],
			});
		},
		onError() {
			toast.error(t('section_podcast_generate_task_submitted_failed'));
		},
	});

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
	const canGeneratePodcast = Boolean(mainUserInfo?.default_podcast_user_engine_id);
	const cover =
		section.cover && (creatorId !== undefined || mainUserInfo?.id !== undefined)
			? replacePath(section.cover, creatorId ?? mainUserInfo!.id)
			: fallbackCover;

	return (
		<div className='space-y-4'>
			{ownershipResolved && !isOwner && !section.podcast_task ? (
				<AudioStatusCard
					badge={t('document_podcast_status_todo')}
					title={t('section_podcast_user_unable')}
					description={t('section_podcast_placeholder_description')}
					tone='default'
					className={surfaceCardClassName}
				/>
			) : null}

			{isOwner && !section.podcast_task ? (
				<AudioStatusCard
					badge={t('document_podcast_status_todo')}
					title={t('section_podcast_unset')}
					description={t('section_podcast_placeholder_description')}
					actionLabel={t('section_podcast_generate')}
					onAction={() => mutateGeneratePodcast.mutate()}
					actionDisabled={!canGeneratePodcast}
					actionLoading={mutateGeneratePodcast.isPending}
					tone={canGeneratePodcast ? 'warning' : 'danger'}
					className={surfaceCardClassName}
					hint={
						!canGeneratePodcast
							? t('section_form_auto_podcast_engine_unset')
							: undefined
					}
				/>
			) : null}

			{section.podcast_task?.status === SectionPodcastStatus.GENERATING ? (
				<AudioStatusCard
					badge={t('document_podcast_status_doing')}
					title={t('section_podcast_processing')}
					description={t('section_podcast_processing_description')}
					tone='default'
					actionLoading
					className={surfaceCardClassName}
				/>
			) : null}

			{section.podcast_task?.status === SectionPodcastStatus.SUCCESS &&
			section.podcast_task.podcast_file_name ? (
				<Card
					className={`gap-0 rounded-[30px] border border-border/60 bg-card/85 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur ${surfaceCardClassName ?? ''}`}>
					<AudioPlayer
						src={section.podcast_task.podcast_file_name}
						cover={cover}
						title={section.title ?? 'Unkown Title'}
						artist={'AI Generated'}
					/>
					{isOwner ? (
						<div className='mt-4 border-t border-border/60 pt-4'>
							{!canGeneratePodcast ? (
								<div className='mb-3 rounded-[18px] border border-amber-500/15 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-200'>
									{t('section_form_auto_podcast_engine_unset')}
								</div>
							) : null}
							<div className='flex justify-end'>
								<Button
									variant='outline'
									className='h-10 rounded-full border-border/70 bg-background/65 px-4 text-sm shadow-none hover:bg-background'
									onClick={() => mutateGeneratePodcast.mutate()}
									disabled={
										!canGeneratePodcast ||
										mutateGeneratePodcast.isPending
									}>
									{mutateGeneratePodcast.isPending ? (
										<Loader2 className='size-4 animate-spin' />
									) : null}
									{t('section_podcast_regenerate')}
								</Button>
							</div>
						</div>
					) : null}
				</Card>
			) : null}

			{section.podcast_task?.status === SectionPodcastStatus.FAILED ? (
				<AudioStatusCard
					badge={t('document_podcast_status_failed')}
					title={t('section_podcast_failed')}
					description={t('section_podcast_failed_description')}
					actionLabel={isOwner ? t('section_podcast_regenerate') : undefined}
					onAction={isOwner ? () => mutateGeneratePodcast.mutate() : undefined}
					actionDisabled={!isOwner || !canGeneratePodcast}
					actionLoading={mutateGeneratePodcast.isPending}
					tone='danger'
					hint={
						isOwner && !canGeneratePodcast
							? t('section_form_auto_podcast_engine_unset')
							: undefined
					}
					className={surfaceCardClassName}
				/>
			) : null}
		</div>
	);
};

export default SectionMedia;
