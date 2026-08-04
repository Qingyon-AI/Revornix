import type { DocumentDetailResponse } from '@/generated';

type TaskLike = {
	status?: number | null;
	detail?: string | null;
} | null | undefined;

/**
 * The detail a task node recorded for its current status — normally the error
 * message of a failed run. Empty strings are normalised away so callers can use
 * it directly as a "is there anything to show" check.
 */
export const getDocumentTaskDetail = (task: TaskLike): string | undefined => {
	const detail = task?.detail?.trim();
	return detail ? detail : undefined;
};

export const isDocumentTaskPending = (task: TaskLike): boolean => {
	return typeof task?.status === 'number' && task.status < 2;
};

export const shouldPollDocumentDetail = (
	document?: DocumentDetailResponse | null,
): boolean => {
	if (!document) return false;
	return [
		document.process_task,
		document.convert_task,
		document.embedding_task,
		document.summarize_task,
		document.graph_task,
		document.podcast_task,
		document.transcribe_task,
	].some(isDocumentTaskPending);
};
