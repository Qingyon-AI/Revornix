'use client';

import { AudioLines, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionPodcastStatus } from '@/enums/section';
import AudioPlayer from '@/components/ui/audio-player';
import AudioStatusCard from '@/components/ui/audio-status-card';
import TaskStateCard from '@/components/ui/task-state-card';

type SectionPodcastSeoCardProps = {
	status?: SectionPodcastStatus | number | null;
	podcastFileName?: string | null;
	title?: string | null;
	cover?: string | null;
	className?: string;
};

const SECTION_PODCAST_FALLBACK_COVER =
	'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png';

const SectionPodcastSeoCard = ({
	status,
	podcastFileName,
	title,
	cover,
	className,
}: SectionPodcastSeoCardProps) => {
	const t = useTranslations();

	if (status == null) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_todo')}
				title={t('section_podcast_unset')}
				description={t('section_podcast_placeholder_description')}
				className={className}
			/>
		);
	}

	if (status === SectionPodcastStatus.GENERATING) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_doing')}
				title={t('section_podcast_processing')}
				description={t('section_podcast_processing_description')}
				icon={Loader2}
				tone='default'
				actionLoading
				className={className}
				spinning
			/>
		);
	}

	if (status === SectionPodcastStatus.WAIT_TO) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_todo')}
				title={t('section_podcast_wait_to')}
				description={t('section_podcast_wait_to_description')}
				tone='warning'
				className={className}
			/>
		);
	}

	if (status === SectionPodcastStatus.SUCCESS && podcastFileName) {
		return (
			<TaskStateCard
				icon={AudioLines}
				badge={t('document_podcast_status_success')}
				title={t('section_podcast_ready')}
				tone='success'
				className={className}>
				<div className='rounded-[20px] border border-border/60 bg-background/40 p-3 sm:p-4'>
					<AudioPlayer
						src={podcastFileName}
						cover={cover ?? SECTION_PODCAST_FALLBACK_COVER}
						title={title ?? 'Unknown Title'}
						artist='AI Generated'
					/>
				</div>
			</TaskStateCard>
		);
	}

	if (status === SectionPodcastStatus.FAILED) {
		return (
			<AudioStatusCard
				badge={t('document_podcast_status_failed')}
				title={t('section_podcast_failed')}
				description={t('section_podcast_failed_description')}
				tone='danger'
				className={className}
			/>
		);
	}

	return (
		<AudioStatusCard
			badge={t('document_podcast_status_todo')}
			title={t('section_podcast_unset')}
			description={t('section_podcast_placeholder_description')}
			className={className}
		/>
	);
};

export default SectionPodcastSeoCard;
