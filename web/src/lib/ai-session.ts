import { Message, SessionItem } from '@/types/ai';
import { mergeChunkCitations, mergeDocumentSources } from '@/lib/ai-sources';

const DEFAULT_SESSION_TITLE = 'New Session';
const LEGACY_TIMESTAMP_TITLE = /^\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/;
const SESSION_TITLE_MAX_LENGTH = 48;
const SESSION_PREVIEW_MAX_LENGTH = 120;

const normalizeText = (value?: string | null) => {
	return (value ?? '').replace(/\s+/g, ' ').trim();
};

const truncateText = (value: string, maxLength: number) => {
	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const getMeaningfulMessages = (messages: Message[]) => {
	return messages.filter((message) => normalizeText(message.content).length > 0);
};

const getFirstPrompt = (messages: Message[]) => {
	return (
		getMeaningfulMessages(messages).find((message) => message.role === 'user') ??
		getMeaningfulMessages(messages)[0]
	);
};

const getLastMessage = (messages: Message[]) => {
	return [...getMeaningfulMessages(messages)].reverse()[0];
};

const getSourceCount = (messages: Message[]) => {
	const documentIds = new Set<number>();

	for (const message of messages) {
		for (const source of message.document_sources ?? []) {
			documentIds.add(source.document_id);
		}
	}

	return documentIds.size;
};

const hydrateMessage = (messageLike: Partial<Message>): Message => {
	const message = messageLike as Message & {
		references?: Message['chunk_citations'];
		document_references?: Message['document_sources'];
	};

	return {
		chat_id: message.chat_id ?? crypto.randomUUID(),
		role: message.role ?? 'assistant',
		content: message.content ?? '',
		images: Array.isArray(message.images) ? message.images : undefined,
		ai_state: message.ai_state,
		ai_workflow: message.ai_workflow,
		tool_results: Array.isArray(message.tool_results) ? message.tool_results : undefined,
		chunk_citations: mergeChunkCitations(
			message.chunk_citations,
			message.references,
		),
		document_sources: mergeDocumentSources(
			message.document_sources,
			message.document_references,
		),
	};
};

export const deriveSessionTitle = (
	messages: Message[],
	fallbackTitle = DEFAULT_SESSION_TITLE,
) => {
	const firstPrompt = getFirstPrompt(messages);
	const promptText = normalizeText(firstPrompt?.content);

	if (promptText) {
		return truncateText(promptText, SESSION_TITLE_MAX_LENGTH);
	}

	return truncateText(normalizeText(fallbackTitle) || DEFAULT_SESSION_TITLE, SESSION_TITLE_MAX_LENGTH);
};

export const deriveSessionPreview = (messages: Message[]) => {
	const lastMessage = getLastMessage(messages);
	return truncateText(normalizeText(lastMessage?.content), SESSION_PREVIEW_MAX_LENGTH);
};

export const hydrateSessionItem = (sessionLike: Partial<SessionItem>): SessionItem => {
	const messages = Array.isArray(sessionLike.messages)
		? sessionLike.messages.map((message) => hydrateMessage(message))
		: [];
	const createdAt = sessionLike.created_at ?? new Date().toISOString();
	const updatedAt = sessionLike.updated_at ?? createdAt;
	const normalizedTitle = normalizeText(sessionLike.title);
	const shouldUseDerivedTitle =
		!normalizedTitle || LEGACY_TIMESTAMP_TITLE.test(normalizedTitle);
	const title =
		messages.length > 0 && shouldUseDerivedTitle
			? deriveSessionTitle(messages, normalizedTitle)
			: truncateText(normalizedTitle || DEFAULT_SESSION_TITLE, SESSION_TITLE_MAX_LENGTH);
	const preview =
		normalizeText(sessionLike.preview) || deriveSessionPreview(messages);
	const lastMessage = getLastMessage(messages);

	return {
		id: sessionLike.id ?? crypto.randomUUID(),
		title,
		messages,
		preview,
		created_at: createdAt,
		updated_at: updatedAt,
		message_count: sessionLike.message_count ?? messages.length,
		source_count: sessionLike.source_count ?? getSourceCount(messages),
		last_message_role: sessionLike.last_message_role ?? lastMessage?.role,
		model_name: normalizeText(sessionLike.model_name) || undefined,
	};
};

export const createEmptySession = (overrides: Partial<SessionItem> = {}) => {
	const now = new Date().toISOString();

	return hydrateSessionItem({
		id: overrides.id ?? crypto.randomUUID(),
		title: overrides.title ?? DEFAULT_SESSION_TITLE,
		messages: overrides.messages ?? [],
		preview: overrides.preview ?? '',
		created_at: overrides.created_at ?? now,
		updated_at: overrides.updated_at ?? now,
		message_count: overrides.message_count ?? 0,
		source_count: overrides.source_count ?? 0,
		last_message_role: overrides.last_message_role,
		model_name: overrides.model_name,
	});
};

export const touchSessionWithMessages = (
	session: SessionItem,
	messages: Message[],
	patch: Partial<SessionItem> = {},
) => {
	return hydrateSessionItem({
		...session,
		...patch,
		messages,
		updated_at: patch.updated_at ?? new Date().toISOString(),
	});
};

export const touchSession = (
	session: SessionItem,
	patch: Partial<SessionItem> = {},
) => {
	return hydrateSessionItem({
		...session,
		...patch,
		updated_at: patch.updated_at ?? new Date().toISOString(),
	});
};

export const sortSessionsByRecent = (sessions: SessionItem[]) => {
	return [...sessions].sort((left, right) => {
		return (
			new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
		);
	});
};
