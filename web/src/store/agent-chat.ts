/**
 * Revornix AI 的会话状态。会话与消息的真相在服务端(agent_session / agent_message 表),
 * 这里只是当前界面的视图缓存 + 正在跑的那轮的流式快照 —— 所以**不持久化**:
 * 换设备能看到同样的对话,正是服务端会话的意义。
 */
import { create } from 'zustand';
import Cookies from 'js-cookie';
import agentApi from '@/api/agent';
import {
	approveAgentConfirmation,
	cancelQueuedMessage,
	compactAgentSession,
	createAgentSession,
	deleteAgentSession,
	getAgentMessages,
	getAgentQueue,
	getAgentSession,
	listAgentConfirmations,
	postAgentMessage,
	rejectAgentConfirmation,
	searchAgentSessions,
	steerQueuedMessage,
	stopAgentTurn,
	updateAgentSession,
} from '@/service/agent';
import type {
	AgentMessage,
	AgentSession,
	AgentStreamFrame,
	AgentTimelineItem,
	ToolConfirmation,
} from '@/types/agent';

export type AgentStreamState = {
	text: string;
	timeline: AgentTimelineItem[];
	done: boolean;
};

export type AgentChatState = {
	sessions: AgentSession[];
	currentSessionId: number | null;
	currentSession: AgentSession | null;
	messages: AgentMessage[];
	queue: AgentMessage[];
	confirmations: ToolConfirmation[];
	stream: AgentStreamState | null;
	sessionsLoading: boolean;
	messagesLoading: boolean;
	sending: boolean;
};

export type AgentChatAction = {
	loadSessions: (keyword?: string) => Promise<void>;
	selectSession: (id: number | null) => Promise<void>;
	newSession: (options?: {
		document_id?: number;
		section_id?: number;
	}) => Promise<AgentSession>;
	/** 找到(或建)绑定到这篇文档/这个专栏的会话并选中它。 */
	ensureBoundSession: (binding: {
		document_id?: number;
		section_id?: number;
	}) => Promise<AgentSession>;
	removeSession: (id: number) => Promise<void>;
	renameSession: (id: number, title: string) => Promise<void>;
	patchSession: (
		id: number,
		patch: Parameters<typeof updateAgentSession>[1],
	) => Promise<void>;
	sendMessage: (content: string, images?: string[]) => Promise<void>;
	stop: () => Promise<void>;
	steer: (messageId: number) => Promise<void>;
	cancelQueued: (messageId: number) => Promise<void>;
	refreshConfirmations: () => Promise<void>;
	approve: (id: number, alwaysAllow: boolean) => Promise<void>;
	reject: (id: number) => Promise<void>;
	compact: () => Promise<void>;
};

/** 进行中的 SSE 连接,按会话 id。重复 attach 直接复用。 */
const liveStreams = new Map<number, AbortController>();

async function attachStream(
	sessionId: number,
	onFrame: (frame: AgentStreamFrame) => void,
	onDone: () => void,
) {
	liveStreams.get(sessionId)?.abort();
	const controller = new AbortController();
	liveStreams.set(sessionId, controller);
	try {
		const headers: Record<string, string> = { Accept: 'text/event-stream' };
		const token = Cookies.get('access_token');
		if (token) headers['Authorization'] = `Bearer ${token}`;
		const response = await fetch(agentApi.streamTurn(sessionId), {
			headers,
			signal: controller.signal,
		});
		if (!response.ok || !response.body) return;
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			for (;;) {
				const sep = buffer.indexOf('\n\n');
				if (sep < 0) break;
				const raw = buffer.slice(0, sep);
				buffer = buffer.slice(sep + 2);
				const line = raw.replace(/^data:\s*/, '');
				if (!line) continue;
				try {
					onFrame(JSON.parse(line) as AgentStreamFrame);
				} catch {
					// 坏帧跳过,流继续
				}
			}
		}
	} catch {
		// abort / 断网都由调用方的下一轮轮询兜底
	} finally {
		if (liveStreams.get(sessionId) === controller) liveStreams.delete(sessionId);
		onDone();
	}
}

