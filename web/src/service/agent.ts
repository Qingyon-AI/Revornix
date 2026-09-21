import agentApi from '@/api/agent';
import { request } from '@/lib/request';
import type {
	AgentMessage,
	AgentReference,
	AgentSession,
	ToolConfirmation,
} from '@/types/agent';

export const createAgentSession = async (data: {
	title?: string;
	model_id?: number | null;
	document_id?: number | null;
	section_id?: number | null;
	enable_mcp?: boolean;
}): Promise<AgentSession> => {
	return await request(agentApi.createSession, { data });
};

export const searchAgentSessions = async (data: {
	keyword?: string;
	start?: number;
	limit?: number;
}): Promise<AgentSession[]> => {
	return await request(agentApi.searchSession, { data });
};

export const getAgentSession = async (
	session_id: number,
): Promise<AgentSession> => {
	return await request(agentApi.sessionDetail, { data: { session_id } });
};

export const updateAgentSession = async (
	session_id: number,
	data: {
		title?: string;
		model_id?: number | null;
		thinking_level?: string;
		permission_mode?: string;
		auto_allow_tools?: string[];
		enable_mcp?: boolean;
	},
): Promise<AgentSession> => {
	return await request(
		`${agentApi.updateSession}?session_id=${session_id}`,
		{ data },
	);
};

export const deleteAgentSession = async (session_id: number) => {
	return await request(agentApi.deleteSession, { data: { session_id } });
};

export const getAgentMessages = async (
	session_id: number,
): Promise<AgentMessage[]> => {
	return await request(agentApi.sessionMessages, { data: { session_id } });
};

export const postAgentMessage = async (
	session_id: number,
	data: {
		content: string;
		images?: string[];
		/** `@` 出来的对象。正文里只有标题,id 走这里 —— 见 app/schemas/agent.py 的说明。 */
		references?: AgentReference[];
	},
): Promise<AgentMessage> => {
	return await request(`${agentApi.postMessage}?session_id=${session_id}`, {
		data,
	});
};

export const getAgentQueue = async (
	session_id: number,
): Promise<AgentMessage[]> => {
	return await request(agentApi.sessionQueue, { data: { session_id } });
};

export const steerQueuedMessage = async (
	session_id: number,
	message_id: number,
): Promise<{ steered: boolean }> => {
	return await request(
		`${agentApi.steerQueued}?session_id=${session_id}&message_id=${message_id}`,
		{},
	);
};

export const cancelQueuedMessage = async (
	session_id: number,
	message_id: number,
): Promise<{ remaining: number }> => {
	return await request(
		`${agentApi.cancelQueued}?session_id=${session_id}&message_id=${message_id}`,
		{},
	);
};

export const stopAgentTurn = async (
	session_id: number,
): Promise<{ stopped: boolean }> => {
	return await request(agentApi.stopTurn, { data: { session_id } });
};

export const compactAgentSession = async (
	session_id: number,
): Promise<{
	context?: { tokens: number; window: number } | null;
	compaction?: unknown;
}> => {
	return await request(agentApi.compactSession, { data: { session_id } });
};

export const listAgentConfirmations = async (data: {
	session_id?: number;
	status?: string;
}): Promise<ToolConfirmation[]> => {
	return await request(agentApi.listConfirmations, { data });
};

export const approveAgentConfirmation = async (
	id: number,
): Promise<ToolConfirmation> => {
	return await request(agentApi.approveConfirmation(id), {});
};

export const rejectAgentConfirmation = async (
	id: number,
): Promise<ToolConfirmation> => {
	return await request(agentApi.rejectConfirmation(id), {});
};
