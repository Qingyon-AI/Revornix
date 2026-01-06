export type Message = {
    chat_id: string;
    role: string;
    content: string;
    ai_state?: AIState;              // 当前态
    ai_workflow?: AIWorkflow;  // 历史态
    tool_results?: ToolResult[];
};

type ToolResult = {
    tool: string;
    content: string;
};

export type AIWorkflowStep = {
    phase: AIPhase;
    label: string;
    meta?: any;
};

export type AIWorkflow = AIWorkflowStep[];

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
    | "tool_result"
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
            detail?: any;
        };
    }
    | {
        chat_id: string;
        type: 'output';
        payload:
        | {
            kind: 'token';
            content: string;
        }
        | {
            kind: 'tool_result';
            tool: string;
            content: any;
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