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

/**
 * `@` 引用得到的东西:知识库里一个具体对象,不是一段字。
 *
 * 类型放在这里而不是组件旁边,是因为它同时出现在**三条路**上:输入框的文档、发出去的
 * 请求体、落库后的消息 payload。搜索与图标那套东西留在 components/revornixai/references.ts。
 */
export type ReferenceKind = 'document' | 'section';

export type AgentReference = {
	kind: ReferenceKind;
	id: number;
	/** 写进正文的那个标题。存下来是为了旧消息也能渲染。 */
	name: string;
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
	/** 用户在输入框里 `@` 出来的对象。**随消息存下来**,所以旧气泡也画得出胶囊 ——
	 *  被引用的东西改了名或删了,至少还说得出当时指的是什么。 */
	references?: AgentReference[];
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
