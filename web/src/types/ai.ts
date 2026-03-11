export type Message = {
    chat_id: string;
    role: string;
    content: string;
    ai_state?: AIState;              // 当前态
    ai_workflow?: AIWorkflow;  // 历史态
    tool_results?: ToolResult[];
    references?: SectionAskReference[];
    document_references?: AIDocumentReference[];
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

export type SectionAskReference = {
    document_id: number;
    document_title: string;
    chunk_id: string;
    excerpt: string;
    score?: number | null;
};

export type AIDocumentReference = {
    document_id: number;
    document_title: string;
    description?: string | null;
    section_titles?: string[];
    source_tool?: string;
};

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
            references?: AIDocumentReference[];
        };
    }
    | {
        chat_id: string;
        type: 'done';
        payload?: {
            success?: boolean;
            references?: SectionAskReference[];
            usage?: Record<string, number> | null;
        };
    }
    | {
        chat_id: string;
        type: 'error';
        payload: {
            message: string;
        };
    };
