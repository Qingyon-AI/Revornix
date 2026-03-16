import type { DocumentDetailResponse } from '@/generated';

type TaskLike = {
	status?: number | null;
} | null | undefined;

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
