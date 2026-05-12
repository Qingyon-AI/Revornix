import type { AIEvent } from '@/types/ai';

export const consumeAIEventStream = async (
	response: Response,
	onEvent: (event: AIEvent) => void,
	options?: {
		missingBodyMessage?: string;
		onInvalidChunk?: (raw: string, error: unknown) => void;
	},
) => {
	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error(options?.missingBodyMessage ?? 'Something is wrong');
	}

	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		const parts = buffer.split('\n\n');
		buffer = parts.pop() || '';

		for (let raw of parts) {
			if (!raw.trim()) {
				continue;
			}
			if (raw.startsWith('data:')) {
				raw = raw.slice(5).trim();
			}
			try {
				onEvent(JSON.parse(raw));
			} catch (error) {
				options?.onInvalidChunk?.(raw, error);
			}
		}
	}
};