export const useAgentChatStore = create<AgentChatState & AgentChatAction>()(
	(set, get) => ({
		sessions: [],
		currentSessionId: null,
		currentSession: null,
		messages: [],
		queue: [],
		confirmations: [],
		stream: null,
		sessionsLoading: false,
		messagesLoading: false,
		sending: false,

		loadSessions: async (keyword) => {
			set({ sessionsLoading: true });
			try {
				const sessions = await searchAgentSessions({ keyword, limit: 50 });
				set({ sessions });
			} finally {
				set({ sessionsLoading: false });
			}
		},

		selectSession: async (id) => {
			set({
				currentSessionId: id,
				currentSession: null,
				messages: [],
				queue: [],
				confirmations: [],
				stream: null,
			});
			if (id === null) return;
			set({ messagesLoading: true });
			try {
				const [session, messages, queue, confirmations] = await Promise.all([
					getAgentSession(id),
					getAgentMessages(id),
					getAgentQueue(id),
					listAgentConfirmations({ session_id: id, status: 'pending' }),
				]);
				set({ currentSession: session, messages, queue, confirmations });
				// 会话还在跑(比如刷新页面后回来):把流接回去。
				if (session.status === 'running') {
					void attachStream(
						id,
						(frame) => set({ stream: frame }),
						() => void get().selectSession(id),
					);
				}
			} finally {
				set({ messagesLoading: false });
			}
		},

	newSession: async (options) => {
		const session = await createAgentSession(options ?? {});
		set((state) => ({ sessions: [session, ...state.sessions] }));
		await get().selectSession(session.id);
		return session;
	},

	ensureBoundSession: async (binding) => {
		// 同一篇文档/专栏的问答落进同一个会话:换一天打开,上次聊到哪儿还在。
		await get().loadSessions();
		const existing = get().sessions.find((s) =>
			binding.document_id !== undefined
				? s.document_id === binding.document_id
				: s.section_id === binding.section_id,
		);
		if (existing) {
			await get().selectSession(existing.id);
			return existing;
		}
		return await get().newSession(binding);
	},

		removeSession: async (id) => {
			await deleteAgentSession(id);
			set((state) => ({
				sessions: state.sessions.filter((s) => s.id !== id),
				...(state.currentSessionId === id
					? {
							currentSessionId: null,
							currentSession: null,
							messages: [],
							queue: [],
							confirmations: [],
							stream: null,
						}
					: {}),
			}));
		},

		renameSession: async (id, title) => {
			const session = await updateAgentSession(id, { title });
			set((state) => ({
				sessions: state.sessions.map((s) => (s.id === id ? session : s)),
				currentSession:
					state.currentSessionId === id ? session : state.currentSession,
			}));
		},

		patchSession: async (id, patch) => {
			const session = await updateAgentSession(id, patch);
			set((state) => ({
				sessions: state.sessions.map((s) => (s.id === id ? session : s)),
				currentSession:
					state.currentSessionId === id ? session : state.currentSession,
			}));
		},

		sendMessage: async (content, images) => {
			const sessionId = get().currentSessionId;
			if (sessionId === null) return;
			set({ sending: true });
			try {
				const message = await postAgentMessage(sessionId, { content, images });
				// 乐观地把这条消息放进列表;排队中的消息由 queue 接口给出。
				set((state) => ({ messages: [...state.messages, message] }));
				const queue = await getAgentQueue(sessionId);
				set({ queue });
				// 接流。done 之后整体重取一次:正式气泡(带 timeline/usage/citations)
				// 与流式气泡同帧切换。
				void attachStream(
					sessionId,
					(frame) => set({ stream: frame }),
					async () => {
						const [session, messages, queue] = await Promise.all([
							getAgentSession(sessionId),
							getAgentMessages(sessionId),
							getAgentQueue(sessionId),
						]);
						set((state) => ({
							stream: null,
							currentSession: session,
							messages,
							queue,
							sessions: state.sessions.map((s) =>
								s.id === sessionId ? session : s,
							),
						}));
						void get().refreshConfirmations();
					},
				);
			} finally {
				set({ sending: false });
			}
		},

		stop: async () => {
			const sessionId = get().currentSessionId;
			if (sessionId === null) return;
			await stopAgentTurn(sessionId);
		},

		steer: async (messageId) => {
			const sessionId = get().currentSessionId;
			if (sessionId === null) return;
			await steerQueuedMessage(sessionId, messageId);
			const queue = await getAgentQueue(sessionId);
			set({ queue });
		},

		cancelQueued: async (messageId) => {
			const sessionId = get().currentSessionId;
			if (sessionId === null) return;
			await cancelQueuedMessage(sessionId, messageId);
			const queue = await getAgentQueue(sessionId);
			set({ queue });
		},

		refreshConfirmations: async () => {
			const sessionId = get().currentSessionId;
			if (sessionId === null) return;
			const confirmations = await listAgentConfirmations({
				session_id: sessionId,
				status: 'pending',
			});
			set({ confirmations });
		},

		approve: async (id, alwaysAllow) => {
			const card = get().confirmations.find((c) => c.id === id);
			const sessionId = get().currentSessionId;
			if (alwaysAllow && card && sessionId !== null) {
				const session = get().currentSession;
				const allowed = new Set(session?.auto_allow_tools ?? []);
				allowed.add(card.tool);
				await get().patchSession(sessionId, {
					auto_allow_tools: [...allowed],
				});
			}
			await approveAgentConfirmation(id);
			await get().refreshConfirmations();
		},

		reject: async (id) => {
			await rejectAgentConfirmation(id);
			await get().refreshConfirmations();
		},

		compact: async () => {
			const sessionId = get().currentSessionId;
			if (sessionId === null) return;
			const result = await compactAgentSession(sessionId);
			set((state) => ({
				currentSession: state.currentSession
					? { ...state.currentSession, context: result.context ?? null }
					: state.currentSession,
			}));
			// 压缩在对话里留了一条 system 消息,重取消息让标记出现。
			const messages = await getAgentMessages(sessionId);
			set({ messages });
		},
	}),
);
