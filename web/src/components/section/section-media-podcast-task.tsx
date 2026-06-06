'use client';

import type { ReactNode } from 'react';

import { AudioLines, Hourglass, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionPodcastStatus } from '@/enums/section';
import type { SectionDetailWithPpt } from '@/service/section';

import AudioPlayer from '../ui/audio-player';
import { Button } from '../ui/button';
import SidebarTaskNode from '../ui/sidebar-task-node';

type SectionMediaPodcastTaskProps = {
	section: SectionDetailWithPpt;
	isCreator: boolean;
	creatorStatusResolved: boolean;
	canGeneratePodcast: boolean;
	hasPendingAutoPodcastFlow: boolean;
	podcastHint?: ReactNode;
	podcastStale: boolean;
	cover: string;
	isGeneratePending: boolean;
	isCancelPending: boolean;
	onOpenDialog: () => void;
	onCancel: () => void;
};

const SectionMediaPodcastTask = ({
	section,
	isCreator,
	creatorStatusResolved,
	canGeneratePodcast,
	hasPendingAutoPodcastFlow,
	podcastHint,
	podcastStale,
	cover,
	isGeneratePending,
	isCancelPending,
	onOpenDialog,
	onCancel,
}: SectionMediaPodcastTaskProps) => {
	const t = useTranslations();
	const renderAction = (
		label: string,
		onClick: () => void,
		loading = false,
	) => (
		<Button
			variant='outline'
			className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
			onClick={onClick}
			disabled={loading}>
			{loading ? <Loader2 className='mr-1.5 size-3.5 animate-spin' /> : null}
			{label}
		</Button>
	);

	if (hasPendingAutoPodcastFlow) {
		return (
			<SidebarTaskNode
				status={t('document_podcast_status_todo')}
				title={t('section_podcast_wait_to')}
				description={t('section_podcast_wait_to_description')}
				icon={Hourglass}
				tone='warning'
			/>
		);
	}

	if (creatorStatusResolved && !isCreator && !section.podcast_task) {
		return (
			<SidebarTaskNode
				icon={AudioLines}
				status={t('document_podcast_status_todo')}
				title={t('section_podcast_user_unable')}
				description={t('section_podcast_placeholder_description')}
				tone='default'
			/>
		);
	}

	if (isCreator && !section.podcast_task) {
		return (
			<SidebarTaskNode
				icon={AudioLines}
				status={t('document_podcast_status_todo')}
				title={t('section_podcast_unset')}
				description={t('section_podcast_placeholder_description')}
				tone={canGeneratePodcast ? 'warning' : 'danger'}
				hint={podcastHint}
				action={renderAction(
					t('section_podcast_generate'),
					onOpenDialog,
					isGeneratePending,
				)}
			/>
		);
	}

	if (section.podcast_task?.status === SectionPodcastStatus.GENERATING) {
		return (
			<SidebarTaskNode
				status={t('document_podcast_status_doing')}
				title={t('section_podcast_processing')}
				description={t('section_podcast_processing_description')}
				icon={Loader2}
				iconClassName='animate-spin'
				tone='default'
				action={renderAction(t('cancel'), onCancel, isCancelPending)}
			/>
		);
	}

	if (section.podcast_task?.status === SectionPodcastStatus.WAIT_TO) {
		return (
			<SidebarTaskNode
				status={t('document_podcast_status_todo')}
				title={t('section_podcast_wait_to')}
				description={t('section_podcast_wait_to_description')}
				icon={Hourglass}
				tone='warning'
				action={renderAction(t('cancel'), onCancel, isCancelPending)}
			/>
		);
	}

	if (section.podcast_task?.status === SectionPodcastStatus.CANCELLED) {
		return (
			<SidebarTaskNode
				icon={AudioLines}
				status={t('cancel')}
				title={t('section_podcast_unset')}
				description={t('section_podcast_placeholder_description')}
				tone='warning'
				hint={podcastHint}
				action={
					isCreator
						? renderAction(
								t('section_podcast_generate'),
								onOpenDialog,
								isGeneratePending,
							)
						: undefined
				}
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
					isCreator ? (
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
						scriptUrl={section.podcast_task.podcast_script_file_name ?? undefined}
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
			<SidebarTaskNode
				icon={AudioLines}
				status={t('document_podcast_status_failed')}
				title={t('section_podcast_failed')}
				description={t('section_podcast_failed_description')}
				tone='danger'
				hint={podcastHint}
				action={
					isCreator
						? renderAction(
								t('section_podcast_regenerate'),
								onOpenDialog,
								isGeneratePending,
							)
						: undefined
				}
			/>
		);
	}

	return null;
};

export default SectionMediaPodcastTask;
