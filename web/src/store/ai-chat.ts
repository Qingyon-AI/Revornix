import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { AIPhase, AIWorkflow, SessionItem } from '@/types/ai'

export type AIChatState = {
    currentSessionId: string | null;
    currentSession: () => SessionItem | null;
    sessions: SessionItem[];
    _hasHydrated: boolean;
};

export type AIChatAction = {
    setCurrentSessionId: (id: string | null) => void;
    addSession: (chat: SessionItem) => void;
    deleteSession: (id: string) => void;
    setHasHydrated: (status: boolean) => void;
    updateChatMessage: (
        chat_id: string,
        role: 'assistant' | 'user',
        token: string
    ) => void;
    advanceChatMessageWorkflow: (
        chat_id: string,
        step: AIPhase,
        meta?: any
    ) => void;
};

const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === 'undefined') return null // SSR 阶段返回 null
        return (await get(name)) || null
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === 'undefined') return // SSR 阶段跳过保存
        await set(name, value)
    },
    removeItem: async (name: string): Promise<void> => {
        if (typeof window === 'undefined') return
        await del(name)
    },
}

const phaseLabelMap: Record<AIPhase, (meta?: any) => string> = {
    idle: () => '空闲',
    thinking: () => '思考中…',
    writing: () => '生成回答中',
    tool: () => '调用工具',
    tool_result: () => '工具返回',
    done: () => '已完成',
    error: (meta) => meta?.message ?? '发生错误',
};

function pushWorkflowStep(
    workflow: AIWorkflow | undefined,
    phase: AIPhase,
    label: string,
    meta?: any
): AIWorkflow {
    const steps = workflow ? [...workflow] : [];

    const last = steps[steps.length - 1];

    // ✅ 只有在 phase + label 都相同时才认为是重复
    if (last && last.phase === phase && last.label === label) {
        return steps;
    }

    steps.push({
        phase,
        label,
        meta,
    });

    return steps;
}

export const useAiChatStore = create<AIChatState & AIChatAction>()(
    persist(
        (set, get) => {
            return ({
                _hasHydrated: false,
                currentSessionId: null,
                sessions: [],
                currentSession: () => {
                    const currentSessionId = get().currentSessionId;
                    if (!currentSessionId) return null;
                    return get().sessions.find((session) => session.id === currentSessionId) || null;
                },
                setCurrentSessionId: (id) => set({ currentSessionId: id }),
                updateChatMessage: (chat_id: string, role: string, token: string) => {
                    return set((state) => {
                        const sessions = state.sessions.map(session => {
                            if (session.id !== state.currentSessionId) return session;

                            const messages = [...session.messages];

                            const idx = messages.findIndex(m => m.chat_id === chat_id);

                            if (idx === -1) {
                                messages.push({
                                    chat_id: chat_id,
                                    role: role,
                                    content: token,
                                });
                            } else {
                                messages[idx] = {
                                    ...messages[idx],
                                    content: messages[idx].content + token,
                                };
                            }

                            return { ...session, messages };
                        });

                        return { sessions }; // ✅ 必须 return
                    })
                },
                advanceChatMessageWorkflow: (chat_id, phase, meta) => {
                    set((state) => {
                        const sessions = state.sessions.map((session) => {
                            if (session.id !== state.currentSessionId) return session;

                            const messages = [...session.messages];
                            const idx = messages.findIndex((m) => m.chat_id === chat_id);

                            const label = phaseLabelMap[phase]?.(meta);

                            if (idx === -1) {
                                messages.push({
                                    chat_id,
                                    role: 'assistant',
                                    content: '',
                                    ai_state: {
                                        phase,
                                        label,
                                    },
                                    ai_workflow: pushWorkflowStep(undefined, phase, label, meta),
                                });
                            } else {
                                const msg = messages[idx];

                                messages[idx] = {
                                    ...msg,
                                    ai_state: {
                                        phase,
                                        label,
                                    },
                                    ai_workflow: pushWorkflowStep(
                                        msg.ai_workflow,
                                        phase,
                                        label,
                                        meta
                                    ),
                                };
                            }

                            return { ...session, messages };
                        });

                        return { sessions };
                    });
                },
                addSession: (session: SessionItem) => set((state) => ({ sessions: [...state.sessions, session] })),
                deleteSession: (id: string) => set((state) => ({ sessions: state.sessions.filter((item) => item.id !== id) })),
                setHasHydrated: (status) => {
                    return set({
                        _hasHydrated: status
                    });
                },
            })
        },
        {
            name: 'revornix-ai-chat', // unique name
            storage: createJSONStorage(() => storage),
            onRehydrateStorage: (state) => {
                // optional
                return (state, error) => {
                    state && state.setHasHydrated(true)
                    if (error) {
                        console.error('onRehydrateStorage error: ', error)
                    }
                }
            },
        },
    ),
)
