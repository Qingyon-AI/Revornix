import {
	SectionProcessStatus,
	SectionProcessTriggerType,
} from '@/enums/section';

export const getSectionAutomationWarnings = ({
	autoPodcast,
	autoIllustration,
	hasPodcastEngine,
	hasImageEngine,
}: {
	autoPodcast: boolean;
	autoIllustration: boolean;
	hasPodcastEngine: boolean;
	hasImageEngine: boolean;
}) => {
	return {
		missingPodcastEngine: autoPodcast && !hasPodcastEngine,
		missingIllustrationEngine: autoIllustration && !hasImageEngine,
	};
};

type SectionAutomationState = {
	md_file_name?: string | null;
	process_task?: {
		status?: number | null;
	} | null;
	process_task_trigger_type?: number | null;
};

export const isScheduledSectionWaitingForTrigger = (
	section?: SectionAutomationState | null,
) => {
	return Boolean(
		section &&
			!section.md_file_name &&
			section.process_task?.status === SectionProcessStatus.WAIT_TO &&
			section.process_task_trigger_type ===
				SectionProcessTriggerType.SCHEDULER,
	);
};
