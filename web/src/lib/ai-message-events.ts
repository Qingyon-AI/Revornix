import type { AIEvent, AIPhase, AIWorkflow, Message } from '@/types/ai';
import { mergeChunkCitations, mergeDocumentSources } from '@/lib/ai-sources';

export type TranslateAIMessageKey = (key: string) => string;

export const pushAIWorkflowStep = (
	workflow: AIWorkflow | undefined,
	phase: AIPhase,
	label: string,
	meta?: any,
): AIWorkflow => {
	const steps = workflow ? [...workflow] : [];
	const last = steps[steps.length - 1];

	if (last && last.phase === phase && last.label === label) {
		return steps;
	}

	steps.push({
		phase,
		label,
		meta,
	});
	return steps;
};

export const updateAssistantMessage = (
	messages: Message[],
	chatId: string,
	updater: (message: Message) => Message,
): Message[] => {
	let found = false;
	const nextMessages = messages.map((message) => {
		if (message.chat_id !== chatId) {
			return message;
		}
		found = true;
		return updater(message);
	});

	if (found) {
		return nextMessages;
	}

	return [
		...nextMessages,
		updater({
			chat_id: chatId,
			role: 'assistant',
			content: '',
		}),
	];
};

const resolvePhaseLabel = (
	phaseLabelMap: Record<AIPhase, string>,
	phase: AIPhase,
	label?: string,
	labelPrefixes: string[] = [],
) => {
	if (
		typeof label === 'string' &&
		labelPrefixes.some((prefix) => label.startsWith(prefix))
	) {
		return label;
	}
	return phaseLabelMap[phase];
};

export const applyAIEventToMessages = ({
	messages,
	event,
	phaseLabelMap,
	phaseLabelPrefixes,
	translate,
}: {
	messages: Message[];
	event: AIEvent;
	phaseLabelMap: Record<AIPhase, string>;
	phaseLabelPrefixes?: string[];
	translate: TranslateAIMessageKey;
}) => {
	switch (event.type) {
		case 'status': {
			const label = resolvePhaseLabel(
				phaseLabelMap,
				event.payload.phase,
				event.payload.label,
				phaseLabelPrefixes,
			);
			return updateAssistantMessage(messages, event.chat_id, (message) => ({
				...message,
				role: 'assistant',
				ai_state: {
					phase: event.payload.phase,
					label,
				},
				ai_workflow: pushAIWorkflowStep(
					message.ai_workflow,
					event.payload.phase,
					label,
					event.payload.detail,
				),
			}));
		}
		case 'artifact': {
			const artifact = event.payload;

			if (artifact.kind === 'tool_result') {
				return updateAssistantMessage(messages, event.chat_id, (message) => ({
					...message,
					role: 'assistant',
					ai_workflow: pushAIWorkflowStep(
						message.ai_workflow,
						'tool_result',
						phaseLabelMap.tool_result,
						{ tool: artifact.tool },
					),
				}));
			}

			if (artifact.kind === 'document_sources') {
				return updateAssistantMessage(messages, event.chat_id, (message) => ({
					...message,
					role: 'assistant',
					document_sources: mergeDocumentSources(
						message.document_sources,
						artifact.items,
					),
				}));
			}

			if (artifact.kind === 'chunk_citations') {
				return updateAssistantMessage(messages, event.chat_id, (message) => ({
					...message,
					role: 'assistant',
					chunk_citations: mergeChunkCitations(
						message.chunk_citations,
						artifact.items,
					),
				}));
			}

			return messages;
		}
		case 'output': {
			const payload = event.payload;

			if (payload.kind === 'system_text') {
				const translatedMessage = translate(payload.message);
				return updateAssistantMessage(messages, event.chat_id, (message) => ({
					...message,
					role: 'assistant',
					content: `${message.content}${payload.paragraph_break ? '\n\n' : ''}${translatedMessage}`,
					ai_state: {
						phase: 'writing',
						label: phaseLabelMap.writing,
					},
					ai_workflow: pushAIWorkflowStep(
						message.ai_workflow,
						'writing',
						phaseLabelMap.writing,
					),
				}));
			}

			if (payload.kind === 'tool_result') {
				let nextMessages = messages;
				if (Array.isArray(payload.references) && payload.references.length > 0) {
					nextMessages = updateAssistantMessage(
						nextMessages,
						event.chat_id,
						(message) => ({
							...message,
							role: 'assistant',
							document_sources: mergeDocumentSources(
								message.document_sources,
								payload.references,
							),
						}),
					);
				}

				return updateAssistantMessage(nextMessages, event.chat_id, (message) => ({
					...message,
					role: 'assistant',
					ai_workflow: pushAIWorkflowStep(
						message.ai_workflow,
						'tool_result',
						phaseLabelMap.tool_result,
						{ tool: payload.tool },
					),
				}));
			}

			if (payload.kind === 'token') {
				return updateAssistantMessage(messages, event.chat_id, (message) => ({
					...message,
					role: 'assistant',
					content: message.content + payload.content,
					ai_state: {
						phase: 'writing',
						label: phaseLabelMap.writing,
					},
					ai_workflow: pushAIWorkflowStep(
						message.ai_workflow,
						'writing',
						phaseLabelMap.writing,
					),
				}));
			}

			return messages;
		}
		case 'done':
			return updateAssistantMessage(messages, event.chat_id, (message) => ({
				...message,
				role: 'assistant',
				ai_state: {
					phase: 'done',
					label: phaseLabelMap.done,
				},
				ai_workflow: pushAIWorkflowStep(
					message.ai_workflow,
					'done',
					phaseLabelMap.done,
				),
				chunk_citations:
					event.payload?.references && event.payload.references.length > 0
						? mergeChunkCitations(
								message.chunk_citations,
								event.payload.references,
							)
						: message.chunk_citations,
			}));
		case 'error':
			return updateAssistantMessage(messages, event.chat_id, (message) => ({
				...message,
				role: 'assistant',
				ai_state: {
					phase: 'error',
					label: event.payload.message || phaseLabelMap.error,
					error: event.payload.message,
				},
				ai_workflow: pushAIWorkflowStep(
					message.ai_workflow,
					'error',
					event.payload.message || phaseLabelMap.error,
					event.payload,
				),
			}));
		default:
			return messages;
	}
};
