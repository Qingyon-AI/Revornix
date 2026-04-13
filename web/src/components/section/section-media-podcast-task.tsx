'use client';

import type { ReactNode } from 'react';

import { AudioLines, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionPodcastStatus } from '@/enums/section';
import type { SectionDetailWithPpt } from '@/service/section';

import AudioPlayer from '../ui/audio-player';
import AudioStatusCard from '../ui/audio-status-card';
import { Button } from '../ui/button';
import SidebarTaskNode from '../ui/sidebar-task-node';

type SectionMediaPodcastTaskProps = {
	section: SectionDetailWithPpt;
	isOwner: boolean;
	ownershipResolved: boolean;
	canGeneratePodcast: boolean;
	hasPendingAutoPodcastFlow: boolean;
	podcastHint?: ReactNode;
	podcastStale: boolean;
	cover: string;
	isGeneratePending: boolean;
	onOpenDialog: () => void;
};

const SectionMediaPodcastTask = ({
	section,
	isOwner,
	ownershipResolved,
	canGeneratePodcast,
	hasPendingAutoPodcastFlow,
	podcastHint,
	podcastStale,
	cover,
	isGeneratePending,
	onOpenDialog,
}: SectionMediaPodcastTaskProps) => {
	const t = useTranslations();

	if (hasPendingAutoPodcastFlow) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_todo')}
				title={t('section_podcast_wait_to')}
				description={t('section_podcast_wait_to_description')}
				tone='warning'
				variant='plain'
			/>
		);
	}

	if (ownershipResolved && !isOwner && !section.podcast_task) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_todo')}
				title={t('section_podcast_user_unable')}
				description={t('section_podcast_placeholder_description')}
				tone='default'
				variant='plain'
			/>
		);
	}

	if (isOwner && !section.podcast_task) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_todo')}
				title={t('section_podcast_unset')}
				description={t('section_podcast_placeholder_description')}
				actionLabel={t('section_podcast_generate')}
				onAction={onOpenDialog}
				actionDisabled={false}
				actionLoading={isGeneratePending}
				tone={canGeneratePodcast ? 'warning' : 'danger'}
				variant='plain'
				hint={podcastHint}
			/>
		);
	}

	if (section.podcast_task?.status === SectionPodcastStatus.GENERATING) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_doing')}
				title={t('section_podcast_processing')}
				description={t('section_podcast_processing_description')}
				icon={Loader2}
				tone='default'
				actionLoading
				variant='plain'
				spinning
			/>
		);
	}

	if (section.podcast_task?.status === SectionPodcastStatus.WAIT_TO) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_todo')}
				title={t('section_podcast_wait_to')}
				description={t('section_podcast_wait_to_description')}
				tone='warning'
				variant='plain'
			/>
		);
	}

	if (
		section.podcast_task?.status === SectionPodcastStatus.SUCCESS &&
		section.podcast_task.podcast_file_name
	) {
		return (
			<SidebarTaskNode
				icon={AudioLines}
				status={
					podcastStale
						? t('document_status_stale')
						: t('document_podcast_status_success')
				}
				title={t('section_podcast_ready')}
				description={t('section_podcast_placeholder_description')}
				tone={podcastStale ? 'warning' : 'success'}
				hint={podcastHint}
				action={
					isOwner ? (
						<Button
							variant='outline'
							className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
							onClick={onOpenDialog}
							disabled={false}>
							{t('section_podcast_regenerate')}
						</Button>
					) : undefined
				}
				result={
					<AudioPlayer
						src={section.podcast_task.podcast_file_name}
						cover={cover}
						title={section.title ?? 'Unkown Title'}
						artist={'AI Generated'}
					/>
				}
			/>
		);
	}

	if (section.podcast_task?.status === SectionPodcastStatus.FAILED) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_failed')}
				title={t('section_podcast_failed')}
				description={t('section_podcast_failed_description')}
				actionLabel={isOwner ? t('section_podcast_regenerate') : undefined}
				onAction={isOwner ? onOpenDialog : undefined}
				actionDisabled={false}
				actionLoading={isGeneratePending}
				tone='danger'
				hint={podcastHint}
				variant='plain'
			/>
		);
	}

	return null;
};

export default SectionMediaPodcastTask;
