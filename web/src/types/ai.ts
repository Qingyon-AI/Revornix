export type Message = {
    chat_id: string;
    role: string;
    content: string;
    ai_state?: AIState;              // 当前态
    ai_workflow?: AIWorkflow;  // 历史态
    tool_results?: ToolResult[];
    chunk_citations?: AIChunkCitation[];
    document_sources?: AIDocumentSource[];
    references?: AIChunkCitation[];
    document_references?: AIDocumentSource[];
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
    preview: string
    created_at: string
    updated_at: string
    message_count: number
    source_count: number
    last_message_role?: string
    model_name?: string
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

export type AIChunkCitation = {
    document_id: number;
    document_title: string;
    chunk_id: string;
    excerpt: string;
    score?: number | null;
};

export type AIDocumentSource = {
    document_id: number;
    document_title: string;
    description?: string | null;
    section_titles?: string[];
    source_tool?: string;
};

export type AIArtifact =
    | {
        kind: 'tool_result';
        tool: string;
        content: any;
    }
    | {
        kind: 'document_sources';
        items: AIDocumentSource[];
    }
    | {
        kind: 'chunk_citations';
        items: AIChunkCitation[];
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
            references?: AIDocumentSource[];
        };
    }
    | {
        chat_id: string;
        type: 'artifact';
        payload: AIArtifact;
    }
    | {
        chat_id: string;
        type: 'done';
        payload?: {
            success?: boolean;
            section_id?: number;
            section_title?: string;
            references?: AIChunkCitation[];
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
