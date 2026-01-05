export type Message = {
    content: string;
    role: string;
    chat_id: string;
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
    statusLabel?: string;
    error?: string;
}

export interface StatusEvent {
    type: "status";
    payload: {
        phase: AIPhase;
        label?: string;
    };
};

export interface AIEventBase {
    type: 'status' | 'output' | 'done' | 'error';
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