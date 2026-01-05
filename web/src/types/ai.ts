export type Message = {
    chat_id: string;
    role: string;
    content: string;
    ai_state?: AIState;
};

export type SessionItem = {
    id: string
    title: string
    messages: Message[]
}

export type AIPhase =
    | "idle"
    | "thinking"
    | "writing"
    | "tool"
    | "done"
    | "error";

export interface AIState {
    phase: AIPhase;
    label?: string;
    error?: string;
}

export type AIEvent =
    | {
        chat_id: string;
        type: 'status';
        payload: {
            phase: AIPhase;
            label?: string;
        };
    }
    | {
        chat_id: string;
        type: 'output';
        payload: {
            kind: 'token' | 'message';
            content: string;
        };
    }
    | {
        chat_id: string;
        type: 'done';
    }
    | {
        chat_id: string;
        type: 'error';
        payload: {
            message: string;
        };
    };