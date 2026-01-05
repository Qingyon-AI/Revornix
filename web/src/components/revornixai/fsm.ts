import { AIEvent, AIState } from "@/types/ai";

export const initialAIState: AIState = {
    phase: 'idle',
};

export function aiReducer(
    state: AIState,
    event: AIEvent
): AIState {
    switch (event.type) {
        case "status": {
            const next = event.payload.phase;

            return {
                ...state,
                phase: next,
                statusLabel: event.payload.label
            };
        }

        case "output": {
            return state; // 👈 reducer 不碰 message
        }

        case "done":
            return { ...state, phase: "done" };

        case "error":
            return {
                ...state,
                phase: "error",
                error: event.payload.message,
            };

        default:
            return state;
    }
}