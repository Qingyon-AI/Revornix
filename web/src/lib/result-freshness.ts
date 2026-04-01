import type { DocumentDetailResponse, SectionInfo } from '@/generated';

import {
	DocumentGraphStatus,
	DocumentPodcastStatus,
	DocumentProcessStatus,
	DocumentSummarizeStatus,
} from '@/enums/document';
import {
	SectionPodcastStatus,
	SectionProcessStatus,
	SectionProcessTriggerType,
} from '@/enums/section';
import { toDate } from '@/lib/time';

type TimedTask = {
	status?: number | null;
	create_time?: Date | string | null;
	update_time?: Date | string | null;
} | null | undefined;

const getTaskTime = (task: TimedTask): Date | null => {
	return toDate(task?.update_time ?? task?.create_time);
};

const hasStatus = (task: TimedTask, status: number): boolean => {
	return typeof task?.status === 'number' && task.status === status;
};

const isNewerThan = (left: Date | null, right: Date | null): boolean => {
	if (!left || !right) return false;
	return left.getTime() > right.getTime();
};

const hasNewerNonSuccessTask = (
	baseTime: Date | null,
	task: TimedTask,
	successStatus: number,
): boolean => {
	if (!baseTime || typeof task?.status !== 'number') return false;
	if (task.status === successStatus) return false;
	return isNewerThan(getTaskTime(task), baseTime);
};

const hasNewerSuccessTask = (
	baseTime: Date | null,
	task: TimedTask,
	successStatus: number,
): boolean => {
	if (!baseTime || !hasStatus(task, successStatus)) return false;
	return isNewerThan(getTaskTime(task), baseTime);
};

export const getDocumentFreshnessState = (
	document?: DocumentDetailResponse | null,
) => {
	const summaryTime = hasStatus(
		document?.summarize_task,
		DocumentSummarizeStatus.SUCCESS,
	)
		? getTaskTime(document?.summarize_task)
		: null;
	const graphTime = hasStatus(document?.graph_task, DocumentGraphStatus.SUCCESS)
		? getTaskTime(document?.graph_task)
		: null;
	const podcastTime = hasStatus(
		document?.podcast_task,
		DocumentPodcastStatus.SUCCESS,
	)
		? getTaskTime(document?.podcast_task)
		: null;

	const summaryStale = hasNewerNonSuccessTask(
		summaryTime,
		document?.process_task,
		DocumentProcessStatus.SUCCESS,
	);
	const graphStale = hasNewerNonSuccessTask(
		graphTime,
		document?.process_task,
		DocumentProcessStatus.SUCCESS,
	);
	const podcastStale =
		hasNewerNonSuccessTask(
			podcastTime,
			document?.process_task,
			DocumentProcessStatus.SUCCESS,
		) ||
		hasNewerSuccessTask(
			podcastTime,
			document?.summarize_task,
			DocumentSummarizeStatus.SUCCESS,
		) ||
		hasNewerSuccessTask(
			podcastTime,
			document?.graph_task,
			DocumentGraphStatus.SUCCESS,
		);

	return {
		summaryStale,
		graphStale,
		podcastStale,
		hasAnyStaleResult: summaryStale || graphStale || podcastStale,
	};
};

export const getSectionFreshnessState = (section?: SectionInfo | null) => {
	const pendingIntegrationCount =
		(section?.document_integration?.wait_to_count ?? 0) +
		(section?.document_integration?.supplementing_count ?? 0) +
		(section?.document_integration?.failed_count ?? 0);
	const processStatus = section?.process_task?.status;
	const hasQueuedRefresh =
		processStatus === SectionProcessStatus.WAIT_TO &&
		section?.process_task_trigger_type !== SectionProcessTriggerType.SCHEDULER;
	const hasProcessingRefresh =
		processStatus === SectionProcessStatus.PROCESSING ||
		processStatus === SectionProcessStatus.FAILED;

	const markdownStale =
		Boolean(section?.md_file_name) &&
		(Boolean(pendingIntegrationCount) ||
			hasQueuedRefresh ||
			hasProcessingRefresh);
	const graphStale = Boolean(section?.graph_stale);

	const podcastTime = hasStatus(
		section?.podcast_task,
		SectionPodcastStatus.SUCCESS,
	)
		? getTaskTime(section?.podcast_task)
		: null;

	const podcastStale =
		Boolean(podcastTime) &&
		(markdownStale ||
			(!section?.auto_podcast &&
				hasNewerSuccessTask(
					podcastTime,
					section?.process_task,
					SectionProcessStatus.SUCCESS,
				)));
	return {
		markdownStale,
		graphStale,
		podcastStale,
		hasAnyStaleResult: markdownStale || graphStale || podcastStale,
	};
};
