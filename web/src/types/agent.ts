/**
 * Revornix AI(智能体)的前端类型。与 api/router/agent.py + agent/host.py 的形状一一对应。
 */

export type AgentSession = {
	id: number;
	uuid: string;
	title: string;
	status: 'idle' | 'running';
	adapter: string;
	model_id: number | null;
	document_id: number | null;
	section_id: number | null;
	enable_mcp: boolean;
	thinking_level: 'off' | 'low' | 'medium' | 'high';
	permission_mode: 'manual' | 'auto' | 'bypass';
	auto_allow_tools: string[];
	context?: { tokens: number; window: number } | null;
	create_time: string;
	update_time?: string | null;
};

/** 时间线条目:一轮回答里发生的事,按真实顺序。 */
export type AgentTimelineItem =
	| { type: 'text'; text: string }
	| { type: 'thinking'; text: string; done?: boolean }
	| { type: 'tool'; tool: AgentToolCall }
	| { type: 'subtool'; parent_id: string; tool: AgentToolCall };

export type AgentToolCall = {
	id: string;
	name?: string;
	args?: unknown;
	status: 'running' | 'done' | 'error';
	result?: unknown;
	usage?: {
		started_at?: string;
		finished_at?: string;
		duration_seconds?: number;
	};
};

export type AgentCitation = {
	document_id: number;
	document_title: string;
	chunk_id: string;
	excerpt: string;
	score?: number | null;
};

export type AgentMessagePayload = {
	usage?: {
		duration_seconds?: number;
		first_token_seconds?: number;
		metering?: Record<string, unknown>;
	};
	context?: { tokens: number; window: number };
	compaction?: {
		droppedMessages: number;
		tokensBefore: number;
		tokensAfter: number;
		summary: string;
	};
	citations?: AgentCitation[];
	timeline?: AgentTimelineItem[];
	queued?: boolean;
	images?: string[];
};

export type AgentMessage = {
	id: number;
	session_id: number;
	role: 'user' | 'assistant' | 'system';
	content: string;
	payload?: AgentMessagePayload | null;
	error?: string | null;
	create_time: string;
};

export type ToolConfirmation = {
	id: number;
	session_id: number | null;
	tool: string;
	permission: 'edit' | 'ai-cost' | 'destructive';
	summary: string;
	payload: Record<string, unknown>;
	status: 'pending' | 'approved' | 'executed' | 'rejected' | 'failed' | 'cancelled';
	result?: unknown;
	error?: string | null;
	requested_by: string;
	decided_by?: number | null;
	create_time: string;
	resolved_at?: string | null;
};

/** SSE 流帧(快照式):GET /agent/session/{id}/stream */
export type AgentStreamFrame = {
	text: string;
	done: boolean;
	timeline: AgentTimelineItem[];
};
